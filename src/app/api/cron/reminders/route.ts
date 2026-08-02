import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAppointmentReminderEmail, appUrl } from '@/services/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Recordatorio 24h antes. Pensado para Vercel Cron (ver vercel.json), pero
// sirve cualquier scheduler que haga GET con el header de autorización.
// Idempotente: `reminder_sent_at` evita reenvíos en pasadas sucesivas.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  const supabase = createAdminClient()
  const now = Date.now()
  // Ventana de 24h a 25h: con una ejecución horaria cada cita cae en ella una
  // sola vez, y si una pasada falla la siguiente todavía la alcanza.
  const from = new Date(now + 24 * 3600_000).toISOString()
  const to = new Date(now + 25 * 3600_000).toISOString()

  const { data, error } = await supabase
    .from('appointments')
    .select('*, businesses(name, logo_url, timezone), clients(name, email), listings(title, address_line)')
    .eq('status', 'scheduled')
    .is('reminder_sent_at', null)
    .gte('scheduled_at', from)
    .lte('scheduled_at', to)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data ?? []) as unknown as Array<{
    id: string
    scheduled_at: string
    businesses: { name: string; logo_url: string | null; timezone: string } | null
    clients: { name: string; email: string | null } | null
    listings: { title: string | null; address_line: string | null } | null
  }>

  let sent = 0
  for (const row of rows) {
    if (!row.clients?.email || !row.businesses) continue

    await sendAppointmentReminderEmail({
      to: row.clients.email,
      clientName: row.clients.name,
      brand: {
        businessName: row.businesses.name,
        logoUrl: row.businesses.logo_url,
        portalUrl: appUrl('/portal'),
      },
      scheduledAt: row.scheduled_at,
      listingTitle: row.listings?.title ?? null,
      address: row.listings?.address_line ?? null,
      timezone: row.businesses.timezone,
    })

    await supabase
      .from('appointments')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', row.id)

    sent++
  }

  return NextResponse.json({ checked: rows.length, sent })
}
