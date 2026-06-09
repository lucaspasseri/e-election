import pg from "pg";

const { Pool } = pg;

const testPool = new Pool({
	connectionString: process.env.TEST_DATABASE_URL,
});

async function clearDb() {
	await testPool.query(`
		TRUNCATE
			audit_logs,
			votes,
			voting_tokens,
			voters,
			slates,
			elections
		RESTART IDENTITY CASCADE
	`);
}

export { testPool, clearDb };
