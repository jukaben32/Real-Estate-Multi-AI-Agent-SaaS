import { prisma } from "../../config/db";

export const callsService = {
  create(data: any) {
    return prisma.callLog.create({ data });
  },

  async listForAgent(agentId: string, page: number, pageSize: number) {
    const where = { aiAgent: { agentId } };
    const [items, total] = await Promise.all([
      prisma.callLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: { aiAgent: true, property: true },
      }),
      prisma.callLog.count({ where }),
    ]);
    return { items, total, page, pageSize };
  },

  getById(id: string) {
    return prisma.callLog.findUnique({ where: { id }, include: { aiAgent: true, property: true } });
  },
};
