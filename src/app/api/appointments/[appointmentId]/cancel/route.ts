import { NextResponse } from 'next/server'
import { requireBusiness, requirePortalClient, isErr } from '@/lib/api/auth'
import { cancelAppointment } from '@/services/appointments'
import { sendAppointmentCancelledEmail } from '@/services/email'

// POST — cancela la cita. Sirve tanto al agente como al cliente del portal.
export async function POST(request: Request, { params }: { params: { appointmentId: string } }) {
  const { reason } = await request.json().catch(() => ({ reason: null }))

  const biz = await requireBusiness()
  if (!isErr(biz)) {
    const appointment = await cancelAppointment(biz.supabase, params.appointmentId, 'business', {
      businessId: biz.business.id,
      reason,
    })

    if (appointment.client_id) {
      const { data: client } = await biz.supabase
        .from('clients')
        .select('name, email')
        .eq('id', appointment.client_id)
        .maybeSingle()
      await sendAppointmentCancelledEmail({
        to: client?.email ?? '',
        recipient: 'client',
        clientName: client?.name ?? 'cliente',
        brand: { businessName: biz.business.name, logoUrl: biz.business.logo_url },
        scheduledAt: appointment.scheduled_at,
        reason,
        timezone: biz.business.timezone,
      })
    }
    return NextResponse.json({ appointment })
  }

  const portal = await requirePortalClient()
  if (isErr(portal)) return NextResponse.json({ error: portal.error }, { status: 401 })

  try {
    const appointment = await cancelAppointment(portal.supabase, params.appointmentId, 'client', {
      clientId: portal.client.id,
      reason,
    })

    const brand = { businessName: portal.business.name, logoUrl: portal.business.logo_url }
    await Promise.all([
      sendAppointmentCancelledEmail({
        to: portal.business.contact_email ?? '',
        recipient: 'business',
        clientName: portal.client.name,
        brand,
        scheduledAt: appointment.scheduled_at,
        reason,
        timezone: portal.business.timezone,
      }),
      sendAppointmentCancelledEmail({
        to: portal.client.email ?? '',
        recipient: 'client',
        clientName: portal.client.name,
        brand,
        scheduledAt: appointment.scheduled_at,
        reason,
        timezone: portal.business.timezone,
      }),
    ])

    return NextResponse.json({ appointment })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo cancelar la cita'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
