import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import * as certController from "../controllers/cert";

const router = Router();

router.get("/", requireAuth, certController.getAll);
router.get("/:id", requireAuth, certController.getOne);
router.post("/", requireAuth, certController.createOne);
router.post("/batch", requireAuth, certController.createMany);
router.put("/:id", requireAuth, certController.updateOne);
router.delete("/batch", requireAuth, certController.deleteMany);
router.delete("/:id", requireAuth, certController.deleteOne);

export default router;
