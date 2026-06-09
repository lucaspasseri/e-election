import crypto from "node:crypto";

function hashToken(token) {
	return crypto.createHash("sha256").update(token).digest("hex");
}

async function vote(db, { token, slateId, ipAddress, userAgent }) {
	const client = await db.connect();

	try {
		await client.query("BEGIN");

		const tokenHash = hashToken(token);

		const tokenResult = await client.query(
			`
				SELECT
					vt.id AS token_id,
					vt.used_at,
					vt.expires_at,

					v.id AS voter_id,
					v.election_id,
					v.has_voted,

					e.starts_at,
					e.ends_at
				FROM voting_tokens vt
				JOIN voters v ON v.id = vt.voter_id
				JOIN elections e ON e.id = v.election_id
				WHERE vt.token_hash = $1
				FOR UPDATE
			`,
			[tokenHash],
		);

		const voterData = tokenResult.rows[0];

		if (!voterData) {
			throw new Error("Invalid voting token.");
		}

		if (voterData.used_at) {
			throw new Error("This voting token was already used.");
		}

		if (new Date(voterData.expires_at) < new Date()) {
			throw new Error("This voting token is expired.");
		}

		if (voterData.has_voted) {
			throw new Error("This voter has already voted.");
		}

		const now = new Date();

		if (now < new Date(voterData.starts_at)) {
			throw new Error("The election has not started yet.");
		}

		if (now > new Date(voterData.ends_at)) {
			throw new Error("The election has already ended.");
		}

		const slateResult = await client.query(
			`
			SELECT id
			FROM slates
			WHERE id = $1
			AND election_id = $2
			`,
			[slateId, voterData.election_id],
		);

		const slate = slateResult.rows[0];

		if (!slate) {
			throw new Error("Invalid slate for this election.");
		}

		await client.query(
			`
			INSERT INTO votes (election_id, slate_id)
			VALUES ($1, $2)
			`,
			[voterData.election_id, slateId],
		);

		await client.query(
			`
			UPDATE voters
			SET has_voted = true,
				voted_at = now()
			WHERE id = $1
			`,
			[voterData.voter_id],
		);

		await client.query(
			`
			UPDATE voting_tokens
			SET used_at = now()
			WHERE id = $1
			`,
			[voterData.token_id],
		);

		await client.query(
			`
			INSERT INTO audit_logs (
				election_id,
				voter_id,
				action,
				ip_address,
				user_agent
			)
			VALUES ($1, $2, $3, $4, $5)
			`,
			[
				voterData.election_id,
				voterData.voter_id,
				"vote_cast",
				ipAddress,
				userAgent,
			],
		);

		await client.query("COMMIT");

		return {
			success: true,
			electionId: voterData.election_id,
		};
	} catch (err) {
		await client.query("ROLLBACK");
		throw err;
	} finally {
		client.release();
	}
}

export { vote };
