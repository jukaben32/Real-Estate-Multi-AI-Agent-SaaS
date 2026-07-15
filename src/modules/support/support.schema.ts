import { z } from "zod";

export const createTicketSchema = z.object({
  subject: z.string().min(2),
  message: z.string().min(1),
});

export const createMessageSchema = z.object({
  message: z.string().min(1),
  attachmentUrl: z.string().url().optional(),
});
