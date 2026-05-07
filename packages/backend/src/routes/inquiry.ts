import { Router } from "express";
import * as inquiryController from "../controllers/inquiry";

const router = Router();

router.get("/search", inquiryController.searchByIdNum);
router.get("/:slug", inquiryController.getByCertSlug);

export default router;
