/**
 * Config del adapter HTTP para Supabase.
 * Lee el access token y el ref del proyecto desde variables de entorno.
 */
export const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
export const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? "elrvxpgxlnyvfsfufnoq";
