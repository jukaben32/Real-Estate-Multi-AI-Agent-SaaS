import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { PlanId, BusinessSubscription } from '@/types'
import { PLAN_LIMITS, WEBSITE_BUILDER_PRICE_USD } from '@/constants'

type DB = SupabaseClient<Database>

export function getStripeClient() {
  // No pinned apiVersion — defer to the account's default so this doesn't need
  // updating every time the installed `stripe` package's typed version bumps.
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

// Stripe Prices are looked up by plan at call time instead of being hardcoded
// so the $ amounts in .env stay the single source of truth for pricing.
async function findOrCreatePrice(
  stripe: Stripe,
  productKey: string,
  productName: string,
  unitAmountUsd: number
): Promise<string> {
  const products = await stripe.products.search({ query: `metadata['key']:'${productKey}'` })
  let product = products.data[0]
  if (!product) {
    product = await stripe.products.create({ name: productName, metadata: { key: productKey } })
  }

  const prices = await stripe.prices.list({ product: product.id, active: true })
  const existing = prices.data.find((p) => p.unit_amount === unitAmountUsd * 100)
  if (existing) return existing.id

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: unitAmountUsd * 100,
    currency: 'usd',
    recurring: { interval: 'month' },
  })
  return price.id
}

export async function createCheckoutSession(opts: {
  businessId: string
  ownerEmail: string
  plan: Exclude<PlanId, 'free'>
  successUrl: string
  cancelUrl: string
}) {
  const stripe = getStripeClient()
  const planConfig = PLAN_LIMITS[opts.plan]
  const priceId = await findOrCreatePrice(
    stripe,
    `plan_${opts.plan}`,
    `${planConfig.name} Plan`,
    planConfig.priceUsd
  )

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: opts.ownerEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    metadata: { businessId: opts.businessId, plan: opts.plan },
  })
}

export async function createWebsiteBuilderCheckoutSession(opts: {
  businessId: string
  ownerEmail: string
  successUrl: string
  cancelUrl: string
}) {
  const stripe = getStripeClient()
  const priceId = await findOrCreatePrice(
    stripe,
    'addon_website_builder',
    'Website Builder Add-on',
    WEBSITE_BUILDER_PRICE_USD
  )

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: opts.ownerEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    metadata: { businessId: opts.businessId, addon: 'website_builder' },
  })
}

export async function createBillingPortalSession(opts: { stripeCustomerId: string; returnUrl: string }) {
  const stripe = getStripeClient()
  return stripe.billingPortal.sessions.create({
    customer: opts.stripeCustomerId,
    return_url: opts.returnUrl,
  })
}

// Applies a Stripe webhook event to business_subscriptions. Called from
// the service-role webhook route — never from a user-session client.
export async function syncSubscriptionFromStripeEvent(
  supabase: DB,
  event: Stripe.Event
): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const businessId = session.metadata?.businessId
      if (!businessId) return

      if (session.metadata?.addon === 'website_builder') {
        await supabase
          .from('business_subscriptions')
          .update({ website_builder_enabled: true })
          .eq('business_id', businessId)
        return
      }

      const plan = (session.metadata?.plan as PlanId) ?? 'pro'
      await supabase
        .from('business_subscriptions')
        .update({
          plan,
          status: 'active',
          stripe_customer_id: String(session.customer),
          stripe_subscription_id: String(session.subscription),
        })
        .eq('business_id', businessId)
      break
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription & { current_period_end?: number }
      // `current_period_end` moved from the subscription to its first item in
      // newer Stripe API versions — read from whichever one the account is on.
      const periodEnd = subscription.current_period_end ?? subscription.items.data[0]?.current_period_end
      await supabase
        .from('business_subscriptions')
        .update({
          status: mapStripeStatus(subscription.status),
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          cancel_at_period_end: subscription.cancel_at_period_end,
          ...(event.type === 'customer.subscription.deleted' ? { plan: 'free' as const } : {}),
        })
        .eq('stripe_subscription_id', subscription.id)
      break
    }
    default:
      break
  }
}

// Stripe has a few subscription statuses (unpaid, incomplete_expired, paused)
// our narrower business_subscriptions.status enum doesn't track separately —
// collapse them to the closest state we actually branch on in the UI.
function mapStripeStatus(status: Stripe.Subscription.Status): BusinessSubscription['status'] {
  switch (status) {
    case 'active':
    case 'trialing':
    case 'past_due':
    case 'canceled':
    case 'incomplete':
      // Cast needed only because Stripe's type adds a forward-compat escape
      // hatch member here — every real value is already matched above.
      return status as BusinessSubscription['status']
    case 'unpaid':
      return 'past_due'
    case 'incomplete_expired':
      return 'canceled'
    case 'paused':
      return 'canceled'
    default:
      return 'incomplete'
  }
}

// ─── Pago por cita individual (Stripe Checkout, modo `payment`) ─────────────
// NOTA: cobra en la cuenta Stripe de la plataforma. Para que el dinero llegue
// directo a la cuenta del negocio hace falta Stripe Connect; ver PLAN_MEJORAS.

export async function createAppointmentCheckoutSession(opts: {
  appointmentId: string
  businessId: string
  businessName: string
  amountUsd: number
  currency?: string
  customerEmail?: string | null
  description?: string
  successUrl: string
  cancelUrl: string
}) {
  const stripe = getStripeClient()

  return stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: opts.customerEmail ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: opts.currency ?? 'usd',
          unit_amount: Math.round(opts.amountUsd * 100),
          product_data: {
            name: opts.description || `Cita con ${opts.businessName}`,
          },
        },
      },
    ],
    // La metadata es lo que el webhook usa para localizar la cita.
    metadata: {
      kind: 'appointment_payment',
      appointment_id: opts.appointmentId,
      business_id: opts.businessId,
    },
    payment_intent_data: {
      metadata: {
        kind: 'appointment_payment',
        appointment_id: opts.appointmentId,
        business_id: opts.businessId,
      },
    },
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
  })
}

/**
 * Marca la cita como pagada cuando Stripe confirma el checkout.
 * Devuelve la cita actualizada, o null si el evento no era de una cita
 * (por ejemplo, un checkout de suscripción) — así el webhook puede ignorarlo.
 */
export async function markAppointmentPaidFromStripeEvent(
  supabase: DB,
  event: Stripe.Event
): Promise<{ appointmentId: string; amount: number; currency: string } | null> {
  if (event.type !== 'checkout.session.completed') return null

  const session = event.data.object as Stripe.Checkout.Session
  if (session.metadata?.kind !== 'appointment_payment') return null

  const appointmentId = session.metadata.appointment_id
  if (!appointmentId) return null
  if (session.payment_status !== 'paid') return null

  const amount = (session.amount_total ?? 0) / 100
  const currency = session.currency ?? 'usd'

  const { error } = await supabase
    .from('appointments')
    .update({
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
      payment_amount: amount,
      payment_currency: currency,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === 'string' ? session.payment_intent : null,
    })
    .eq('id', appointmentId)
  if (error) throw error

  return { appointmentId, amount, currency }
}
