import { Router } from "express";
import { aiAgentsController } from "./ai-agents.controller";
import { requireAgentAuth, requireServiceKey } from "../../middleware/auth";

const router = Router();

// Consumed by the voice AI orchestrator (Twilio/LLM layer), not the dashboard
router.get("/:id/runtime-context", requireServiceKey, aiAgentsController.runtimeContext);

router.use(requireAgentAuth);
router.get("/", aiAgentsController.list);
router.get("/:id", aiAgentsController.getById);
router.post("/", aiAgentsController.create);
router.put("/:id", aiAgentsController.update);
router.delete("/:id", aiAgentsController.remove);

export default router;
