import { createClient } from '@/lib/supabase/server'
import { getBusinessForOwner } from '@/services/businesses'
import { listTicketsForBusiness } from '@/services/support'
import { SupportTicketsManager } from '@/components/SupportTicketsManager'

export default async function SupportPage({
  searchParams,
}: {
  searchParams: { ticket?: string }
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const business = await getBusinessForOwner(supabase, user!.id)
  if (!business) return null

  const tickets = await listTicketsForBusiness(supabase, business.id)
  const openCount = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length

  return (
    <div className="card-surface p-5">
      <div className="mb-4">
        <h1 className="font-display font-semibold text-xl text-[var(--text-1)]">Soporte</h1>
        <p className="text-sm text-[var(--text-3)]">
          {tickets.length} ticket{tickets.length === 1 ? '' : 's'} · {openCount} sin resolver
        </p>
      </div>
      <SupportTicketsManager initialTickets={tickets} initialTicketId={searchParams.ticket} />
    </div>
  )
}
