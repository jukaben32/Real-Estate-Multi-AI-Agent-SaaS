import { createClient } from '@/lib/supabase/server'
import { getPortalContext } from '@/services/portal'
import { listTicketsForClient } from '@/services/support'
import { PortalSupport } from '@/components/PortalSupport'

export default async function PortalSupportPage() {
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

  const tickets = await listTicketsForClient(supabase, ctx.client.id)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-semibold text-[var(--text-1)]">Soporte</h1>
        <p className="text-sm text-[var(--text-3)]">
          Escribe al equipo de {ctx.business.name} y te responderán por aquí.
        </p>
      </div>
      <PortalSupport initialTickets={tickets} />
    </div>
  )
}
