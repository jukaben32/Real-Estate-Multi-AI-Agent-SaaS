import { z } from "zod";

// Logged by the voice AI orchestrator at the end of each call
export const createCallLogSchema = z.object({
  aiAgentId: z.string().uuid(),
  propertyId: z.string().uuid().optional(),
  callerPhone: z.string().optional(),
  callerName: z.string().optional(),
  direction: z.enum(["INBOUND", "OUTBOUND"]).default("INBOUND"),
  durationSeconds: z.number().int().min(0).default(0),
  outcome: z.enum(["INFO_ONLY", "APPOINTMENT_BOOKED", "TRANSFERRED_TO_HUMAN", "NO_ANSWER", "VOICEMAIL"]).default("INFO_ONLY"),
  transcript: z.string().optional(),
  recordingUrl: z.string().url().optional(),
});
