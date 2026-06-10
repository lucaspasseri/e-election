import { parseVotersFile } from "../services/parseVotersFile.js";
import pool from "../db/pool.js";

async function renderImportVoters(req, res) {
	res.locals.page ??= {};
	res.locals.page.title = "E-eleição";
	res.render("importVoters");
}

async function postImportVoters(req, res, next) {
	try {
		const { electionId } = req.params;

		const { totalRows, importedCount, voters } = await parseVotersFile(pool, {
			votersFile: req.file,
			electionId,
		});

		res.redirect("/admin/elections/1/import-voters");
	} catch (err) {
		next(err);
	}
}

export { renderImportVoters, postImportVoters };
