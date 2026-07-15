import { prisma } from "../../config/db";
import { ApiError } from "../../utils/ApiError";

export const clientsService = {
  // The dashboard's "Clients" tab: everyone who has ever booked with this agent
  async listForAgent(agentId: string) {
    const clients = await prisma.client.findMany({
      where: { appointments: { some: { assignedAgentId: agentId } } },
      include: {
        appointments: {
          where: { assignedAgentId: agentId },
          orderBy: { scheduledDate: "desc" },
          include: { property: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return clients.map(({ password, ...c }: { password: string | null; [key: string]: unknown }) => c);
  },

  async getById(agentId: string, id: string) {
    const client = await prisma.client.findFirst({
      where: { id, appointments: { some: { assignedAgentId: agentId } } },
      include: {
        appointments: { where: { assignedAgentId: agentId }, include: { property: true, payment: true } },
        supportTickets: { where: { agentId } },
      },
    });
    if (!client) throw ApiError.notFound("Client not found");
    const { password, ...rest } = client;
    return rest;
  },
};
