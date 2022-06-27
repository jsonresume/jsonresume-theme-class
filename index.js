const fs = require("fs");
const Handlebars = require("handlebars");

function render(resume) {
	const css = fs.readFileSync(__dirname + "/style.css", "utf-8");
	const template = fs.readFileSync(__dirname + "/resume.handlebars", "utf-8");

	return Handlebars.compile(template)({
		css: css,
		resume: resume
	});
}

module.exports = {
	render: render
};
