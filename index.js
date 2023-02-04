const fs = require("fs");
const Handlebars = require("handlebars");
const { marked } = require("marked");

/**
 * The properties in the JSON Resume which should be processed with marked.
 *
 * @type {string[]}
 */
const markdownProperties = [
  "work.summary",
  "work.highlights",
  "volunteer.summary",
  "volunteer.highlights",
  "publications.summary"
]

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

/**
 * @param {string} body The string to parse.
 * @returns {string} Input parsed to HTML.
 */
function parseMarkdown(body) {
  return marked.parse(body);
}

/**
 * Recursively perform a callback on all string properties of an object in the
 * list of JSON paths.
 *
 * @param {object} object Object to traverse.
 * @param {string[]} jsonpaths Limit which JSON paths to execute the callback for.
 * @param {function} callback
 * @param {string|undefined} currentKey The current object key that's being processed.
 */
function traverseString(object, jsonpaths, callback, currentKey) {
  const type = typeof object;

  if (type === 'string') {
    if (jsonpaths.includes(currentKey))
      return callback(object);
  }

  if (Array.isArray(object)) {
    object = object.map((item) => traverseString(item, jsonpaths, callback, currentKey));
  }

  else if (type === 'object') {
    for (const key in object) {
      const nextKey = (currentKey) ? `${currentKey}.${key}` : key;
      object[key] = traverseString(object[key], jsonpaths, callback, nextKey);
    }
  }

  return object
}

function render(resume) {
  const css = fs.readFileSync(__dirname + "/style.css", "utf-8");
  const template = fs.readFileSync(__dirname + "/resume.handlebars", "utf-8");

  const markedResume = traverseString(resume, markdownProperties, parseMarkdown);
  const { profiles } = markedResume.basics;

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

      markedResume.custom = {
        twitterHandle: username
      }
    }
  }

  return Handlebars.compile(template)({
    css: css,
    resume: markedResume
  });
}

marked.use({ renderer });

module.exports = {
  render: render
};
