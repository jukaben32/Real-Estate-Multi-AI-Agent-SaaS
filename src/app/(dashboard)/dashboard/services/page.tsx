import { createClient } from '@/lib/supabase/server'
import { getBusinessForOwner } from '@/services/businesses'
import { listServicesForBusiness } from '@/services/businessServices'
import { ServicesManager } from '@/components/ServicesManager'

export default async function ServicesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const business = await getBusinessForOwner(supabase, user!.id)
  if (!business) return null

  const services = await listServicesForBusiness(supabase, business.id)

  return (
    <div className="card-surface p-4">
      <div className="mb-4">
        <h1 className="font-semibold text-lg">Services</h1>
        <p className="text-sm text-[var(--text-3)]">
          What your AI agents can offer callers, independent of any single listing.
        </p>
      </div>
      <ServicesManager initialServices={services} />
    </div>
  )
}
