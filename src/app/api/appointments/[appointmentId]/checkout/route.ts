import { NextResponse } from 'next/server'
import { requirePortalClient, isErr } from '@/lib/api/auth'
import { createAppointmentCheckoutSession } from '@/services/billing'
import { appUrl } from '@/services/email'

// POST — genera la sesión de Stripe Checkout para pagar una cita.
// El importe SIEMPRE sale de `appointments.payment_amount`, que fija el
// agente; el cliente nunca puede enviar un precio propio.
export async function POST(_request: Request, { params }: { params: { appointmentId: string } }) {
  const ctx = await requirePortalClient()
  if (isErr(ctx)) return NextResponse.json({ error: ctx.error }, { status: 401 })

  const { data: appointment, error } = await ctx.supabase
    .from('appointments')
    .select('*, listings(title)')
    .eq('id', params.appointmentId)
    .eq('client_id', ctx.client.id)
    .single()
  if (error || !appointment) {
    return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
  }

  if (appointment.payment_status === 'paid') {
    return NextResponse.json({ error: 'Esta cita ya está pagada' }, { status: 400 })
  }
  if (!appointment.payment_amount || appointment.payment_amount <= 0) {
    return NextResponse.json({ error: 'Esta cita no tiene un importe a pagar' }, { status: 400 })
  }

  const listingTitle = (appointment as unknown as { listings: { title: string | null } | null })
    .listings?.title

  try {
    const session = await createAppointmentCheckoutSession({
      appointmentId: appointment.id,
      businessId: ctx.business.id,
      businessName: ctx.business.name,
      amountUsd: Number(appointment.payment_amount),
      currency: appointment.payment_currency ?? 'usd',
      customerEmail: ctx.client.email,
      description: listingTitle ? `Visita: ${listingTitle}` : undefined,
      successUrl: appUrl('/portal/appointments?pago=ok'),
      cancelUrl: appUrl('/portal/appointments?pago=cancelado'),
    })

    // Deja la cita en "pendiente de pago" mientras el cliente está en Stripe.
    await ctx.supabase
      .from('appointments')
      .update({ payment_status: 'pending', stripe_checkout_session_id: session.id })
      .eq('id', appointment.id)
      .eq('client_id', ctx.client.id)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo iniciar el pago'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
