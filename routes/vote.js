import { Router } from "express";
import { vote } from "../services/vote.js";
import pool from "../db/pool.js";

const router = Router();

router.post("/:token", async (req, res, next) => {
	try {
		const { token } = req.params;
		const { slateId } = req.body;

		await vote(pool, {
			token,
			slateId: Number(slateId),
			ipAddress: req.ip,
			userAgent: req.get("user-agent"),
		});

		res.redirect("/vote/success");
	} catch (err) {
		next(err);
	}
});

export default router;
