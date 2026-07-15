import { Router } from "express";
import { propertiesController } from "./properties.controller";
import { requireAgentAuth } from "../../middleware/auth";

const router = Router();

// Public feed used by the AI calling agent / embeddable website widget
router.get("/public", propertiesController.listPublic);

// Dashboard (authenticated agent) routes
router.use(requireAgentAuth);
router.get("/", propertiesController.list);
router.get("/:id", propertiesController.getById);
router.post("/", propertiesController.create);
router.put("/:id", propertiesController.update);
router.patch("/:id/status", propertiesController.updateStatus);
router.patch("/:id/active", propertiesController.toggleActive);
router.post("/:id/images", propertiesController.addImages);
router.delete("/:id", propertiesController.remove);

export default router;
