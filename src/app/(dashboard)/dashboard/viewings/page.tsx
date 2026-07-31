import { createClient } from '@/lib/supabase/server'
import { getBusinessForOwner } from '@/services/businesses'
import { listAppointmentsForBusiness } from '@/services/appointments'
import { ViewingsManager } from '@/components/ViewingsManager'

export default async function ViewingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const business = await getBusinessForOwner(supabase, user!.id)
  if (!business) return null

  const appointments = await listAppointmentsForBusiness(supabase, business.id)

  return (
    <div className="card-surface p-4">
      <div className="mb-4">
        <h1 className="font-semibold text-lg">Viewings</h1>
        <p className="text-sm text-[var(--text-3)]">
          {appointments.length} total ·{' '}
          {appointments.filter((a) => a.status === 'scheduled').length} upcoming
        </p>
      </div>
      <ViewingsManager initialAppointments={appointments} />
    </div>
  )
}
