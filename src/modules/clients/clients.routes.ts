import { Router } from "express";
import { clientsController } from "./clients.controller";
import { requireAgentAuth } from "../../middleware/auth";

const router = Router();
router.use(requireAgentAuth);
router.get("/", clientsController.list);
router.get("/:id", clientsController.getById);

export default router;
