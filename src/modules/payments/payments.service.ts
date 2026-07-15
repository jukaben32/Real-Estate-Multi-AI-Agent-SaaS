import { prisma } from "../../config/db";
import { stripe } from "./stripe.client";
import { ApiError } from "../../utils/ApiError";
import { sendEmail, emailTemplates } from "../../utils/email";
import { env } from "../../config/env";

export const paymentsService = {
  // Client clicks "Pay online" -> create a Stripe PaymentIntent for the appointment
  async createPaymentIntent(clientId: string, appointmentId: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { property: true, client: true, payment: true },
    });
    if (!appointment) throw ApiError.notFound("Appointment not found");
    if (appointment.clientId !== clientId) throw ApiError.forbidden("Not your appointment");
    if (appointment.payment?.status === "SUCCEEDED") throw ApiError.conflict("Already paid");

    const amount = Number(appointment.property.price);

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      metadata: { appointmentId: appointment.id, clientId },
      automatic_payment_methods: { enabled: true },
    });

    await prisma.payment.upsert({
      where: { appointmentId },
      update: { stripePaymentIntentId: intent.id, amount, status: "PENDING" },
      create: { appointmentId, stripePaymentIntentId: intent.id, amount, status: "PENDING" },
    });

    return { clientSecret: intent.client_secret, paymentIntentId: intent.id };
  },

  // Handles Stripe webhook events (payment_intent.succeeded, etc.)
  async handleWebhookEvent(event: import("stripe").Stripe.Event) {
    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as import("stripe").Stripe.PaymentIntent;
      const payment = await prisma.payment.findUnique({
        where: { stripePaymentIntentId: intent.id },
        include: { appointment: { include: { client: true, property: true } } },
      });
      if (!payment) return;

      await prisma.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED" } });
      await prisma.appointment.update({
        where: { id: payment.appointmentId },
        data: { paymentStatus: "PAID_ONLINE" },
      });

      const { subject, html } = emailTemplates.paymentReceived(
        payment.appointment.client.fullName,
        payment.appointment.property.title,
        `$${payment.amount}`
      );
      await sendEmail({ to: payment.appointment.client.email, subject, html });
    }

    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as import("stripe").Stripe.PaymentIntent;
      await prisma.payment.updateMany({
        where: { stripePaymentIntentId: intent.id },
        data: { status: "FAILED" },
      });
    }

    // Website builder subscription lifecycle
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const sub = event.data.object as import("stripe").Stripe.Subscription;
      const agent = await prisma.agent.findFirst({ where: { stripeCustomerId: sub.customer as string } });
      if (agent) {
        const status = sub.status === "active" ? "ACTIVE" : sub.status === "past_due" ? "PAST_DUE" : "CANCELED";
        await prisma.agent.update({ where: { id: agent.id }, data: { subscriptionStatus: status } });
      }
    }
  },

  // Agent subscribes to the website builder ($29/mo in the walkthrough)
  async createWebsiteSubscriptionCheckout(agentId: string) {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw ApiError.notFound("Agent not found");

    let customerId = agent.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: agent.email, name: agent.fullName });
      customerId = customer.id;
      await prisma.agent.update({ where: { id: agentId }, data: { stripeCustomerId: customerId } });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: env.stripeWebsitePriceId, quantity: 1 }],
      success_url: `${env.clientDashboardUrl}/website/builder?checkout=success`,
      cancel_url: `${env.clientDashboardUrl}/website/builder?checkout=cancelled`,
    });

    return { checkoutUrl: session.url };
  },
};
