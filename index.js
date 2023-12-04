const fs = require("fs");
const Handlebars = require("handlebars");
const { marked } = require("marked");
const { minify } = require('html-minifier');

/**
 * Custom renderer for marked, namely to disable unwanted features.
 * We only want to allow basic inline elements, like links, bold, or inline-code.
 *
 * @type {object}
 */
const renderer = {
  heading(text) {
    return text;
  },
  html(html) {
    return html;
  },
  hr() {
    return '';
  },
  list(body) {
    return body;
  },
  listitem(text) {
    return text;
  },
  br() {
    return '';
  },
  paragraph(text) {
    return text;
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

Handlebars.registerHelper("date", (body) => {
  if (!body) {
    return "Present"
  }

  const date = new Date(body);

  const datetime = date.toISOString();
  const localeString = date.toLocaleDateString('en-US', {
    month: "short",
    year: "numeric"
  });

  return `<time datetime="${datetime}">${localeString}</time>`;
});

Handlebars.registerHelper("markdown", (body) => {
  return marked.parse(body);
});

Handlebars.registerHelper("link", (body) => {
  const parsed = new URL(body);
  const host = (parsed.host.startsWith('www.')) ? parsed.host.substring(4) : parsed.host;
  return `<a href="${body}">${host}</a>`;
});

/**
 * @param {Object} resume
 * @returns {string}
 */
function render(resume) {
  const css = fs.readFileSync(__dirname + "/style.css", "utf-8");
  const template = fs.readFileSync(__dirname + "/resume.handlebars", "utf-8");
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

  const html = Handlebars.compile(template)({
    css,
    resume
  });

  return minify(html, minifyOptions);
}

module.exports = {
  render
};
