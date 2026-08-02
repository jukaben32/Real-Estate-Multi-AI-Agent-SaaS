import { NextResponse } from 'next/server'
import { requirePortalClient, isErr } from '@/lib/api/auth'
import { requestReschedule } from '@/services/appointments'
import { sendRescheduleRequestedEmail } from '@/services/email'

// POST — el cliente propone una fecha nueva desde el portal.
export async function POST(request: Request, { params }: { params: { appointmentId: string } }) {
  const ctx = await requirePortalClient()
  if (isErr(ctx)) return NextResponse.json({ error: ctx.error }, { status: 401 })

  const { scheduledAt } = await request.json()
  if (!scheduledAt) return NextResponse.json({ error: 'Falta la nueva fecha' }, { status: 400 })

  try {
    const before = await ctx.supabase
      .from('appointments')
      .select('scheduled_at, listings(title)')
      .eq('id', params.appointmentId)
      .eq('client_id', ctx.client.id)
      .single()

    const appointment = await requestReschedule(
      ctx.supabase,
      params.appointmentId,
      ctx.client.id,
      scheduledAt
    )

    const brand = {
      businessName: ctx.business.name,
      logoUrl: ctx.business.logo_url,
      portalUrl: '/portal',
    }
    const listingTitle =
      (before.data as unknown as { listings: { title: string | null } | null } | null)?.listings
        ?.title ?? null
    const previousAt = before.data?.scheduled_at ?? appointment.scheduled_at

    await Promise.all([
      sendRescheduleRequestedEmail({
        to: ctx.business.contact_email ?? '',
        recipient: 'business',
        clientName: ctx.client.name,
        brand,
        previousAt,
        requestedAt: scheduledAt,
        listingTitle,
        timezone: ctx.business.timezone,
      }),
      sendRescheduleRequestedEmail({
        to: ctx.client.email ?? '',
        recipient: 'client',
        clientName: ctx.client.name,
        brand,
        previousAt,
        requestedAt: scheduledAt,
        listingTitle,
        timezone: ctx.business.timezone,
      }),
    ])

    return NextResponse.json({ appointment })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo reagendar'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
