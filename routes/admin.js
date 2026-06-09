import { Router } from "express";
import { renderAdmin } from "../controllers/admin.js";

const router = Router();

router.get("/", renderAdmin);

export default router;
