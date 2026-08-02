'use client'

import { useState } from 'react'
import type { PortalAppointment } from '@/services/portal'

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-[var(--teal-50)] text-[var(--teal-700)]',
  pending_confirmation: 'bg-[var(--gold)]/15 text-[var(--gold)]',
  completed: 'bg-[var(--teal-50)] text-[var(--teal-800)]',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-[var(--bg-page)] text-[var(--text-3)]',
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Confirmada',
  pending_confirmation: 'Pendiente de confirmación',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asististe',
}

const PAYMENT_LABELS: Record<string, string> = {
  pending: 'Pago iniciado',
  paid: 'Pagada',
  cash: 'Pago en efectivo',
  refunded: 'Reembolsada',
}

function fmt(iso: string, timezone?: string) {
  try {
    return new Intl.DateTimeFormat('es-DO', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: timezone,
    }).format(new Date(iso))
  } catch {
    return new Date(iso).toLocaleString('es-DO')
  }
}

/** Convierte un ISO a `YYYY-MM-DDTHH:mm` para un <input type="datetime-local">. */
function toLocalInput(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function PortalAppointments({
  initialAppointments,
  timezone,
}: {
  initialAppointments: PortalAppointment[]
  timezone?: string
}) {
  const [appointments, setAppointments] = useState(initialAppointments)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newDate, setNewDate] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function patch(updated: PortalAppointment) {
    setAppointments((prev) =>
      prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
    )
  }

  async function submitReschedule(id: string) {
    if (!newDate) return
    setBusyId(id)
    setError(null)

    const res = await fetch(`/api/appointments/${id}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: new Date(newDate).toISOString() }),
    })
    const data = await res.json()
    setBusyId(null)

    if (!res.ok) {
      setError(data.error ?? 'No se pudo reagendar')
      return
    }
    patch(data.appointment)
    setEditingId(null)
    setNewDate('')
  }

  async function cancel(id: string) {
    if (!confirm('¿Seguro que quieres cancelar esta cita?')) return
    setBusyId(id)
    setError(null)

    const res = await fetch(`/api/appointments/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Cancelada por el cliente desde el portal' }),
    })
    const data = await res.json()
    setBusyId(null)

    if (!res.ok) {
      setError(data.error ?? 'No se pudo cancelar')
      return
    }
    patch(data.appointment)
  }

  async function pay(id: string) {
    setBusyId(id)
    setError(null)

    const res = await fetch(`/api/appointments/${id}/checkout`, { method: 'POST' })
    const data = await res.json()

    if (!res.ok || !data.url) {
      setBusyId(null)
      setError(data.error ?? 'No se pudo iniciar el pago')
      return
    }
    window.location.href = data.url
  }

  if (appointments.length === 0) {
    return (
      <div className="card-surface p-8 text-center">
        <p className="text-sm text-[var(--text-3)]">Todavía no tienes citas registradas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="card-surface p-3 text-sm text-red-600 border border-red-200">{error}</p>
      )}

      {appointments.map((appt) => {
        const active = ['scheduled', 'pending_confirmation'].includes(appt.status)
        const future = new Date(appt.scheduled_at).getTime() > Date.now()
        const canPay =
          active && Number(appt.payment_amount) > 0 && appt.payment_status !== 'paid'

        return (
          <div key={appt.id} className="card-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-[var(--text-1)]">
                  {fmt(appt.scheduled_at, timezone)}
                </p>
                {appt.listing_title && (
                  <p className="text-sm text-[var(--text-3)] truncate">{appt.listing_title}</p>
                )}
                {appt.listing_address && (
                  <p className="text-xs text-[var(--text-3)] truncate">{appt.listing_address}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className={`badge border-transparent ${STATUS_STYLES[appt.status] ?? ''}`}>
                  {STATUS_LABELS[appt.status] ?? appt.status}
                </span>
                {PAYMENT_LABELS[appt.payment_status] && (
                  <span className="badge border-transparent bg-[var(--bg-page)] text-[var(--text-3)]">
                    {PAYMENT_LABELS[appt.payment_status]}
                  </span>
                )}
              </div>
            </div>

            {appt.status === 'pending_confirmation' && appt.requested_scheduled_at && (
              <p className="mt-2 text-xs text-[var(--text-3)]">
                Pediste moverla al {fmt(appt.requested_scheduled_at, timezone)}. Esperando
                confirmación.
              </p>
            )}

            {active && future && (
              <div className="mt-3 pt-3 border-t border-[var(--border)] flex flex-wrap gap-2">
                {editingId === appt.id ? (
                  <div className="flex flex-wrap items-center gap-2 w-full">
                    <input
                      type="datetime-local"
                      value={newDate || toLocalInput(appt.scheduled_at)}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="input-field w-auto"
                    />
                    <button
                      className="btn-primary"
                      disabled={busyId === appt.id}
                      onClick={() => submitReschedule(appt.id)}
                    >
                      {busyId === appt.id ? '…' : 'Solicitar'}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setEditingId(null)
                        setNewDate('')
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setEditingId(appt.id)
                        setNewDate(toLocalInput(appt.scheduled_at))
                      }}
                    >
                      Reagendar
                    </button>
                    {canPay && (
                      <button
                        className="btn-primary"
                        disabled={busyId === appt.id}
                        onClick={() => pay(appt.id)}
                      >
                        {busyId === appt.id ? '…' : `Pagar ${appt.payment_amount}`}
                      </button>
                    )}
                    <button
                      className="btn-secondary"
                      disabled={busyId === appt.id}
                      onClick={() => cancel(appt.id)}
                    >
                      Cancelar cita
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
