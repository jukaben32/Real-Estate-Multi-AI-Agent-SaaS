import { NextResponse } from 'next/server'
import { requireBusiness, requirePortalClient, isErr } from '@/lib/api/auth'
import { listTicketsForBusiness, listTicketsForClient, createTicket } from '@/services/support'
import { sendSupportMessageEmail } from '@/services/email'

// GET — el dueño ve la bandeja del negocio; el cliente ve solo los suyos.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as 'open' | 'in_progress' | 'resolved' | 'closed' | 'all' | null

  const biz = await requireBusiness()
  if (!isErr(biz)) {
    const tickets = await listTicketsForBusiness(biz.supabase, biz.business.id, { status: status ?? 'all' })
    return NextResponse.json({ tickets, role: 'business' })
  }

  const portal = await requirePortalClient()
  if (isErr(portal)) return NextResponse.json({ error: portal.error }, { status: 401 })

  const tickets = await listTicketsForClient(portal.supabase, portal.client.id)
  return NextResponse.json({ tickets, role: 'client' })
}

// POST — solo el cliente abre tickets desde el portal.
export async function POST(request: Request) {
  const portal = await requirePortalClient()
  if (isErr(portal)) return NextResponse.json({ error: portal.error }, { status: 401 })

  const { subject, body, priority } = await request.json()
  if (!body || typeof body !== 'string' || !body.trim()) {
    return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 })
  }

  try {
    const ticket = await createTicket(portal.supabase, {
      businessId: portal.business.id,
      clientId: portal.client.id,
      subject: typeof subject === 'string' ? subject : '',
      body: body.trim(),
      priority,
    })

    await sendSupportMessageEmail({
      to: portal.business.contact_email ?? '',
      recipient: 'business',
      brand: { businessName: portal.business.name, logoUrl: portal.business.logo_url },
      subject: ticket.subject,
      preview: body.trim().slice(0, 240),
      ticketId: ticket.id,
    })

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo crear el ticket'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
