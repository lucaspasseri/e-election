import { Router } from "express";
import { renderIndexPage } from "../controllers/index.js";

const router = Router();

router.get("/", renderIndexPage);

export default router;
