'use client'

import { useState } from 'react'
import type { BusinessSubscription, PlanId } from '@/types'
import { PLAN_LIMITS } from '@/constants'

export function PlanBilling({ subscription }: { subscription: BusinessSubscription | null }) {
  const [loadingPlan, setLoadingPlan] = useState<PlanId | 'portal' | null>(null)
  const currentPlan: PlanId = (subscription?.plan as PlanId) ?? 'free'

  async function upgrade(plan: Exclude<PlanId, 'free'>) {
    setLoadingPlan(plan)
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    const { url } = await res.json()
    if (url) window.location.href = url
    else setLoadingPlan(null)
  }

  async function openPortal() {
    setLoadingPlan('portal')
    const res = await fetch('/api/billing/portal', { method: 'POST' })
    const body = await res.json()
    if (body.url) window.location.href = body.url
    else setLoadingPlan(null)
  }

  return (
    <div className="space-y-4">
      <div className="card-surface p-4">
        <p className="text-sm text-[var(--text-3)]">Current plan</p>
        <p className="text-2xl font-semibold capitalize">{PLAN_LIMITS[currentPlan].name}</p>
        <p className="text-sm text-[var(--text-3)] mt-1 capitalize">
          Status: {subscription?.status ?? 'active'}
          {subscription?.cancel_at_period_end && ' · cancels at period end'}
        </p>
        {subscription?.stripe_customer_id && (
          <button className="btn-secondary mt-3" onClick={openPortal} disabled={loadingPlan === 'portal'}>
            {loadingPlan === 'portal' ? 'Opening…' : 'Manage billing'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.values(PLAN_LIMITS) as (typeof PLAN_LIMITS)[PlanId][]).map((plan) => (
          <div key={plan.id} className={`card-surface p-4 ${plan.id === currentPlan ? 'card-glow' : ''}`}>
            <p className="font-semibold">{plan.name}</p>
            <p className="text-2xl font-semibold mt-1">
              ${plan.priceUsd}
              <span className="text-sm font-normal text-[var(--text-3)]">/mo</span>
            </p>
            <ul className="text-sm text-[var(--text-3)] mt-2 space-y-1">
              <li>{plan.agentLimit === 0 ? 'Unlimited' : plan.agentLimit} AI agents</li>
              <li>{plan.bookingLimit === 0 ? 'Unlimited' : plan.bookingLimit} bookings/mo</li>
            </ul>
            {plan.id !== 'free' && plan.id !== currentPlan && (
              <button
                className="btn-primary mt-3 w-full"
                onClick={() => upgrade(plan.id as Exclude<PlanId, 'free'>)}
                disabled={loadingPlan === plan.id}
              >
                {loadingPlan === plan.id ? 'Redirecting…' : `Upgrade to ${plan.name}`}
              </button>
            )}
            {plan.id === currentPlan && (
              <p className="mt-3 text-xs font-semibold text-[var(--teal-700)]">Current plan</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
