import { Router } from "express";
import { vote } from "../services/vote.js";
import pool from "../db/pool.js";
import { postVote } from "../controllers/vote.js";

const router = Router();

router.post("/:token", postVote);

export default router;
