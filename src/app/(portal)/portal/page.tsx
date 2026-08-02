import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getPortalContext, listAppointmentsForClient, splitAppointments, touchPortalSeen } from '@/services/portal'

export default async function PortalHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const ctx = user ? await getPortalContext(supabase, user.id) : null

  // Sesión válida pero sin ficha de cliente: pasa si alguien entra con un
  // correo que el negocio nunca registró. Mejor decirlo que mostrar vacío.
  if (!ctx) {
    return (
      <div className="card-surface p-8 text-center mt-8">
        <h1 className="font-display text-xl font-semibold text-[var(--text-1)] mb-2">
          No encontramos tus datos
        </h1>
        <p className="text-sm text-[var(--text-3)]">
          Entraste correctamente, pero este correo no está asociado a ninguna cita. Usa el mismo
          correo que diste al reservar, o contacta a la inmobiliaria.
        </p>
      </div>
    )
  }

  const appointments = await listAppointmentsForClient(supabase, ctx.client.id)
  const { upcoming, past } = splitAppointments(appointments)
  await touchPortalSeen(supabase, ctx.client.id)

  const next = upcoming[0]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--text-1)]">
          Hola, {ctx.client.name}
        </h1>
        <p className="text-sm text-[var(--text-3)]">
          Aquí gestionas tus citas con {ctx.business.name}.
        </p>
      </div>

      <div className="card-surface p-5">
        <p className="section-label mb-2">Tu próxima cita</p>
        {next ? (
          <>
            <p className="font-display text-lg font-semibold text-[var(--text-1)]">
              {new Intl.DateTimeFormat('es-DO', {
                dateStyle: 'full',
                timeStyle: 'short',
                timeZone: ctx.business.timezone,
              }).format(new Date(next.scheduled_at))}
            </p>
            {next.listing_title && (
              <p className="text-sm text-[var(--text-3)]">{next.listing_title}</p>
            )}
            {next.status === 'pending_confirmation' && (
              <p className="text-xs text-[var(--gold)] mt-1">
                Pendiente de confirmación por la inmobiliaria.
              </p>
            )}
            <Link href="/portal/appointments" className="btn-primary inline-block mt-4">
              Gestionar cita
            </Link>
          </>
        ) : (
          <p className="text-sm text-[var(--text-3)]">No tienes citas próximas.</p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Link href="/portal/appointments" className="card-surface p-4 hover:shadow-md transition-shadow">
          <p className="font-medium text-[var(--text-1)]">Mis citas</p>
          <p className="text-sm text-[var(--text-3)]">
            {upcoming.length} próxima{upcoming.length === 1 ? '' : 's'} · {past.length} pasada
            {past.length === 1 ? '' : 's'}
          </p>
        </Link>
        <Link href="/portal/support" className="card-surface p-4 hover:shadow-md transition-shadow">
          <p className="font-medium text-[var(--text-1)]">Soporte</p>
          <p className="text-sm text-[var(--text-3)]">Escríbele al equipo de {ctx.business.name}.</p>
        </Link>
      </div>

      {(ctx.business.phone || ctx.business.contact_email) && (
        <div className="card-surface p-4">
          <p className="section-label mb-1">Contacto directo</p>
          <p className="text-sm text-[var(--text-3)]">
            {ctx.business.phone}
            {ctx.business.phone && ctx.business.contact_email ? ' · ' : ''}
            {ctx.business.contact_email}
          </p>
        </div>
      )}
    </div>
  )
}
