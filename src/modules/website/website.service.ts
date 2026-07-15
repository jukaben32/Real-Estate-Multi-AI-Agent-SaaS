import { prisma } from "../../config/db";
import { ApiError } from "../../utils/ApiError";

export const websiteService = {
  getMine(agentId: string) {
    return prisma.website.findUnique({ where: { agentId } });
  },

  async getBySubdomain(subdomain: string) {
    const site = await prisma.website.findUnique({ where: { subdomain } });
    if (!site || !site.published) throw ApiError.notFound("Website not found");
    return site;
  },

  async upsert(agentId: string, data: any) {
    // Website builder is a paid feature ($29/mo in the walkthrough)
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (agent?.subscriptionStatus !== "ACTIVE") {
      throw ApiError.forbidden("An active website builder subscription is required");
    }

    return prisma.website.upsert({
      where: { agentId },
      update: data,
      create: { agentId, ...data },
    });
  },

  async publish(agentId: string, published: boolean) {
    const site = await this.getMine(agentId);
    if (!site) throw ApiError.notFound("Create your website before publishing");
    return prisma.website.update({ where: { agentId }, data: { published } });
  },
};
