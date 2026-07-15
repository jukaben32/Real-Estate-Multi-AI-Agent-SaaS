import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import propertiesRoutes from "../modules/properties/properties.routes";
import aiAgentsRoutes from "../modules/agents/ai-agents.routes";
import appointmentsRoutes from "../modules/appointments/appointments.routes";
import callsRoutes from "../modules/calls/calls.routes";
import clientsRoutes from "../modules/clients/clients.routes";
import supportRoutes from "../modules/support/support.routes";
import paymentsRoutes from "../modules/payments/payments.routes";
import websiteRoutes from "../modules/website/website.routes";

const router = Router();

router.get("/health", (_req, res) => res.json({ success: true, message: "EstateCall API is running" }));

router.use("/auth", authRoutes);
router.use("/properties", propertiesRoutes);
router.use("/ai-agents", aiAgentsRoutes);
router.use("/appointments", appointmentsRoutes);
router.use("/calls", callsRoutes);
router.use("/clients", clientsRoutes);
router.use("/support", supportRoutes);
router.use("/payments", paymentsRoutes);
router.use("/website", websiteRoutes);

export default router;
