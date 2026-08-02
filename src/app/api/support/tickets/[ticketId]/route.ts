import { NextResponse } from 'next/server'
import { requireBusiness, isErr } from '@/lib/api/auth'
import { updateTicketStatus } from '@/services/support'

// PATCH — el agente cambia el estado del ticket.
export async function PATCH(request: Request, { params }: { params: { ticketId: string } }) {
  const ctx = await requireBusiness()
  if (isErr(ctx)) return NextResponse.json({ error: ctx.error }, { status: 401 })

  const { status } = await request.json()
  const allowed = ['open', 'in_progress', 'resolved', 'closed']
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: 'Estado no válido' }, { status: 400 })
  }

  try {
    const ticket = await updateTicketStatus(ctx.supabase, ctx.business.id, params.ticketId, status)
    return NextResponse.json({ ticket })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo actualizar el ticket'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
