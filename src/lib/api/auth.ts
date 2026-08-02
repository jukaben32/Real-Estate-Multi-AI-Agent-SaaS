import { createClient } from '@/lib/supabase/server'
import { getBusinessForOwner } from '@/services/businesses'
import { getPortalContext, type PortalContext } from '@/services/portal'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { Business } from '@/types'

type DB = SupabaseClient<Database>

export type BusinessCtx = { supabase: DB; business: Business; userId: string }
export type PortalCtx = { supabase: DB; userId: string } & PortalContext

/** Contexto del dueño del negocio (panel del agente). */
export async function requireBusiness(): Promise<BusinessCtx | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  const business = await getBusinessForOwner(supabase, user.id)
  if (!business) return { error: 'Este usuario no tiene un negocio' }
  return { supabase, business, userId: user.id }
}

/** Contexto del cliente final (portal). */
export async function requirePortalClient(): Promise<PortalCtx | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  const ctx = await getPortalContext(supabase, user.id)
  if (!ctx) return { error: 'No hay un perfil de cliente para este usuario' }
  return { supabase, userId: user.id, ...ctx }
}

export function isErr<T>(v: T | { error: string }): v is { error: string } {
  return typeof v === 'object' && v !== null && 'error' in v
}
