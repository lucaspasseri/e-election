import { Client } from "pg";

const sql = `
CREATE TABLE elections (
	id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	name TEXT NOT NULL,
	starts_at TIMESTAMPTZ NOT NULL,
	ends_at TIMESTAMPTZ NOT NULL,
	status TEXT NOT NULL DEFAULT 'draft'
);

CREATE TABLE slates (
	id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	election_id INTEGER NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	description TEXT
);

CREATE TABLE voters (
	id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	election_id INTEGER NOT NULL REFERENCES elections(id) ON DELETE CASCADE,

	external_code TEXT,
	name TEXT NOT NULL,
	email TEXT,
	phone TEXT,

	has_voted BOOLEAN NOT NULL DEFAULT false,
	voted_at TIMESTAMPTZ,

	UNIQUE (election_id, external_code)
);

CREATE TABLE voting_tokens (
	id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	voter_id INTEGER NOT NULL REFERENCES voters(id) ON DELETE CASCADE,

	token_hash TEXT NOT NULL UNIQUE,
	expires_at TIMESTAMPTZ NOT NULL,
	used_at TIMESTAMPTZ,

	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE votes (
	id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	election_id INTEGER NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
	slate_id INTEGER NOT NULL REFERENCES slates(id) ON DELETE RESTRICT,

	cast_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
	id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	election_id INTEGER REFERENCES elections(id),
	voter_id INTEGER REFERENCES voters(id),

	action TEXT NOT NULL,
	ip_address TEXT,
	user_agent TEXT,
	metadata JSONB,

	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

async function main() {
	console.log("Seeding database...");

	const client = new Client({
		connectionString: process.env.DATABASE_URL,
		ssl: process.env.DATABASE_URL?.includes("neon")
			? { rejectUnauthorized: false }
			: false,
	});

	try {
		await client.connect();
		await client.query(sql);

		console.log("Database seeded successfully.");
	} catch (err) {
		console.error("Error while seeding database:", err);
	} finally {
		await client.end();
		console.log("Connection closed.");
	}
}

main();
