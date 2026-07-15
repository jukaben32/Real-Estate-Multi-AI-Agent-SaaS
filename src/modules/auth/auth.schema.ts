import { z } from "zod";

export const registerAgentSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  companyName: z.string().optional(),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Client creates a portal account using the SAME email they booked their appointment with
export const registerClientSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
