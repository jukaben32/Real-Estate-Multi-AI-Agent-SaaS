import { Router } from "express";
import { paymentsController } from "./payments.controller";
import { requireClientAuth, requireAgentAuth } from "../../middleware/auth";

const router = Router();

// NOTE: POST /api/payments/webhook is registered separately in app.ts with the raw
// body parser (BEFORE express.json()), since Stripe requires the untouched raw
// payload to verify the webhook signature. It is intentionally not repeated here.

router.post("/intent", requireClientAuth, paymentsController.createIntent);
router.post("/website-checkout", requireAgentAuth, paymentsController.createWebsiteCheckout);

export default router;
