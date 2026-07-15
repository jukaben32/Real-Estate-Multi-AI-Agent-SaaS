import { Router } from "express";
import { authController } from "./auth.controller";

const router = Router();

// Agent (dashboard) auth
router.post("/agent/register", authController.registerAgent);
router.post("/agent/login", authController.loginAgent);

// Client (portal) auth
router.post("/client/register", authController.registerClient);
router.post("/client/login", authController.loginClient);

export default router;
