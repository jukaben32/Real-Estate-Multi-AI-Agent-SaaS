import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db";
import { ApiError } from "../../utils/ApiError";

interface ListFilters {
  status?: string;
  listingType?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  page: number;
  pageSize: number;
}

export const propertiesService = {
  async list(agentId: string, filters: ListFilters) {
    const where: Prisma.PropertyWhereInput = {
      agentId,
      ...(filters.status && { status: filters.status as any }),
      ...(filters.listingType && { listingType: filters.listingType as any }),
      ...(filters.propertyType && { propertyType: filters.propertyType as any }),
      ...(filters.search && {
        OR: [
          { title: { contains: filters.search, mode: "insensitive" } },
          { addressLine: { contains: filters.search, mode: "insensitive" } },
        ],
      }),
      ...((filters.minPrice || filters.maxPrice) && {
        price: {
          ...(filters.minPrice && { gte: filters.minPrice }),
          ...(filters.maxPrice && { lte: filters.maxPrice }),
        },
      }),
    };

    const [items, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
        orderBy: { createdAt: "desc" },
        include: { aiAgent: true },
      }),
      prisma.property.count({ where }),
    ]);

    // Mirror the dashboard's status counters (Available / Pending / Sold)
    const counts = await prisma.property.groupBy({
      by: ["status"],
      where: { agentId },
      _count: true,
    });

    return {
      items,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      counters: counts.reduce(
        (acc: Record<string, number>, c: { status: string; _count: number }) => ({ ...acc, [c.status]: c._count }),
        {} as Record<string, number>
      ),
    };
  },

  // Publicly consumable listing feed for the AI calling agent / embeddable widget.
  // Only returns active, agent-approved-to-speak-about properties.
  async listPublicForAgent(aiAgentId: string, listingType?: "SALE" | "RENT") {
    return prisma.property.findMany({
      where: {
        aiAgentId,
        active: true,
        visibleToAiAgent: true,
        status: "AVAILABLE",
        ...(listingType && { listingType }),
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(agentId: string, id: string) {
    const property = await prisma.property.findFirst({ where: { id, agentId } });
    if (!property) throw ApiError.notFound("Property not found");
    return property;
  },

  async create(agentId: string, data: Prisma.PropertyUncheckedCreateInput) {
    return prisma.property.create({ data: { ...data, agentId } });
  },

  async update(agentId: string, id: string, data: Prisma.PropertyUncheckedUpdateInput) {
    await this.getById(agentId, id);
    return prisma.property.update({ where: { id }, data });
  },

  async updateStatus(agentId: string, id: string, status: string) {
    await this.getById(agentId, id);
    return prisma.property.update({ where: { id }, data: { status: status as any } });
  },

  async toggleActive(agentId: string, id: string, active: boolean) {
    await this.getById(agentId, id);
    return prisma.property.update({ where: { id }, data: { active } });
  },

  async addImages(agentId: string, id: string, imageUrls: string[]) {
    const property = await this.getById(agentId, id);
    return prisma.property.update({
      where: { id },
      data: { images: { set: [...property.images, ...imageUrls] } },
    });
  },

  async remove(agentId: string, id: string) {
    await this.getById(agentId, id);
    await prisma.property.delete({ where: { id } });
  },
};
