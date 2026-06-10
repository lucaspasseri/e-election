import { parse } from "csv-parse/sync";

async function parseVotersFile(db, { votersFile, electionId }) {
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
			const cnf = record["CNF"];
			const email = record["E-mail"];
			const cel1 = record["Celular 1"];
			const cel2 = record["Celular 2"];

			const { rows } = await client.query(
				`
				INSERT INTO voters (
					election_id,
					name,
					external_code,
					email,
					phone, 
					phone2
				)
				VALUES ($1, $2, $3, $4, $5, $6)
				RETURNING *
				`,
				[electionId, name, cnf, email, cel1, cel2],
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
