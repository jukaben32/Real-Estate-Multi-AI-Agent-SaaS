import { NextResponse } from 'next/server'
import {
  getStripeClient,
  syncSubscriptionFromStripeEvent,
  markAppointmentPaidFromStripeEvent,
} from '@/services/billing'
import { sendPaymentReceivedEmail } from '@/services/email'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  const stripe = getStripeClient()
  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Suscripciones del SaaS — comportamiento existente, sin cambios.
  await syncSubscriptionFromStripeEvent(supabase, event)

  // Pagos de citas individuales. Devuelve null si el evento no es de una cita,
  // así que los eventos de suscripción pasan de largo sin efecto.
  try {
    const paid = await markAppointmentPaidFromStripeEvent(supabase, event)
    if (paid) {
      const { data: appointment } = await supabase
        .from('appointments')
        .select('*, businesses(name, logo_url, contact_email, timezone), clients(name, email), listings(title)')
        .eq('id', paid.appointmentId)
        .maybeSingle()

      if (appointment) {
        const joined = appointment as unknown as {
          businesses: {
            name: string
            logo_url: string | null
            contact_email: string | null
            timezone: string
          } | null
          clients: { name: string; email: string | null } | null
          listings: { title: string | null } | null
        }
        const business = joined.businesses
        const client = joined.clients
        const listing = joined.listings
        const brand = {
          businessName: business?.name ?? 'Tu inmobiliaria',
          logoUrl: business?.logo_url ?? null,
        }

        await Promise.all([
          sendPaymentReceivedEmail({
            to: client?.email ?? '',
            recipient: 'client',
            clientName: client?.name ?? 'cliente',
            brand,
            amount: paid.amount,
            currency: paid.currency,
            scheduledAt: appointment.scheduled_at,
            listingTitle: listing?.title ?? null,
            timezone: business?.timezone,
          }),
          sendPaymentReceivedEmail({
            to: business?.contact_email ?? '',
            recipient: 'business',
            clientName: client?.name ?? 'cliente',
            brand,
            amount: paid.amount,
            currency: paid.currency,
            scheduledAt: appointment.scheduled_at,
            listingTitle: listing?.title ?? null,
            timezone: business?.timezone,
          }),
        ])

        await supabase.from('notifications').insert({
          business_id: appointment.business_id,
          type: 'payment_received',
          title: 'Pago de cita recibido',
          body: `${client?.name ?? 'Un cliente'} pagó su cita por adelantado`,
        })
      }
    }
  } catch (err) {
    // Nunca devolvemos 500 a Stripe por un fallo secundario: eso provoca
    // reintentos infinitos del evento. Lo registramos y seguimos.
    console.error('[stripe-webhook] fallo procesando pago de cita:', err)
  }

  return NextResponse.json({ received: true })
}
