import fs from 'node:fs/promises';
import Handlebars from 'handlebars';
import { minify } from 'html-minifier';
import { marked } from 'marked';

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

Handlebars.registerHelper('date', (body) => {
  if (!body) {
    return 'Present'
  }

  const date = new Date(body);

  const datetime = date.toISOString();
  const localeString = date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  });

  return `<time datetime="${datetime}">${localeString}</time>`;
});

Handlebars.registerHelper('markdown', (body) => {
  return marked.parse(body);
});

Handlebars.registerHelper('link', (body) => {
  const parsed = new URL(body);
  const host = (parsed.host.startsWith('www.')) ? parsed.host.substring(4) : parsed.host;
  return `<a href="${body}">${host}</a>`;
});

/**
 * @param {any} resume
 * @returns {Promise<string>}
 */
export async function render(resume) {
  const loading = Promise.all([
    fs.readFile(import.meta.dirname + '/style.css', 'utf-8'),
    fs.readFile(import.meta.dirname + '/resume.handlebars', 'utf-8'),
  ]);

  const { profiles } = resume.basics;

  if (Array.isArray(profiles)) {
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

  const [ css, template ] = await loading;
  const html = Handlebars.compile(template)({
    css,
    resume
  });

  return minify(html, minifyOptions);
}
