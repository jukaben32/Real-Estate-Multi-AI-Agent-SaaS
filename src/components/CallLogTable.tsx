'use client'

import { useState } from 'react'
import type { Conversation, ConversationMessage } from '@/types'

const OUTCOME_STYLES: Record<string, string> = {
  booked_viewing: 'bg-green-100 text-green-700',
  qualified_lead: 'bg-[var(--teal-50)] text-[var(--teal-700)]',
  no_action: 'bg-gray-100 text-gray-600',
  escalated: 'bg-amber-100 text-amber-700',
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function CallLogTable({ initialConversations }: { initialConversations: Conversation[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [loading, setLoading] = useState(false)

  async function toggleExpand(conversationId: string) {
    if (expandedId === conversationId) {
      setExpandedId(null)
      return
    }
    setExpandedId(conversationId)
    setLoading(true)
    const res = await fetch(`/api/conversations/${conversationId}/messages`)
    if (res.ok) {
      const { messages: fetched } = await res.json()
      setMessages(fetched)
    }
    setLoading(false)
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {initialConversations.map((conv) => (
        <div key={conv.id}>
          <button
            onClick={() => toggleExpand(conv.id)}
            className="w-full py-3 flex items-center gap-4 text-left"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium">{new Date(conv.started_at).toLocaleString()}</p>
              <p className="text-xs text-[var(--text-3)] capitalize">{conv.channel.replace('_', ' ')}</p>
            </div>
            <span className="text-sm w-14 text-right">{formatDuration(conv.duration_seconds)}</span>
            <span className="text-xs rounded-full px-2 py-1 capitalize bg-gray-100 text-gray-600">
              {conv.status}
            </span>
            {conv.outcome && (
              <span
                className={`text-xs rounded-full px-2 py-1 capitalize ${OUTCOME_STYLES[conv.outcome] ?? ''}`}
              >
                {conv.outcome.replace('_', ' ')}
              </span>
            )}
          </button>

          {expandedId === conv.id && (
            <div className="pb-4 pl-2 border-l-2 border-[var(--border)] ml-2">
              {loading && <p className="text-sm text-[var(--text-3)]">Loading transcript…</p>}
              {!loading && messages.length === 0 && (
                <p className="text-sm text-[var(--text-3)]">No transcript recorded for this call.</p>
              )}
              <div className="space-y-2">
                {messages.map((m) => (
                  <p key={m.id} className="text-sm">
                    <span className="font-semibold capitalize">{m.role}:</span> {m.content}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
      {initialConversations.length === 0 && (
        <p className="py-6 text-center text-sm text-[var(--text-3)]">No calls logged yet.</p>
      )}
    </div>
  )
}
