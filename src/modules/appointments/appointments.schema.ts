import { z } from "zod";

// Used both by the AI calling agent (service-key auth) and the public website widget
// to book a viewing/consultation. Creates the Client record if it doesn't exist yet,
// exactly like the "book an appointment" flow in the walkthrough.
export const bookAppointmentSchema = z.object({
  propertyId: z.string().uuid(),
  type: z.enum(["VIEWING", "CONSULTATION"]).default("VIEWING"),
  scheduledDate: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(240).default(45),
  notes: z.string().optional(),
  client: z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
    budgetRange: z.string().optional(),
    financing: z.enum(["PRE_APPROVED", "PLANNING_UPFRONT", "NEEDS_FINANCING", "NOT_SPECIFIED"]).optional(),
  }),
});

export const rescheduleSchema = z.object({
  scheduledDate: z.string().datetime(),
});

export const paySchema = z.object({
  method: z.enum(["CASH", "ONLINE"]),
});

export const availableSlotsQuerySchema = z.object({
  propertyId: z.string().uuid(),
  date: z.string(), // YYYY-MM-DD
});

export const listAppointmentsQuerySchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "RESCHEDULE_REQUESTED", "COMPLETED"]).optional(),
  propertyId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
