import { createClient } from '@/lib/supabase/server'
import { getPortalContext, listAppointmentsForClient } from '@/services/portal'
import { PortalAppointments } from '@/components/PortalAppointments'

export default async function PortalAppointmentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const ctx = user ? await getPortalContext(supabase, user.id) : null
  if (!ctx) {
    return (
      <p className="card-surface p-8 text-center text-sm text-[var(--text-3)] mt-8">
        Este correo no está asociado a ninguna cita.
      </p>
    )
  }

  const appointments = await listAppointmentsForClient(supabase, ctx.client.id)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-semibold text-[var(--text-1)]">Mis citas</h1>
        <p className="text-sm text-[var(--text-3)]">
          Puedes reagendar, cancelar o pagar por adelantado.
        </p>
      </div>
      <PortalAppointments initialAppointments={appointments} timezone={ctx.business.timezone} />
    </div>
  )
}
