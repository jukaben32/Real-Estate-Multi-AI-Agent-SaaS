import { Router } from "express";
import { websiteController } from "./website.controller";
import { requireAgentAuth } from "../../middleware/auth";

const router = Router();

// Public: renders the published micro-site + widget
router.get("/public/:subdomain", websiteController.getPublic);

router.use(requireAgentAuth);
router.get("/", websiteController.getMine);
router.put("/", websiteController.upsert);
router.patch("/publish", websiteController.publish);

export default router;
