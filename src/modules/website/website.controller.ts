import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { websiteService } from "./website.service";
import { upsertWebsiteSchema } from "./website.schema";

export const websiteController = {
  getMine: asyncHandler(async (req: Request, res: Response) => {
    const site = await websiteService.getMine(req.auth!.id);
    res.json({ success: true, data: site });
  }),

  getPublic: asyncHandler(async (req: Request, res: Response) => {
    const site = await websiteService.getBySubdomain(req.params.subdomain);
    res.json({ success: true, data: site });
  }),

  upsert: asyncHandler(async (req: Request, res: Response) => {
    const data = upsertWebsiteSchema.parse(req.body);
    const site = await websiteService.upsert(req.auth!.id, data);
    res.json({ success: true, data: site });
  }),

  publish: asyncHandler(async (req: Request, res: Response) => {
    const site = await websiteService.publish(req.auth!.id, Boolean(req.body.published));
    res.json({ success: true, data: site });
  }),
};
