import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { clientsService } from "./clients.service";

export const clientsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const items = await clientsService.listForAgent(req.auth!.id);
    res.json({ success: true, data: items });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const client = await clientsService.getById(req.auth!.id, req.params.id);
    res.json({ success: true, data: client });
  }),
};
