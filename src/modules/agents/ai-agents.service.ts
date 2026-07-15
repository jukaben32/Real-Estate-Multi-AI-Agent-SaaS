import { prisma } from "../../config/db";
import { ApiError } from "../../utils/ApiError";

export const aiAgentsService = {
  list(agentId: string) {
    return prisma.aIAgent.findMany({ where: { agentId }, orderBy: { createdAt: "desc" } });
  },

  async getById(agentId: string, id: string) {
    const aiAgent = await prisma.aIAgent.findFirst({ where: { id, agentId } });
    if (!aiAgent) throw ApiError.notFound("AI agent not found");
    return aiAgent;
  },

  create(agentId: string, data: any) {
    return prisma.aIAgent.create({ data: { ...data, agentId } });
  },

  async update(agentId: string, id: string, data: any) {
    await this.getById(agentId, id);
    return prisma.aIAgent.update({ where: { id }, data });
  },

  async remove(agentId: string, id: string) {
    await this.getById(agentId, id);
    await prisma.aIAgent.delete({ where: { id } });
  },

  // Used by the voice/LLM orchestrator to build the system prompt + live listing context
  async getRuntimeContext(id: string) {
    const aiAgent = await prisma.aIAgent.findUnique({
      where: { id },
      include: {
        properties: {
          where: { active: true, visibleToAiAgent: true, status: "AVAILABLE" },
        },
      },
    });
    if (!aiAgent) throw ApiError.notFound("AI agent not found");
    return aiAgent;
  },
};
