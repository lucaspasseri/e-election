import { parse } from "csv-parse/sync";

async function parseVotersFile(db, { votersFile, electionId }) {
	console.log({
		votersFile,
		hasBuffer: Boolean(votersFile?.buffer),
		path: votersFile?.path,
		originalname: votersFile?.originalname,
		size: votersFile?.size,
	});

	if (!votersFile) {
		throw new Error("Voters file is required");
	}

	const fileContent = votersFile.buffer.toString("utf-8");

	const records = parse(fileContent, {
		columns: true,
		skip_empty_lines: true,
		trim: true,
		delimiter: ";",
	});

	if (records.length === 0) {
		throw new Error("CSV file is empty");
	}

	const client = await db.connect();

	try {
		await client.query("BEGIN");

		const importedVoters = [];

		for (const record of records) {
			const name = record["Nome"];
			const email = record["E-mail"];

			if (!name || !email) {
				// throw new Error("Each voter must have name and email");
				continue;
			}

			const { rows } = await client.query(
				`
				INSERT INTO voters (
					election_id,
					name,
					email
				)
				VALUES ($1, $2, $3)
				RETURNING *
				`,
				[electionId, name, email],
			);

			importedVoters.push(rows[0]);
		}

		await client.query("COMMIT");

		return {
			totalRows: records.length,
			importedCount: importedVoters.length,
			voters: importedVoters,
		};
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

export { parseVotersFile };
