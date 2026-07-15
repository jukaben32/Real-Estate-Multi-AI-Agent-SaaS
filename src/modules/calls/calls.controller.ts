import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { callsService } from "./calls.service";
import { createCallLogSchema } from "./calls.schema";

export const callsController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const data = createCallLogSchema.parse(req.body);
    const call = await callsService.create(data);
    res.status(201).json({ success: true, data: call });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const result = await callsService.listForAgent(req.auth!.id, page, pageSize);
    res.json({ success: true, data: result });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const call = await callsService.getById(req.params.id);
    res.json({ success: true, data: call });
  }),
};
