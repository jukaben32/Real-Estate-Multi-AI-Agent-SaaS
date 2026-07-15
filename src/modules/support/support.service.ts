import { prisma } from "../../config/db";
import { ApiError } from "../../utils/ApiError";

export const supportService = {
  // Client opens a support ticket tied to whichever agent they've been dealing with
  async createTicket(clientId: string, agentId: string, subject: string, firstMessage: string) {
    return prisma.supportTicket.create({
      data: {
        clientId,
        agentId,
        subject,
        messages: { create: { senderType: "CLIENT", message: firstMessage } },
      },
      include: { messages: true },
    });
  },

  listForClient(clientId: string) {
    return prisma.supportTicket.findMany({
      where: { clientId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
  },

  listForAgent(agentId: string) {
    return prisma.supportTicket.findMany({
      where: { agentId },
      include: { client: true, messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async addMessage(ticketId: string, senderType: "CLIENT" | "AGENT", message: string, attachmentUrl?: string) {
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw ApiError.notFound("Support ticket not found");

    await prisma.supportMessage.create({ data: { ticketId, senderType, message, attachmentUrl } });
    // Reopen if an agent had marked it closed and the client writes back, or vice versa
    return prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: "PENDING" },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  },

  async closeTicket(agentId: string, ticketId: string) {
    const ticket = await prisma.supportTicket.findFirst({ where: { id: ticketId, agentId } });
    if (!ticket) throw ApiError.notFound("Support ticket not found");
    return prisma.supportTicket.update({ where: { id: ticketId }, data: { status: "CLOSED" } });
  },
};
