import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createSupabasePool } from "./supabase-pg-pool";

// Pool real de pg cuyos métodos se redirigen a la API SQL de Supabase (HTTPS).
// @prisma/adapter-pg mapea los tipos de Postgres al formato interno de Prisma.
const pool = createSupabasePool();
const adapter = new PrismaPg(pool as any);

// Cliente Prisma que ejecuta el SQL en tu Supabase por HTTPS (sin TCP/pooler).
export const prisma = new PrismaClient({
  adapter: adapter as unknown as any,
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
