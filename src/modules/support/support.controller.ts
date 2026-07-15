import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { supportService } from "./support.service";
import { createTicketSchema, createMessageSchema } from "./support.schema";
import { ApiError } from "../../utils/ApiError";
import { prisma } from "../../config/db";

export const supportController = {
  createTicket: asyncHandler(async (req: Request, res: Response) => {
    const { subject, message } = createTicketSchema.parse(req.body);
    const agentId = req.body.agentId as string;
    if (!agentId) throw ApiError.badRequest("agentId is required");

    // Confirm the client has an existing relationship with this agent (via an appointment)
    const hasRelationship = await prisma.appointment.findFirst({ where: { clientId: req.auth!.id, assignedAgentId: agentId } });
    if (!hasRelationship) throw ApiError.forbidden("No existing relationship with this agent");

    const ticket = await supportService.createTicket(req.auth!.id, agentId, subject, message);
    res.status(201).json({ success: true, data: ticket });
  }),

  listMine: asyncHandler(async (req: Request, res: Response) => {
    const items =
      req.auth!.audience === "client" ? await supportService.listForClient(req.auth!.id) : await supportService.listForAgent(req.auth!.id);
    res.json({ success: true, data: items });
  }),

  addMessage: asyncHandler(async (req: Request, res: Response) => {
    const { message, attachmentUrl } = createMessageSchema.parse(req.body);
    const senderType = req.auth!.audience === "client" ? "CLIENT" : "AGENT";
    const ticket = await supportService.addMessage(req.params.id, senderType, message, attachmentUrl);
    res.json({ success: true, data: ticket });
  }),

  close: asyncHandler(async (req: Request, res: Response) => {
    const ticket = await supportService.closeTicket(req.auth!.id, req.params.id);
    res.json({ success: true, data: ticket });
  }),
};
