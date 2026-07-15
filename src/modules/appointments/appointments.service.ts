import { prisma } from "../../config/db";
import { ApiError } from "../../utils/ApiError";
import { sendEmail, emailTemplates } from "../../utils/email";
import { authService } from "../auth/auth.service";

const BUSINESS_HOURS = { startHour: 9, endHour: 18, slotMinutes: 60 };

function formatDate(date: Date) {
  return date.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
}

async function notifyAgent(agentId: string, type: string, message: string, metadata?: Record<string, unknown>) {
  await prisma.notification.create({ data: { agentId, type, message, metadata } });
}

export const appointmentsService = {
  // Mirrors the AI-agent-driven booking flow: collect name/date/time/phone/email/budget,
  // create-or-reuse the client, create the appointment as PENDING, notify both parties.
  async book(input: {
    propertyId: string;
    type: "VIEWING" | "CONSULTATION";
    scheduledDate: string;
    durationMinutes: number;
    notes?: string;
    client: { fullName: string; email: string; phone?: string; budgetRange?: string; financing?: any };
  }) {
    const property = await prisma.property.findUnique({ where: { id: input.propertyId } });
    if (!property) throw ApiError.notFound("Property not found");

    const client = await prisma.client.upsert({
      where: { email: input.client.email },
      update: {
        fullName: input.client.fullName,
        phone: input.client.phone,
        budgetRange: input.client.budgetRange,
        financing: input.client.financing,
      },
      create: {
        email: input.client.email,
        fullName: input.client.fullName,
        phone: input.client.phone,
        budgetRange: input.client.budgetRange,
        financing: input.client.financing,
      },
    });

    const appointment = await prisma.appointment.create({
      data: {
        propertyId: property.id,
        clientId: client.id,
        assignedAgentId: property.agentId,
        type: input.type,
        scheduledDate: new Date(input.scheduledDate),
        durationMinutes: input.durationMinutes,
        notes: input.notes,
        status: "PENDING",
      },
      include: { property: true, client: true },
    });

    const dateStr = formatDate(appointment.scheduledDate);

    const clientEmail = emailTemplates.appointmentBooked(client.fullName, property.title, dateStr);
    await sendEmail({ to: client.email, ...clientEmail });

    // Nudge the client to set up their portal account, like the "special link" in the walkthrough
    await authService.sendPortalInvite(client.email, client.fullName);

    const agentEmail = emailTemplates.agentNewAppointment(property.title, client.fullName, dateStr);
    await sendEmail({ to: (await prisma.agent.findUnique({ where: { id: property.agentId } }))!.email, ...agentEmail });
    await notifyAgent(property.agentId, "APPOINTMENT_BOOKED", `${client.fullName} requested a ${input.type.toLowerCase()} for ${property.title}`, {
      appointmentId: appointment.id,
    });

    return appointment;
  },

  async availableSlots(propertyId: string, dateStr: string) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw ApiError.notFound("Property not found");

    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

    const existing = await prisma.appointment.findMany({
      where: {
        propertyId,
        status: { in: ["PENDING", "CONFIRMED"] },
        scheduledDate: { gte: dayStart, lte: dayEnd },
      },
      select: { scheduledDate: true },
    });
    const takenHours = new Set(existing.map((a: { scheduledDate: Date }) => a.scheduledDate.getUTCHours()));

    const slots: string[] = [];
    for (let hour = BUSINESS_HOURS.startHour; hour < BUSINESS_HOURS.endHour; hour++) {
      if (!takenHours.has(hour)) {
        slots.push(`${dateStr}T${String(hour).padStart(2, "0")}:00:00.000Z`);
      }
    }
    return slots;
  },

  async listForAgent(agentId: string, filters: { status?: string; propertyId?: string; page: number; pageSize: number }) {
    const where = {
      assignedAgentId: agentId,
      ...(filters.status && { status: filters.status as any }),
      ...(filters.propertyId && { propertyId: filters.propertyId }),
    };
    const [items, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
        orderBy: { scheduledDate: "asc" },
        include: { property: true, client: true, payment: true },
      }),
      prisma.appointment.count({ where }),
    ]);
    return { items, total, page: filters.page, pageSize: filters.pageSize };
  },

  listForClient(clientId: string) {
    return prisma.appointment.findMany({
      where: { clientId },
      orderBy: { scheduledDate: "asc" },
      include: { property: true, payment: true },
    });
  },

  async getById(id: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { property: true, client: true, payment: true },
    });
    if (!appointment) throw ApiError.notFound("Appointment not found");
    return appointment;
  },

  async assertOwnedByAgent(agentId: string, id: string) {
    const appointment = await this.getById(id);
    if (appointment.assignedAgentId !== agentId) throw ApiError.forbidden("You don't have access to this appointment");
    return appointment;
  },

  async assertOwnedByClient(clientId: string, id: string) {
    const appointment = await this.getById(id);
    if (appointment.clientId !== clientId) throw ApiError.forbidden("You don't have access to this appointment");
    return appointment;
  },

  // Agent confirms a pending/reschedule-requested appointment
  async confirm(agentId: string, id: string) {
    const appointment = await this.assertOwnedByAgent(agentId, id);
    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: "CONFIRMED" },
      include: { property: true, client: true },
    });
    const { subject, html } = emailTemplates.appointmentConfirmed(
      updated.client.fullName,
      updated.property.title,
      formatDate(updated.scheduledDate)
    );
    await sendEmail({ to: updated.client.email, subject, html });
    return updated;
  },

  // Either the client or the agent can cancel
  async cancel(id: string, actor: { audience: "agent" | "client"; id: string }) {
    const appointment =
      actor.audience === "agent" ? await this.assertOwnedByAgent(actor.id, id) : await this.assertOwnedByClient(actor.id, id);

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: { property: true, client: true },
    });

    const clientEmail = emailTemplates.appointmentCancelled(updated.client.fullName, updated.property.title, formatDate(updated.scheduledDate));
    await sendEmail({ to: updated.client.email, ...clientEmail });

    const agent = await prisma.agent.findUnique({ where: { id: updated.assignedAgentId! } });
    if (agent) {
      const agentEmail = emailTemplates.agentAppointmentCancelled(updated.property.title, updated.client.fullName);
      await sendEmail({ to: agent.email, ...agentEmail });
      await notifyAgent(agent.id, "APPOINTMENT_CANCELLED", `${updated.client.fullName} cancelled ${updated.property.title}`, {
        appointmentId: updated.id,
      });
    }

    return updated;
  },

  // Client requests a new date -> goes to RESCHEDULE_REQUESTED, pending agent approval
  // (matches: "it's in the pending because the real estate agent need to view the availability")
  async requestReschedule(clientId: string, id: string, newDate: string) {
    const appointment = await this.assertOwnedByClient(clientId, id);
    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: "RESCHEDULE_REQUESTED",
        scheduledDate: new Date(newDate),
        rescheduleOf: appointment.id,
      },
      include: { property: true, client: true },
    });

    const { subject, html } = emailTemplates.appointmentRescheduleRequested(
      updated.client.fullName,
      updated.property.title,
      formatDate(updated.scheduledDate)
    );
    await sendEmail({ to: updated.client.email, subject, html });
    await notifyAgent(updated.assignedAgentId!, "APPOINTMENT_RESCHEDULE_REQUESTED", `${updated.client.fullName} requested to reschedule ${updated.property.title}`, {
      appointmentId: updated.id,
    });

    return updated;
  },

  // Client marks "pay in cash" (paid on-site, no Stripe involved)
  async markPayInCash(clientId: string, id: string) {
    await this.assertOwnedByClient(clientId, id);
    return prisma.appointment.update({ where: { id }, data: { paymentStatus: "PAY_IN_CASH" } });
  },

  async markCompleted(agentId: string, id: string) {
    await this.assertOwnedByAgent(agentId, id);
    return prisma.appointment.update({ where: { id }, data: { status: "COMPLETED" } });
  },
};
