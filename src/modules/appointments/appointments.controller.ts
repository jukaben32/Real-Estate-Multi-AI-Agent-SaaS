import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { appointmentsService } from "./appointments.service";
import {
  bookAppointmentSchema,
  rescheduleSchema,
  availableSlotsQuerySchema,
  listAppointmentsQuerySchema,
} from "./appointments.schema";

export const appointmentsController = {
  // Called by the AI voice agent orchestrator and by the public website widget
  book: asyncHandler(async (req: Request, res: Response) => {
    const data = bookAppointmentSchema.parse(req.body);
    const appointment = await appointmentsService.book(data);
    res.status(201).json({ success: true, data: appointment });
  }),

  availableSlots: asyncHandler(async (req: Request, res: Response) => {
    const { propertyId, date } = availableSlotsQuerySchema.parse(req.query);
    const slots = await appointmentsService.availableSlots(propertyId, date);
    res.json({ success: true, data: slots });
  }),

  listForAgent: asyncHandler(async (req: Request, res: Response) => {
    const filters = listAppointmentsQuerySchema.parse(req.query);
    const result = await appointmentsService.listForAgent(req.auth!.id, filters);
    res.json({ success: true, data: result });
  }),

  listForClient: asyncHandler(async (req: Request, res: Response) => {
    const items = await appointmentsService.listForClient(req.auth!.id);
    res.json({ success: true, data: items });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const appointment = await appointmentsService.getById(req.params.id);
    res.json({ success: true, data: appointment });
  }),

  confirm: asyncHandler(async (req: Request, res: Response) => {
    const appointment = await appointmentsService.confirm(req.auth!.id, req.params.id);
    res.json({ success: true, data: appointment });
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    const appointment = await appointmentsService.cancel(req.params.id, req.auth!);
    res.json({ success: true, data: appointment });
  }),

  requestReschedule: asyncHandler(async (req: Request, res: Response) => {
    const { scheduledDate } = rescheduleSchema.parse(req.body);
    const appointment = await appointmentsService.requestReschedule(req.auth!.id, req.params.id, scheduledDate);
    res.json({ success: true, data: appointment });
  }),

  markPayInCash: asyncHandler(async (req: Request, res: Response) => {
    const appointment = await appointmentsService.markPayInCash(req.auth!.id, req.params.id);
    res.json({ success: true, data: appointment });
  }),

  markCompleted: asyncHandler(async (req: Request, res: Response) => {
    const appointment = await appointmentsService.markCompleted(req.auth!.id, req.params.id);
    res.json({ success: true, data: appointment });
  }),
};
