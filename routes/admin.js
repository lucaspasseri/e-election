import { Router } from "express";
import { renderAdmin } from "../controllers/admin.js";
import {
	postImportVoters,
	renderImportVoters,
} from "../controllers/import-voters.js";

import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.get("/", renderAdmin);
router.get("/elections/:electionId/import-voters", renderImportVoters);
router.post(
	"/elections/:electionId/import-voters",
	upload.single("votersFile"),
	postImportVoters,
);

export default router;
