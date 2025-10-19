import fs from 'node:fs/promises';
import Handlebars from 'handlebars';
import { minify } from 'html-minifier';
import { marked } from 'marked';

const DATE_LOCALE = 'en-US';
/** @type {Intl.DateTimeFormatOptions} */
const LONG_DATE_FORMAT = { month: 'short', year: 'numeric' };
/** @type {Intl.DateTimeFormatOptions} */
const SHORT_DATE_FORMAT = { year: 'numeric' };

/**
 * Custom renderer for marked, namely to disable unwanted features. We only want
 * to allow basic inline elements, like links, bold, or inline-code.
 *
 * @type {import('marked').RendererObject}
 */
const renderer = {
  heading(heading) {
    return heading.text;
  },
  html(html) {
    return html.text;
  },
  hr() {
    return '';
  },
  list(list) {
    return list.raw;
  },
  listitem(text) {
    return text.text;
  },
  br() {
    return '';
  },
  paragraph(text) {
    return text.text;
  }
}

marked.use({ renderer });

/**
 * Plugins to enable to minify HTML after generating from the template.
 */
const minifyOptions = {
  collapseBooleanAttributes: true,
  collapseWhitespace: true,
  decodeEntities: true,
  minifyCSS: true,
  removeComments: true,
  removeRedundantAttributes: true,
  sortAttributes: true,
  sortClassName: true,
};

Handlebars.registerHelper('date', /** @param {string} body */ (body) => {
  if (!body) {
    return 'Present'
  }

  const date = new Date(body);
  const datetime = date.toISOString();
  const localeString = body.split('-').length !== 1
    ? date.toLocaleDateString(DATE_LOCALE, LONG_DATE_FORMAT)
    : date.toLocaleDateString(DATE_LOCALE, SHORT_DATE_FORMAT);

  return `<time datetime="${datetime}">${localeString}</time>`;
});

Handlebars.registerHelper('markdown', /** @param {string} body */ (body) => {
  return marked.parse(body);
});

Handlebars.registerHelper('link', /** @param {string} body */ (body) => {
  const parsed = new URL(body);
  const host = (parsed.host.startsWith('www.')) ? parsed.host.substring(4) : parsed.host;
  return `<a href="${body}">${host}</a>`;
});

/**
 * Many users still have JSON Resumes written against old versions of the
 * schema. We detect this and upgrade them to the latest version behind the
 * scenes.
 *
 * Writes to the object directly.
 *
 * @param {any} resume
 * @returns {boolean}
 *   If the JSON Resume was modified. (i.e. was using outdated property names)
 *
 * @see https://github.com/jsonresume/resume-schema/releases/tag/v0.0.17
 * @see https://github.com/jsonresume/resume-schema/releases/tag/v0.0.12
 */
function upgradeOutdatedResume(resume) {
  let upgraded = false;

  if (resume.bio && !resume.basics) {
    resume.basics = resume.bio;
    upgraded = true;
  }

  if ((resume.basics?.firstName || resume.basics?.lastName) && !resume.basics.name) {
    const names = [];

    if (resume.basics.firstName) {
      names.push(resume.basics.firstName);
    }

    if (resume.basics.lastName) {
      names.push(resume.basics.lastName);
    }

    resume.basics.name = names.join(' ');
    upgraded = true;
  }

  if (resume.basics?.picture && !resume.basics.image) {
    resume.basics.image = resume.basics.picture;
    upgraded = true;
  }

  if (resume.basics?.website && !resume.basics.url) {
    resume.basics.url = resume.basics.website;
    upgraded = true;
  }

  if (resume.basics?.state && !resume.basics?.region) {
    resume.basics.region = resume.basics.state;
    upgraded = true;
  }

  if (Array.isArray(resume.work)) {
    for (const work of resume.work) {
      if (work?.company && !work.name) {
        work.name = work.company;
        upgraded = true;
      }

      if (work?.website && !work.url) {
        work.url = work.website;
        upgraded = true;
      }
    }
  }

  if (Array.isArray(resume.volunteer)) {
    for (const volunteer of resume.volunteer) {
      if (volunteer?.website && !volunteer.url) {
        volunteer.url = volunteer.website;
        upgraded = true;
      }
    }
  }

  if (Array.isArray(resume.publications)) {
    for (const publication of resume.publications) {
      if (publication?.website && !publication.url) {
        publication.url = publication.website;
        upgraded = true;
      }
    }
  }

  if (resume.hobbies && !resume.interests) {
    resume.interests = resume.hobbies;
    upgraded = true;
  }

  if (Array.isArray(resume.languages)) {
    for (const language of resume.languages) {
      if (language?.name && !language.language) {
        language.language = language.name;
        upgraded = true;
      }

      if (language?.level && !language.fluency) {
        language.fluency = language.level;
        upgraded = true;
      }
    }
  }

  return upgraded;
}

/**
 * @param {any} resume
 * @returns {Promise<string>}
 */
export async function render(resume) {
  const loading = Promise.all([
    fs.readFile(import.meta.dirname + '/style.css', 'utf-8'),
    fs.readFile(import.meta.dirname + '/resume.handlebars', 'utf-8'),
  ]);

  if (upgradeOutdatedResume(resume)) {
    console.warn('⚠️  Resume is written against an outdated version of the JSON Resume schema.\n⚠️  This will still work, but you should consider updating your resume.\n⚠️  See: https://jsonresume.org/schema');
  }

  if (Array.isArray(resume.basics?.profiles)) {
    const { profiles } = resume.basics;
    const xTwitter = profiles.find((profile) => {
      const name = profile.network.toLowerCase();
      return name === 'x' || name === 'twitter';
    });

    if (xTwitter) {
      let { username, url } = xTwitter;

      if (!username && url) {
        const match = url.match(/https?:\/\/.+?\/(\w{1,15})/);

        if (match.length == 2) {
          username = match[1];
        }
      }

      if (username && !username.startsWith('@')) {
        username = `@${username}`;
      }

      resume.custom = {
        xTwitterHandle: username
      }
    }
  }

  const [css, template] = await loading;
  const html = Handlebars.compile(template)({
    css,
    resume
  });

  return minify(html, minifyOptions);
}
