import { Router } from "express";
import { appointmentsController } from "./appointments.controller";
import { requireAgentAuth, requireClientAuth, requireAnyAuth } from "../../middleware/auth";

const router = Router();

// Public/service: AI agent + website widget booking flow
router.post("/", appointmentsController.book);
router.get("/available-slots", appointmentsController.availableSlots);

// Agent dashboard
router.get("/agent", requireAgentAuth, appointmentsController.listForAgent);
router.patch("/:id/confirm", requireAgentAuth, appointmentsController.confirm);
router.patch("/:id/complete", requireAgentAuth, appointmentsController.markCompleted);

// Client portal
router.get("/client", requireClientAuth, appointmentsController.listForClient);
router.patch("/:id/reschedule", requireClientAuth, appointmentsController.requestReschedule);
router.patch("/:id/pay-cash", requireClientAuth, appointmentsController.markPayInCash);

// Shared: either party can cancel or view a specific appointment
router.get("/:id", requireAnyAuth, appointmentsController.getById);
router.patch("/:id/cancel", requireAnyAuth, appointmentsController.cancel);

export default router;
