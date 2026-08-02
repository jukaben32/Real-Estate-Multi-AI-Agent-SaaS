'use client'

import { useMemo, useState } from 'react'
import type { Appointment } from '@/types'
import { APPOINTMENT_STATUSES } from '@/constants'

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-[var(--teal-50)] text-[var(--teal-700)]',
  pending_confirmation: 'bg-[var(--gold)]/15 text-[var(--gold)]',
  completed: 'bg-[var(--teal-50)] text-[var(--teal-800)]',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-[var(--gold)]/15 text-[var(--gold)]',
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendada',
  pending_confirmation: 'Reagendo pendiente',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
}

const PAYMENT_LABELS: Record<string, string> = {
  pending: 'Pago iniciado',
  paid: 'Pagada',
  cash: 'Efectivo',
  refunded: 'Reembolsada',
}

export function ViewingsManager({ initialAppointments }: { initialAppointments: Appointment[] }) {
  const [appointments, setAppointments] = useState(initialAppointments)
  const [status, setStatus] = useState<string>('all')
  const [pricingId, setPricingId] = useState<string | null>(null)
  const [priceInput, setPriceInput] = useState('')

  const filtered = useMemo(
    () => appointments.filter((a) => status === 'all' || a.status === status),
    [appointments, status]
  )

  async function savePayment(id: string, payload: { paymentAmount?: number; markCash?: boolean }) {
    const res = await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const { appointment } = await res.json()
      setAppointments((prev) => prev.map((a) => (a.id === appointment.id ? appointment : a)))
      setPricingId(null)
      setPriceInput('')
    }
  }

  async function resolveReschedule(id: string, decision: 'approve' | 'reject') {
    const res = await fetch(`/api/appointments/${id}/confirm-reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    })
    if (res.ok) {
      const { appointment } = await res.json()
      setAppointments((prev) => prev.map((a) => (a.id === appointment.id ? appointment : a)))
    }
  }

  async function setAppointmentStatus(id: string, nextStatus: Appointment['status']) {
    const res = await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    if (res.ok) {
      const { appointment } = await res.json()
      setAppointments((prev) => prev.map((a) => (a.id === appointment.id ? appointment : a)))
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field w-auto">
          <option value="all">Todos los estados</option>
          {APPOINTMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s] ?? s}
            </option>
          ))}
        </select>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {filtered.map((appt) => (
          <div key={appt.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[var(--text-1)]">{new Date(appt.scheduled_at).toLocaleString('es-DO')}</p>
              {appt.notes && <p className="text-xs text-[var(--text-3)] truncate">{appt.notes}</p>}
              {appt.status === 'pending_confirmation' && appt.requested_scheduled_at && (
                <p className="text-xs text-[var(--gold)]">
                  El cliente pide moverla al{' '}
                  {new Date(appt.requested_scheduled_at).toLocaleString('es-DO')}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`badge border-transparent ${STATUS_STYLES[appt.status] ?? ''}`}>
                {STATUS_LABELS[appt.status] ?? appt.status}
              </span>
              {PAYMENT_LABELS[appt.payment_status] && (
                <span className="badge border-transparent bg-[var(--bg-page)] text-[var(--text-3)]">
                  {PAYMENT_LABELS[appt.payment_status]}
                </span>
              )}
              {appt.status === 'pending_confirmation' && (
                <div className="flex flex-wrap gap-1">
                  <button className="btn-primary" onClick={() => resolveReschedule(appt.id, 'approve')}>
                    Confirmar
                  </button>
                  <button className="btn-secondary" onClick={() => resolveReschedule(appt.id, 'reject')}>
                    Rechazar
                  </button>
                </div>
              )}
              {appt.status === 'scheduled' && appt.payment_status !== 'paid' && (
                pricingId === appt.id ? (
                  <div className="flex flex-wrap items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      placeholder="Importe"
                      className="input-field w-28"
                    />
                    <button
                      className="btn-primary"
                      onClick={() => savePayment(appt.id, { paymentAmount: Number(priceInput) || 0 })}
                    >
                      Guardar
                    </button>
                    <button className="btn-secondary" onClick={() => savePayment(appt.id, { markCash: true })}>
                      Cobrado en efectivo
                    </button>
                    <button className="btn-secondary" onClick={() => setPricingId(null)}>
                      Salir
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setPricingId(appt.id)
                      setPriceInput(appt.payment_amount ? String(appt.payment_amount) : '')
                    }}
                  >
                    {appt.payment_amount ? `Cobro: ${appt.payment_amount}` : 'Fijar cobro'}
                  </button>
                )
              )}
              {appt.status === 'scheduled' && (
                <div className="flex flex-wrap gap-1">
                  <button className="btn-secondary" onClick={() => setAppointmentStatus(appt.id, 'completed')}>
                    Completar
                  </button>
                  <button className="btn-secondary" onClick={() => setAppointmentStatus(appt.id, 'no_show')}>
                    No asistió
                  </button>
                  <button className="btn-secondary" onClick={() => setAppointmentStatus(appt.id, 'cancelled')}>
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--text-3)]">Ninguna cita coincide con este filtro.</p>
        )}
      </div>
    </div>
  )
}
