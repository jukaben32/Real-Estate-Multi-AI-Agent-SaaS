'use client'

import { useMemo, useState } from 'react'
import type { Appointment } from '@/types'
import { APPOINTMENT_STATUSES } from '@/constants'

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-[var(--teal-50)] text-[var(--teal-700)]',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-amber-100 text-amber-700',
}

export function ViewingsManager({ initialAppointments }: { initialAppointments: Appointment[] }) {
  const [appointments, setAppointments] = useState(initialAppointments)
  const [status, setStatus] = useState<string>('all')

  const filtered = useMemo(
    () => appointments.filter((a) => status === 'all' || a.status === status),
    [appointments, status]
  )

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
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded-lg px-3 py-2">
          <option value="all">All Statuses</option>
          {APPOINTMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {filtered.map((appt) => (
          <div key={appt.id} className="py-3 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium">{new Date(appt.scheduled_at).toLocaleString()}</p>
              {appt.notes && <p className="text-xs text-[var(--text-3)] truncate">{appt.notes}</p>}
            </div>
            <span className={`text-xs rounded-full px-2 py-1 capitalize ${STATUS_STYLES[appt.status] ?? ''}`}>
              {appt.status.replace('_', ' ')}
            </span>
            {appt.status === 'scheduled' && (
              <div className="flex gap-1">
                <button className="btn-secondary" onClick={() => setAppointmentStatus(appt.id, 'completed')}>
                  Complete
                </button>
                <button className="btn-secondary" onClick={() => setAppointmentStatus(appt.id, 'no_show')}>
                  No-show
                </button>
                <button className="btn-secondary" onClick={() => setAppointmentStatus(appt.id, 'cancelled')}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--text-3)]">No viewings match this filter.</p>
        )}
      </div>
    </div>
  )
}
