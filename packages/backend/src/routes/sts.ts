import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import * as stsController from "../controllers/sts";

const router = Router();

router.post("/upload-url", requireAuth, stsController.getUploadUrl);

export default router;
