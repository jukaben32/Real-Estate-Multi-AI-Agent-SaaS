import { Router } from "express";
import { callsController } from "./calls.controller";
import { requireAgentAuth, requireServiceKey } from "../../middleware/auth";

const router = Router();

// Logged by the voice AI orchestrator right after each call ends
router.post("/", requireServiceKey, callsController.create);

router.use(requireAgentAuth);
router.get("/", callsController.list);
router.get("/:id", callsController.getById);

export default router;
