import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import * as stsController from "../controllers/sts";

const router = Router();

router.post("/upload-url", requireAuth, stsController.getUploadUrl);
router.post("/download-url", requireAuth, stsController.getDownloadUrl);
router.get("/proxy-image", requireAuth, stsController.proxyImage);

export default router;
