'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { SupportMessage, SupportTicket } from '@/types'

interface TicketRow extends SupportTicket {
  client_name: string | null
  client_email: string | null
  message_count: number
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-[var(--teal-50)] text-[var(--teal-700)]',
  in_progress: 'bg-[var(--gold)]/15 text-[var(--gold)]',
  resolved: 'bg-[var(--teal-50)] text-[var(--teal-800)]',
  closed: 'bg-[var(--bg-page)] text-[var(--text-3)]',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto',
  in_progress: 'En progreso',
  resolved: 'Resuelto',
  closed: 'Cerrado',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
}

export function SupportTicketsManager({
  initialTickets,
  initialTicketId,
}: {
  initialTickets: TicketRow[]
  initialTicketId?: string
}) {
  const [tickets, setTickets] = useState(initialTickets)
  const [filter, setFilter] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(
    initialTicketId ?? initialTickets[0]?.id ?? null
  )
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(
    () => tickets.filter((t) => filter === 'all' || t.status === filter),
    [tickets, filter]
  )
  const selected = tickets.find((t) => t.id === selectedId) ?? null

  useEffect(() => {
    if (!selectedId) {
      setMessages([])
      return
    }
    let cancelled = false
    setLoadingMessages(true)
    setError(null)

    fetch(`/api/support/tickets/${selectedId}/messages`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.error) setError(data.error)
        else setMessages(data.messages ?? [])
      })
      .catch(() => !cancelled && setError('No se pudieron cargar los mensajes'))
      .finally(() => !cancelled && setLoadingMessages(false))

    return () => {
      cancelled = true
    }
  }, [selectedId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  async function sendReply() {
    const body = reply.trim()
    if (!body || !selectedId || sending) return

    setSending(true)
    setError(null)
    const res = await fetch(`/api/support/tickets/${selectedId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })
    const data = await res.json()
    setSending(false)

    if (!res.ok) {
      setError(data.error ?? 'No se pudo enviar la respuesta')
      return
    }

    setMessages((prev) => [...prev, data.message])
    setReply('')
    // Responder mueve el ticket a "en progreso" en el servidor; reflejarlo aquí.
    setTickets((prev) =>
      prev.map((t) =>
        t.id === selectedId
          ? { ...t, status: t.status === 'open' ? 'in_progress' : t.status, message_count: t.message_count + 1 }
          : t
      )
    )
  }

  async function changeStatus(status: SupportTicket['status']) {
    if (!selectedId) return
    const res = await fetch(`/api/support/tickets/${selectedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) return
    const { ticket } = await res.json()
    setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, ...ticket } : t)))
  }

  if (tickets.length === 0) {
    return (
      <div className="py-14 text-center">
        <p className="text-sm text-[var(--text-3)]">Todavía no hay tickets de soporte.</p>
        <p className="text-xs text-[var(--text-3)] mt-1">
          Aparecerán aquí cuando un cliente abra uno desde su portal.
        </p>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-[300px_1fr] gap-4">
      {/* Lista de tickets */}
      <div className="min-w-0">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input-field w-full mb-3"
        >
          <option value="all">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <div className="divide-y divide-[var(--border)] max-h-[520px] overflow-y-auto rounded-lg border border-[var(--border)]">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={`w-full text-left p-3 transition-colors ${
                t.id === selectedId ? 'bg-[var(--teal-50)]' : 'hover:bg-[var(--bg-page)]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm text-[var(--text-1)] truncate">{t.subject}</p>
                <span className={`badge border-transparent shrink-0 ${STATUS_STYLES[t.status] ?? ''}`}>
                  {STATUS_LABELS[t.status] ?? t.status}
                </span>
              </div>
              <p className="text-xs text-[var(--text-3)] mt-1 truncate">
                {t.client_name ?? 'Cliente'} · {t.message_count} mensaje{t.message_count === 1 ? '' : 's'}
              </p>
              {t.last_message_at && (
                <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                  {new Date(t.last_message_at).toLocaleString('es-DO')}
                </p>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-[var(--text-3)]">
              Ningún ticket con este filtro.
            </p>
          )}
        </div>
      </div>

      {/* Conversación */}
      <div className="min-w-0 flex flex-col rounded-lg border border-[var(--border)]">
        {selected ? (
          <>
            <div className="p-3 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-[var(--text-1)] truncate">{selected.subject}</p>
                <p className="text-xs text-[var(--text-3)] truncate">
                  {selected.client_name ?? 'Cliente'}
                  {selected.client_email ? ` · ${selected.client_email}` : ''}
                  {selected.priority !== 'normal'
                    ? ` · Prioridad ${PRIORITY_LABELS[selected.priority] ?? selected.priority}`
                    : ''}
                </p>
              </div>
              <select
                value={selected.status}
                onChange={(e) => changeStatus(e.target.value as SupportTicket['status'])}
                className="input-field w-auto text-sm"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div ref={scrollRef} className="flex-1 min-h-[300px] max-h-[400px] overflow-y-auto p-3 space-y-3">
              {loadingMessages && <p className="text-sm text-[var(--text-3)]">Cargando…</p>}
              {!loadingMessages &&
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sender === 'business' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                        m.sender === 'business'
                          ? 'bg-[var(--teal-700)] text-white rounded-br-sm'
                          : 'bg-[var(--bg-page)] text-[var(--text-1)] rounded-bl-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p
                        className={`text-[11px] mt-1 ${
                          m.sender === 'business' ? 'text-white/70' : 'text-[var(--text-3)]'
                        }`}
                      >
                        {new Date(m.created_at).toLocaleString('es-DO')}
                      </p>
                    </div>
                  </div>
                ))}
              {!loadingMessages && messages.length === 0 && (
                <p className="text-sm text-[var(--text-3)] text-center py-6">Sin mensajes aún.</p>
              )}
            </div>

            {error && <p className="px-3 text-sm text-red-600">{error}</p>}

            <div className="p-3 border-t border-[var(--border)] flex gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply()
                }}
                rows={2}
                placeholder="Escribe tu respuesta…"
                className="input-field flex-1 resize-none"
              />
              <button className="btn-primary px-4" onClick={sendReply} disabled={sending || !reply.trim()}>
                {sending ? '…' : 'Enviar'}
              </button>
            </div>
          </>
        ) : (
          <p className="p-6 text-center text-sm text-[var(--text-3)]">
            Selecciona un ticket para ver la conversación.
          </p>
        )}
      </div>
    </div>
  )
}
