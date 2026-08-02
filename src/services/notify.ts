import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { Appointment, Client } from '@/types'
import {
  appUrl,
  sendAppointmentConfirmationEmail,
  sendNewLeadEmail,
  sendPortalInviteEmail,
  type EmailBrand,
} from '@/services/email'

type DB = SupabaseClient<Database>

interface BusinessBrandRow {
  name: string
  logo_url: string | null
  contact_email: string | null
  timezone: string
}

async function loadBrand(
  supabase: DB,
  businessId: string
): Promise<{ brand: EmailBrand; row: BusinessBrandRow } | null> {
  const { data } = await supabase
    .from('businesses')
    .select('name, logo_url, contact_email, timezone')
    .eq('id', businessId)
    .maybeSingle()
  if (!data) return null

  return {
    row: data as BusinessBrandRow,
    brand: {
      businessName: data.name,
      logoUrl: data.logo_url,
      portalUrl: appUrl('/portal'),
    },
  }
}

/**
 * Genera un enlace de acceso al portal. Si el cliente aún no tiene usuario en
 * auth (el caso normal: reservó por teléfono con el agente IA), lo crea.
 * Devuelve null si algo falla — la invitación es un extra, no un requisito.
 */
async function buildPortalMagicLink(supabase: DB, email: string): Promise<string | null> {
  const redirectTo = appUrl('/portal/auth/callback')

  async function generate() {
    return supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    })
  }

  try {
    let { data, error } = await generate()

    if (error) {
      // Todavía no existe el usuario: lo creamos ya confirmado y reintentamos.
      await supabase.auth.admin.createUser({ email, email_confirm: true })
      ;({ data, error } = await generate())
      if (error) return null
    }

    return data?.properties?.action_link ?? null
  } catch (err) {
    console.error('[notify] no se pudo generar el enlace al portal:', err)
    return null
  }
}

/** Confirmación al cliente, invitación al portal y aviso al negocio. */
export async function notifyAppointmentBooked(
  supabase: DB,
  opts: { businessId: string; appointment: Appointment; client: Client; listingId?: string }
): Promise<void> {
  try {
    const loaded = await loadBrand(supabase, opts.businessId)
    if (!loaded) return
    const { brand, row } = loaded

    let listingTitle: string | undefined
    let listingAddress: string | null = null
    if (opts.listingId) {
      const { data: listing } = await supabase
        .from('listings')
        .select('title, address_line')
        .eq('id', opts.listingId)
        .maybeSingle()
      listingTitle = listing?.title ?? undefined
      listingAddress = listing?.address_line ?? null
    }

    if (opts.client.email) {
      await sendAppointmentConfirmationEmail({
        to: opts.client.email,
        clientName: opts.client.name,
        businessName: row.name,
        scheduledAt: opts.appointment.scheduled_at,
        listingTitle,
        brand,
        timezone: row.timezone,
        address: listingAddress,
        paymentAmount: opts.appointment.payment_amount,
        paymentCurrency: opts.appointment.payment_currency,
      })

      // Primera reserva y todavía sin cuenta: le mandamos su acceso al portal.
      if (!opts.client.auth_user_id && !opts.client.portal_invited_at) {
        const magicLink = await buildPortalMagicLink(supabase, opts.client.email)
        if (magicLink) {
          await sendPortalInviteEmail({
            to: opts.client.email,
            clientName: opts.client.name,
            brand,
            magicLink,
          })
          await supabase
            .from('clients')
            .update({ portal_invited_at: new Date().toISOString() })
            .eq('id', opts.client.id)
        }
      }
    }

    if (row.contact_email) {
      await sendNewLeadEmail({
        to: row.contact_email,
        clientName: opts.client.name,
        clientPhone: opts.client.phone ?? undefined,
        clientEmail: opts.client.email,
        businessName: row.name,
        brand,
      })
    }
  } catch (err) {
    // Un fallo de email jamás debe tumbar una reserva ya confirmada.
    console.error('[notify] notifyAppointmentBooked falló:', err)
  }
}

/** Aviso al negocio cuando el agente IA captura un lead sin reserva. */
export async function notifyLeadCaptured(
  supabase: DB,
  opts: { businessId: string; client: Client }
): Promise<void> {
  try {
    const loaded = await loadBrand(supabase, opts.businessId)
    if (!loaded?.row.contact_email) return

    await sendNewLeadEmail({
      to: loaded.row.contact_email,
      clientName: opts.client.name,
      clientPhone: opts.client.phone ?? undefined,
      clientEmail: opts.client.email,
      budget: opts.client.budget,
      businessName: loaded.row.name,
      brand: loaded.brand,
    })
  } catch (err) {
    console.error('[notify] notifyLeadCaptured falló:', err)
  }
}
