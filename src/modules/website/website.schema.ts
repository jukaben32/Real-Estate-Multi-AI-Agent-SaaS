import { z } from "zod";

export const upsertWebsiteSchema = z.object({
  subdomain: z.string().min(3).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers and hyphens only"),
  themeColor: z.string().optional(),
  fontFamily: z.string().optional(),
  heroImage: z.string().url().optional(),
  heroText: z.string().optional(),
  aiAgentId: z.string().uuid().optional(),
  config: z.record(z.any()).optional(),
});
