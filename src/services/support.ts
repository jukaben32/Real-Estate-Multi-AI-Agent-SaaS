import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { SupportTicket, SupportMessage } from '@/types'

type DB = SupabaseClient<Database>

export interface TicketWithMeta extends SupportTicket {
  client_name: string | null
  client_email: string | null
  message_count: number
}

/** Bandeja del agente: tickets del negocio, más recientes primero. */
export async function listTicketsForBusiness(
  supabase: DB,
  businessId: string,
  filters?: { status?: SupportTicket['status'] | 'all' }
): Promise<TicketWithMeta[]> {
  let query = supabase
    .from('support_tickets')
    .select('*, clients(name, email), support_messages(count)')
    .eq('business_id', businessId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as unknown as Array<
    SupportTicket & {
      clients: { name: string; email: string | null } | null
      support_messages: { count: number }[] | null
    }
  >

  return rows.map(({ clients, support_messages, ...ticket }) => ({
    ...(ticket as SupportTicket),
    client_name: clients?.name ?? null,
    client_email: clients?.email ?? null,
    message_count: support_messages?.[0]?.count ?? 0,
  }))
}

/** Tickets del cliente autenticado en el portal. */
export async function listTicketsForClient(supabase: DB, clientId: string): Promise<TicketWithMeta[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*, support_messages(count)')
    .eq('client_id', clientId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
  if (error) throw error

  const rows = (data ?? []) as unknown as Array<
    SupportTicket & { support_messages: { count: number }[] | null }
  >

  return rows.map(({ support_messages, ...ticket }) => ({
    ...(ticket as SupportTicket),
    client_name: null,
    client_email: null,
    message_count: support_messages?.[0]?.count ?? 0,
  }))
}

export async function getTicketMessages(supabase: DB, ticketId: string): Promise<SupportMessage[]> {
  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createTicket(
  supabase: DB,
  input: { businessId: string; clientId: string; subject: string; body: string; priority?: SupportTicket['priority'] }
): Promise<SupportTicket> {
  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .insert({
      business_id: input.businessId,
      client_id: input.clientId,
      subject: input.subject.trim() || 'Solicitud de soporte',
      priority: input.priority ?? 'normal',
      status: 'open',
    })
    .select('*')
    .single()
  if (error) throw error

  // El primer mensaje es el cuerpo del ticket.
  const { error: msgError } = await supabase.from('support_messages').insert({
    ticket_id: ticket.id,
    business_id: input.businessId,
    sender: 'client',
    body: input.body,
  })
  if (msgError) throw msgError

  await supabase.from('notifications').insert({
    business_id: input.businessId,
    type: 'support_ticket',
    title: 'Nuevo ticket de soporte',
    body: ticket.subject,
  })

  return ticket
}

export async function addMessage(
  supabase: DB,
  input: { ticketId: string; businessId: string; sender: 'client' | 'business'; body: string }
): Promise<SupportMessage> {
  const { data, error } = await supabase
    .from('support_messages')
    .insert({
      ticket_id: input.ticketId,
      business_id: input.businessId,
      sender: input.sender,
      body: input.body,
    })
    .select('*')
    .single()
  if (error) throw error

  // Si el negocio responde a un ticket abierto, pasa a "en progreso".
  if (input.sender === 'business') {
    await supabase
      .from('support_tickets')
      .update({ status: 'in_progress' })
      .eq('id', input.ticketId)
      .eq('status', 'open')
  }

  return data
}

export async function updateTicketStatus(
  supabase: DB,
  businessId: string,
  ticketId: string,
  status: SupportTicket['status']
): Promise<SupportTicket> {
  const { data, error } = await supabase
    .from('support_tickets')
    .update({
      status,
      closed_at: status === 'closed' || status === 'resolved' ? new Date().toISOString() : null,
    })
    .eq('id', ticketId)
    .eq('business_id', businessId)
    .select('*')
    .single()
  if (error) throw error
  return data
}
