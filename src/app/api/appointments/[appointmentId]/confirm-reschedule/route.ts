import { NextResponse } from 'next/server'
import { requireBusiness, isErr } from '@/lib/api/auth'
import { resolveReschedule } from '@/services/appointments'
import { sendRescheduleConfirmedEmail } from '@/services/email'

// POST { decision: 'approve' | 'reject' } — el agente resuelve el pendiente.
export async function POST(request: Request, { params }: { params: { appointmentId: string } }) {
  const ctx = await requireBusiness()
  if (isErr(ctx)) return NextResponse.json({ error: ctx.error }, { status: 401 })

  const { decision } = await request.json()
  if (decision !== 'approve' && decision !== 'reject') {
    return NextResponse.json({ error: 'La decisión debe ser approve o reject' }, { status: 400 })
  }

  try {
    const appointment = await resolveReschedule(
      ctx.supabase,
      ctx.business.id,
      params.appointmentId,
      decision
    )

    if (decision === 'approve' && appointment.client_id) {
      const { data: client } = await ctx.supabase
        .from('clients')
        .select('name, email')
        .eq('id', appointment.client_id)
        .maybeSingle()

      const { data: listing } = appointment.listing_id
        ? await ctx.supabase.from('listings').select('title').eq('id', appointment.listing_id).maybeSingle()
        : { data: null }

      await sendRescheduleConfirmedEmail({
        to: client?.email ?? '',
        clientName: client?.name ?? 'cliente',
        brand: { businessName: ctx.business.name, logoUrl: ctx.business.logo_url },
        scheduledAt: appointment.scheduled_at,
        listingTitle: listing?.title ?? null,
        timezone: ctx.business.timezone,
      })
    }

    return NextResponse.json({ appointment })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo resolver el reagendamiento'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
