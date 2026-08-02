import { NextResponse } from 'next/server'
import { requireBusiness, requirePortalClient, isErr } from '@/lib/api/auth'
import { getTicketMessages, addMessage } from '@/services/support'
import { sendSupportMessageEmail } from '@/services/email'

// RLS ya filtra por tenant y por dueño del ticket, así que basta con saber
// cuál de los dos roles está pidiendo.
async function resolveRole(ticketId: string) {
  const biz = await requireBusiness()
  if (!isErr(biz)) {
    const { data } = await biz.supabase
      .from('support_tickets')
      .select('*, clients(name, email)')
      .eq('id', ticketId)
      .eq('business_id', biz.business.id)
      .maybeSingle()
    if (data) return { role: 'business' as const, ctx: biz, ticket: data }
  }

  const portal = await requirePortalClient()
  if (!isErr(portal)) {
    const { data } = await portal.supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .eq('client_id', portal.client.id)
      .maybeSingle()
    if (data) return { role: 'client' as const, ctx: portal, ticket: data }
  }

  return null
}

export async function GET(_request: Request, { params }: { params: { ticketId: string } }) {
  const resolved = await resolveRole(params.ticketId)
  if (!resolved) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

  const messages = await getTicketMessages(resolved.ctx.supabase, params.ticketId)
  return NextResponse.json({ messages, role: resolved.role })
}

export async function POST(request: Request, { params }: { params: { ticketId: string } }) {
  const resolved = await resolveRole(params.ticketId)
  if (!resolved) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

  const { body } = await request.json()
  if (!body || typeof body !== 'string' || !body.trim()) {
    return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 })
  }

  const businessId = resolved.role === 'business' ? resolved.ctx.business.id : resolved.ctx.business.id

  try {
    const message = await addMessage(resolved.ctx.supabase, {
      ticketId: params.ticketId,
      businessId,
      sender: resolved.role,
      body: body.trim(),
    })

    // Notifica a la otra parte.
    if (resolved.role === 'client') {
      const b = resolved.ctx.business
      await sendSupportMessageEmail({
        to: b.contact_email ?? '',
        recipient: 'business',
        brand: { businessName: b.name, logoUrl: b.logo_url },
        subject: resolved.ticket.subject,
        preview: body.trim().slice(0, 240),
        ticketId: params.ticketId,
      })
    } else {
      const client = (
        resolved.ticket as unknown as { clients?: { name: string; email: string | null } | null }
      ).clients
      await sendSupportMessageEmail({
        to: client?.email ?? '',
        recipient: 'client',
        brand: { businessName: resolved.ctx.business.name, logoUrl: resolved.ctx.business.logo_url },
        subject: resolved.ticket.subject,
        preview: body.trim().slice(0, 240),
        ticketId: params.ticketId,
      })
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'No se pudo enviar el mensaje'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
