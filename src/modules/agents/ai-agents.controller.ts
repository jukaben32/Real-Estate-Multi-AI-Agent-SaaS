import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { aiAgentsService } from "./ai-agents.service";
import { createAIAgentSchema, updateAIAgentSchema } from "./ai-agents.schema";

export const aiAgentsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const items = await aiAgentsService.list(req.auth!.id);
    res.json({ success: true, data: items });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const item = await aiAgentsService.getById(req.auth!.id, req.params.id);
    res.json({ success: true, data: item });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = createAIAgentSchema.parse(req.body);
    const item = await aiAgentsService.create(req.auth!.id, data);
    res.status(201).json({ success: true, data: item });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = updateAIAgentSchema.parse(req.body);
    const item = await aiAgentsService.update(req.auth!.id, req.params.id, data);
    res.json({ success: true, data: item });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await aiAgentsService.remove(req.auth!.id, req.params.id);
    res.status(204).send();
  }),

  // Called by the voice/LLM orchestration layer right before/at call start
  runtimeContext: asyncHandler(async (req: Request, res: Response) => {
    const context = await aiAgentsService.getRuntimeContext(req.params.id);
    res.json({ success: true, data: context });
  }),
};
