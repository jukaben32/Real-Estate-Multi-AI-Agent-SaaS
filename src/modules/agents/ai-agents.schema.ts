import { z } from "zod";

export const createAIAgentSchema = z.object({
  name: z.string().min(2),
  specialty: z.string().optional(),
  greetingScript: z.string().optional(),
  voiceId: z.string().optional(),
  personality: z.string().optional(),
});

export const updateAIAgentSchema = createAIAgentSchema.partial().extend({
  active: z.boolean().optional(),
});
