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
 * Recursively perform a callback on all string properties of an object.
 * Uses {@link markdownProperties} to limit which properties of the object are processed.
 *
 * @param {object} object Object to traverse.
 * @param {function} callback
 * @param {string|undefined} currentKey The current object key that's being processed.
 */
function traverseString(object, callback, currentKey) {
	const type = typeof object;

	if (type === 'string') {
		if (markdownProperties.includes(currentKey))
			return callback(object);
	}

	if (Array.isArray(object)) {
		object = object.map((item) => traverseString(item, callback, currentKey));
	}

	else if (type === 'object') {
		for (const key in object) {
			const nextKey = (currentKey) ? `${currentKey}.${key}` : key;
			object[key] = traverseString(object[key], callback, nextKey);
		}
	}

	return object
}

function render(resume) {
	const css = fs.readFileSync(__dirname + "/style.css", "utf-8");
	const template = fs.readFileSync(__dirname + "/resume.handlebars", "utf-8");

	const markedResume = traverseString(resume, parseMarkdown);

	return Handlebars.compile(template)({
		css: css,
		resume: markedResume
	});
}

marked.use({ renderer });

module.exports = {
	render: render
};
