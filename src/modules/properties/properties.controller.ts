import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { propertiesService } from "./properties.service";
import {
  createPropertySchema,
  updatePropertySchema,
  updateStatusSchema,
  listPropertiesQuerySchema,
} from "./properties.schema";
import { ApiError } from "../../utils/ApiError";

export const propertiesController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const filters = listPropertiesQuerySchema.parse(req.query);
    const result = await propertiesService.list(req.auth!.id, filters);
    res.json({ success: true, data: result });
  }),

  listPublic: asyncHandler(async (req: Request, res: Response) => {
    const aiAgentId = String(req.query.aiAgentId ?? "");
    if (!aiAgentId) throw ApiError.badRequest("aiAgentId query param is required");
    const listingType = req.query.listingType as "SALE" | "RENT" | undefined;
    const items = await propertiesService.listPublicForAgent(aiAgentId, listingType);
    res.json({ success: true, data: items });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const property = await propertiesService.getById(req.auth!.id, req.params.id);
    res.json({ success: true, data: property });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = createPropertySchema.parse(req.body);
    const property = await propertiesService.create(req.auth!.id, data as any);
    res.status(201).json({ success: true, data: property });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = updatePropertySchema.parse(req.body);
    const property = await propertiesService.update(req.auth!.id, req.params.id, data as any);
    res.json({ success: true, data: property });
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const { status } = updateStatusSchema.parse(req.body);
    const property = await propertiesService.updateStatus(req.auth!.id, req.params.id, status);
    res.json({ success: true, data: property });
  }),

  toggleActive: asyncHandler(async (req: Request, res: Response) => {
    const active = Boolean(req.body.active);
    const property = await propertiesService.toggleActive(req.auth!.id, req.params.id, active);
    res.json({ success: true, data: property });
  }),

  addImages: asyncHandler(async (req: Request, res: Response) => {
    const images = req.body.images as string[];
    if (!Array.isArray(images) || images.length === 0) {
      throw ApiError.badRequest("images must be a non-empty array of URLs (upload to S3/Cloudinary first)");
    }
    const property = await propertiesService.addImages(req.auth!.id, req.params.id, images);
    res.json({ success: true, data: property });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await propertiesService.remove(req.auth!.id, req.params.id);
    res.status(204).send();
  }),
};
