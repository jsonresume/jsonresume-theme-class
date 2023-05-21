const fs = require("fs");
const Handlebars = require("handlebars");
const { marked } = require("marked");

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

function render(resume) {
  const css = fs.readFileSync(__dirname + "/style.css", "utf-8");
  const template = fs.readFileSync(__dirname + "/resume.handlebars", "utf-8");
  const { profiles } = resume.basics;

  if (Array.isArray(profiles)) {
    const twitter = profiles.find((profile) => {
      return profile.network.toLowerCase().includes('twitter');
    });

    if (twitter) {
      let { username, url } = twitter;

      if (!username && url) {
        const match = url.match(/https?:\/\/.+?\/([\w]{1,15})/);

        if (match.length == 2) {
          username = match[1];
        }
      }

      if (username && !username.startsWith('@')) {
        username = `@${username}`;
      }

      resume.custom = {
        twitterHandle: username
      }
    }
  }

  return Handlebars.compile(template)({
    css: css,
    resume
  });
}

module.exports = {
  render: render
};
