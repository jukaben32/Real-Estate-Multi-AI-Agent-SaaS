import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { paymentsService } from "./payments.service";
import { stripe } from "./stripe.client";
import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";

export const paymentsController = {
  createIntent: asyncHandler(async (req: Request, res: Response) => {
    const { appointmentId } = req.body;
    const result = await paymentsService.createPaymentIntent(req.auth!.id, appointmentId);
    res.json({ success: true, data: result });
  }),

  createWebsiteCheckout: asyncHandler(async (req: Request, res: Response) => {
    const result = await paymentsService.createWebsiteSubscriptionCheckout(req.auth!.id);
    res.json({ success: true, data: result });
  }),

  // Raw-body Stripe webhook endpoint - signature verified before this runs
  webhook: asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) throw ApiError.badRequest("Missing stripe-signature header");

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, env.stripeWebhookSecret);
    } catch (err) {
      throw ApiError.badRequest(`Webhook signature verification failed: ${(err as Error).message}`);
    }

    await paymentsService.handleWebhookEvent(event);
    res.json({ received: true });
  }),
};
