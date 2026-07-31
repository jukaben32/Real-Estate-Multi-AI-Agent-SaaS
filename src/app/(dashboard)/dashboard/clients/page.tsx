import { createClient } from '@/lib/supabase/server'
import { getBusinessForOwner } from '@/services/businesses'
import { listClientsForBusiness } from '@/services/clients'
import { ClientsTable } from '@/components/ClientsTable'

export default async function ClientsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const business = await getBusinessForOwner(supabase, user!.id)
  if (!business) return null

  const clients = await listClientsForBusiness(supabase, business.id)

  return (
    <div className="card-surface p-4">
      <div className="mb-4">
        <h1 className="font-semibold text-lg">Clients</h1>
        <p className="text-sm text-[var(--text-3)]">{clients.length} leads captured by your AI agents</p>
      </div>
      <ClientsTable initialClients={clients} />
    </div>
  )
}
