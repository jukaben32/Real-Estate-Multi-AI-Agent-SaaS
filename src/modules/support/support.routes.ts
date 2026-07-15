import { Router } from "express";
import { supportController } from "./support.controller";
import { requireAnyAuth, requireAgentAuth } from "../../middleware/auth";

const router = Router();
router.use(requireAnyAuth);

router.post("/", supportController.createTicket);
router.get("/", supportController.listMine);
router.post("/:id/messages", supportController.addMessage);
router.patch("/:id/close", requireAgentAuth, supportController.close);

export default router;
