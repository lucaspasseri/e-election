async function renderIndexPage(req, res) {
	res.locals.page ??= {};
	res.locals.page.title = "E-eleição";
	res.render("index");
}

export { renderIndexPage };
