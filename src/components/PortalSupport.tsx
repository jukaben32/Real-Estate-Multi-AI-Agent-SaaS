'use client'

import { useEffect, useRef, useState } from 'react'
import type { SupportMessage, SupportTicket } from '@/types'

interface TicketRow extends SupportTicket {
  message_count: number
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto',
  in_progress: 'En progreso',
  resolved: 'Resuelto',
  closed: 'Cerrado',
}

export function PortalSupport({ initialTickets }: { initialTickets: TicketRow[] }) {
  const [tickets, setTickets] = useState(initialTickets)
  const [selectedId, setSelectedId] = useState<string | null>(initialTickets[0]?.id ?? null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [reply, setReply] = useState('')
  const [creating, setCreating] = useState(initialTickets.length === 0)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selectedId) return setMessages([])
    let cancelled = false
    fetch(`/api/support/tickets/${selectedId}/messages`)
      .then((r) => r.json())
      .then((d) => !cancelled && setMessages(d.messages ?? []))
      .catch(() => !cancelled && setError('No se pudieron cargar los mensajes'))
    return () => {
      cancelled = true
    }
  }, [selectedId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  async function createTicket() {
    if (!body.trim() || busy) return
    setBusy(true)
    setError(null)

    const res = await fetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: subject.trim(), body: body.trim() }),
    })
    const data = await res.json()
    setBusy(false)

    if (!res.ok) return setError(data.error ?? 'No se pudo crear el ticket')

    setTickets((prev) => [{ ...data.ticket, message_count: 1 }, ...prev])
    setSelectedId(data.ticket.id)
    setCreating(false)
    setSubject('')
    setBody('')
  }

  async function sendReply() {
    if (!reply.trim() || !selectedId || busy) return
    setBusy(true)
    setError(null)

    const res = await fetch(`/api/support/tickets/${selectedId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: reply.trim() }),
    })
    const data = await res.json()
    setBusy(false)

    if (!res.ok) return setError(data.error ?? 'No se pudo enviar el mensaje')
    setMessages((prev) => [...prev, data.message])
    setReply('')
  }

  if (creating) {
    return (
      <div className="card-surface p-5 space-y-3">
        <h2 className="font-display font-semibold text-[var(--text-1)]">Abrir un ticket</h2>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="input-field"
          placeholder="Asunto (opcional)"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className="input-field resize-none"
          placeholder="Cuéntanos en qué podemos ayudarte…"
        />
        <div className="flex gap-2">
          <button className="btn-primary" onClick={createTicket} disabled={busy || !body.trim()}>
            {busy ? 'Enviando…' : 'Enviar'}
          </button>
          {tickets.length > 0 && (
            <button className="btn-secondary" onClick={() => setCreating(false)}>
              Volver
            </button>
          )}
        </div>
      </div>
    )
  }

  const selected = tickets.find((t) => t.id === selectedId)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <select
          value={selectedId ?? ''}
          onChange={(e) => setSelectedId(e.target.value)}
          className="input-field w-auto flex-1 min-w-0"
        >
          {tickets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.subject} · {STATUS_LABELS[t.status] ?? t.status}
            </option>
          ))}
        </select>
        <button className="btn-secondary shrink-0" onClick={() => setCreating(true)}>
          Nuevo ticket
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card-surface flex flex-col">
        <div ref={scrollRef} className="p-4 space-y-3 max-h-[400px] min-h-[240px] overflow-y-auto">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === 'client' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                  m.sender === 'client'
                    ? 'bg-[var(--teal-700)] text-white rounded-br-sm'
                    : 'bg-[var(--bg-page)] text-[var(--text-1)] rounded-bl-sm'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p
                  className={`text-[11px] mt-1 ${
                    m.sender === 'client' ? 'text-white/70' : 'text-[var(--text-3)]'
                  }`}
                >
                  {new Date(m.created_at).toLocaleString('es-DO')}
                </p>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-sm text-[var(--text-3)] text-center py-8">Sin mensajes aún.</p>
          )}
        </div>

        {selected && selected.status !== 'closed' && (
          <div className="p-3 border-t border-[var(--border)] flex gap-2">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply()
              }}
              rows={2}
              className="input-field flex-1 resize-none"
              placeholder="Escribe un mensaje…"
            />
            <button className="btn-primary px-4" onClick={sendReply} disabled={busy || !reply.trim()}>
              {busy ? '…' : 'Enviar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
