import crypto from "node:crypto";

function hashToken(token) {
	return crypto.createHash("sha256").update(token).digest("hex");
}

async function createElection(db, overrides = {}) {
	const {
		name = "Community Election",
		startsAt = new Date(Date.now() - 60_000),
		endsAt = new Date(Date.now() + 60_000),
		status = "open",
	} = overrides;

	const { rows } = await db.query(
		`
		INSERT INTO elections (name, starts_at, ends_at, status)
		VALUES ($1, $2, $3, $4)
		RETURNING *
		`,
		[name, startsAt, endsAt, status],
	);

	return rows[0];
}

async function createSlate(db, { electionId, name = "Slate A" }) {
	const { rows } = await db.query(
		`
		INSERT INTO slates (election_id, name)
		VALUES ($1, $2)
		RETURNING *
		`,
		[electionId, name],
	);

	return rows[0];
}

async function createVoter(db, { electionId, hasVoted = false }) {
	const { rows } = await db.query(
		`
		INSERT INTO voters (
			election_id,
			external_code,
			name,
			email,
			phone,
			has_voted
		)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING *
		`,
		[
			electionId,
			"90014",
			"JORGE DE SOUZA CAMPOS",
			"jorge@example.com",
			"21988842417",
			hasVoted,
		],
	);

	return rows[0];
}

async function createVotingToken(
	db,
	{ voterId, token = "valid-token", usedAt = null },
) {
	const tokenHash = hashToken(token);

	const { rows } = await db.query(
		`
		INSERT INTO voting_tokens (
			voter_id,
			token_hash,
			expires_at,
			used_at
		)
		VALUES ($1, $2, $3, $4)
		RETURNING *
		`,
		[voterId, tokenHash, new Date(Date.now() + 60 * 60 * 1000), usedAt],
	);

	return {
		...rows[0],
		rawToken: token,
	};
}

export {
	createElection,
	createSlate,
	createVoter,
	createVotingToken,
	hashToken,
};
