import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { Appointment, Client } from '@/types'

type DB = SupabaseClient<Database>

export interface PortalContext {
  client: Client
  business: {
    id: string
    name: string
    logo_url: string | null
    phone: string | null
    contact_email: string | null
    address: string | null
    timezone: string
  }
}

/**
 * Un mismo correo puede ser cliente de varios negocios (un registro en
 * `clients` por negocio). Devolvemos todos los contextos y dejamos que la UI
 * elija; en la práctica casi siempre habrá uno solo.
 */
export async function getPortalContexts(supabase: DB, authUserId: string): Promise<PortalContext[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*, businesses(id, name, logo_url, phone, contact_email, address, timezone)')
    .eq('auth_user_id', authUserId)
    .order('created_at', { ascending: true })
  if (error) throw error

  const rows = (data ?? []) as unknown as Array<
    Client & { businesses: PortalContext['business'] | null }
  >

  return rows
    .map(({ businesses, ...client }) =>
      businesses ? { client: client as Client, business: businesses } : null
    )
    .filter((ctx): ctx is PortalContext => ctx !== null)
}

export async function getPortalContext(supabase: DB, authUserId: string): Promise<PortalContext | null> {
  const contexts = await getPortalContexts(supabase, authUserId)
  return contexts[0] ?? null
}

export interface PortalAppointment extends Appointment {
  listing_title: string | null
  listing_address: string | null
}

export async function listAppointmentsForClient(
  supabase: DB,
  clientId: string
): Promise<PortalAppointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, listings(title, address_line)')
    .eq('client_id', clientId)
    .order('scheduled_at', { ascending: false })
  if (error) throw error

  const rows = (data ?? []) as unknown as Array<
    Appointment & { listings: { title: string | null; address_line: string | null } | null }
  >

  return rows.map(({ listings, ...appt }) => ({
    ...(appt as Appointment),
    listing_title: listings?.title ?? null,
    listing_address: listings?.address_line ?? null,
  }))
}

/** Marca la última visita al portal — útil para saber si el cliente lo usa. */
export async function touchPortalSeen(supabase: DB, clientId: string): Promise<void> {
  await supabase
    .from('clients')
    .update({ portal_last_seen_at: new Date().toISOString() })
    .eq('id', clientId)
}

export function splitAppointments(appointments: PortalAppointment[]) {
  const now = Date.now()
  const upcoming = appointments
    .filter((a) => ['scheduled', 'pending_confirmation'].includes(a.status) && new Date(a.scheduled_at).getTime() >= now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
  const past = appointments.filter((a) => !upcoming.includes(a))
  return { upcoming, past }
}
