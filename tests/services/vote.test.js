import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { testPool, clearDb } from "../setup/testDb.js";
import {
	createElection,
	createSlate,
	createVoter,
	createVotingToken,
} from "../setup/factories.js";
import { vote } from "../../services/vote.js";

describe("vote()", () => {
	beforeEach(async () => {
		await clearDb();
	});

	afterAll(async () => {
		await testPool.end();
	});

	it("casts a vote for a valid voter with a valid token", async () => {
		console.log(1);
		const election = await createElection(testPool);
		const slate = await createSlate(testPool, { electionId: election.id });
		const voter = await createVoter(testPool, { electionId: election.id });
		const token = await createVotingToken(testPool, { voterId: voter.id });

		await vote(testPool, {
			token: token.rawToken,
			slateId: slate.id,
			ipAddress: "127.0.0.1",
			userAgent: "vitest",
		});

		const votes = await testPool.query(`SELECT * FROM votes`);
		const voters = await testPool.query(`SELECT * FROM voters`);
		const tokens = await testPool.query(`SELECT * FROM voting_tokens`);
		const audits = await testPool.query(`SELECT * FROM audit_logs`);

		expect(votes.rowCount).toBe(1);
		expect(votes.rows[0].slate_id).toBe(slate.id);

		expect(voters.rows[0].has_voted).toBe(true);
		expect(voters.rows[0].voted_at).not.toBe(null);

		expect(tokens.rows[0].used_at).not.toBe(null);

		expect(audits.rowCount).toBe(1);
		expect(audits.rows[0].action).toBe("vote_cast");
	});

	it("rejects an invalid token", async () => {
		const election = await createElection(testPool);
		const slate = await createSlate(testPool, { electionId: election.id });

		await expect(
			vote(testPool, {
				token: "wrong-token",
				slateId: slate.id,
				ipAddress: "127.0.0.1",
				userAgent: "vitest",
			}),
		).rejects.toThrow("Invalid voting token.");

		const votes = await testPool.query(`SELECT * FROM votes`);

		expect(votes.rowCount).toBe(0);
	});

	it("does not allow the same voter to vote twice", async () => {
		const election = await createElection(testPool);
		const slate = await createSlate(testPool, { electionId: election.id });
		const voter = await createVoter(testPool, {
			electionId: election.id,
			hasVoted: true,
		});
		const token = await createVotingToken(testPool, { voterId: voter.id });

		await expect(
			vote(testPool, {
				token: token.rawToken,
				slateId: slate.id,
				ipAddress: "127.0.0.1",
				userAgent: "vitest",
			}),
		).rejects.toThrow("This voter has already voted.");

		const votes = await testPool.query(`SELECT * FROM votes`);

		expect(votes.rowCount).toBe(0);
	});

	it("does not allow voting before the election starts", async () => {
		const election = await createElection(testPool, {
			startsAt: new Date(Date.now() + 60 * 60 * 1000),
			endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
		});

		const slate = await createSlate(testPool, { electionId: election.id });
		const voter = await createVoter(testPool, { electionId: election.id });
		const token = await createVotingToken(testPool, { voterId: voter.id });

		await expect(
			vote(testPool, {
				token: token.rawToken,
				slateId: slate.id,
				ipAddress: "127.0.0.1",
				userAgent: "vitest",
			}),
		).rejects.toThrow("The election has not started yet.");

		const votes = await testPool.query(`SELECT * FROM votes`);

		expect(votes.rowCount).toBe(0);
	});

	it("does not allow voting after the election ends", async () => {
		const election = await createElection(testPool, {
			startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
			endsAt: new Date(Date.now() - 60 * 60 * 1000),
		});

		const slate = await createSlate(testPool, { electionId: election.id });
		const voter = await createVoter(testPool, { electionId: election.id });
		const token = await createVotingToken(testPool, { voterId: voter.id });

		await expect(
			vote(testPool, {
				token: token.rawToken,
				slateId: slate.id,
				ipAddress: "127.0.0.1",
				userAgent: "vitest",
			}),
		).rejects.toThrow("The election has already ended.");

		const votes = await testPool.query(`SELECT * FROM votes`);

		expect(votes.rowCount).toBe(0);
	});

	it("does not allow voting for a slate from another election", async () => {
		const electionA = await createElection(testPool);
		const electionB = await createElection(testPool, {
			name: "Another Election",
		});

		const wrongSlate = await createSlate(testPool, {
			electionId: electionB.id,
			name: "Wrong Slate",
		});

		const voter = await createVoter(testPool, { electionId: electionA.id });
		const token = await createVotingToken(testPool, { voterId: voter.id });

		await expect(
			vote(testPool, {
				token: token.rawToken,
				slateId: wrongSlate.id,
				ipAddress: "127.0.0.1",
				userAgent: "vitest",
			}),
		).rejects.toThrow("Invalid slate for this election.");

		const votes = await testPool.query(`SELECT * FROM votes`);

		expect(votes.rowCount).toBe(0);
	});

	it("rolls back the transaction when voting fails", async () => {
		const election = await createElection(testPool);
		const voter = await createVoter(testPool, { electionId: election.id });
		const token = await createVotingToken(testPool, { voterId: voter.id });

		await expect(
			vote(testPool, {
				token: token.rawToken,
				slateId: 999999,
				ipAddress: "127.0.0.1",
				userAgent: "vitest",
			}),
		).rejects.toThrow("Invalid slate for this election.");

		const votes = await testPool.query(`SELECT * FROM votes`);
		const voters = await testPool.query(`SELECT * FROM voters`);
		const tokens = await testPool.query(`SELECT * FROM voting_tokens`);
		const audits = await testPool.query(`SELECT * FROM audit_logs`);

		expect(votes.rowCount).toBe(0);
		expect(voters.rows[0].has_voted).toBe(false);
		expect(tokens.rows[0].used_at).toBe(null);
		expect(audits.rowCount).toBe(0);
	});
});
