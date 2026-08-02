import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { Appointment, AvailableSlot } from '@/types'
import { PLAN_LIMITS, isWithinLimit } from '@/constants'
import type { PlanId } from '@/types'

type DB = SupabaseClient<Database>

export async function listAppointmentsForBusiness(
  supabase: DB,
  businessId: string,
  filters?: { status?: Appointment['status'] | 'all' }
): Promise<Appointment[]> {
  let query = supabase
    .from('appointments')
    .select('*')
    .eq('business_id', businessId)
    .order('scheduled_at', { ascending: false })

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export class BookingLimitError extends Error {
  constructor(limit: number) {
    super(`Your plan allows a maximum of ${limit} bookings this month. Upgrade to book more.`)
    this.name = 'BookingLimitError'
  }
}

export async function createAppointment(
  supabase: DB,
  businessId: string,
  plan: PlanId,
  input: {
    listingId?: string
    clientId?: string
    conversationId?: string
    scheduledAt: string
    notes?: string
  }
): Promise<Appointment> {
  const { bookingLimit } = PLAN_LIMITS[plan]
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count, error: countError } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .gte('created_at', startOfMonth.toISOString())
  if (countError) throw countError

  if (!isWithinLimit(count ?? 0, bookingLimit)) {
    throw new BookingLimitError(bookingLimit)
  }

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      business_id: businessId,
      listing_id: input.listingId,
      client_id: input.clientId,
      conversation_id: input.conversationId,
      scheduled_at: input.scheduledAt,
      notes: input.notes,
    })
    .select('*')
    .single()
  if (error) throw error

  await supabase.from('notifications').insert({
    business_id: businessId,
    type: 'appointment_booked',
    title: 'New viewing booked',
    body: `A viewing was scheduled for ${new Date(input.scheduledAt).toLocaleString()}`,
  })

  return data
}

export async function updateAppointmentStatus(
  supabase: DB,
  businessId: string,
  appointmentId: string,
  status: Appointment['status']
): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('business_id', businessId)
    .eq('id', appointmentId)
    .select('*')
    .single()
  if (error) throw error
  return data
}

// Walks the business's weekly availability, minus already-booked slots, to
// produce the next N bookable windows — this is what the AI agent's
// `book_viewing` tool calls before offering a time to the caller.
export async function getAvailableSlots(
  supabase: DB,
  businessId: string,
  opts: { fromDate?: Date; daysAhead?: number } = {}
): Promise<AvailableSlot[]> {
  const fromDate = opts.fromDate ?? new Date()
  const daysAhead = opts.daysAhead ?? 7

  const { data: availability, error: availError } = await supabase
    .from('business_availability')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
  if (availError) throw availError
  if (!availability || availability.length === 0) return []

  const rangeEnd = new Date(fromDate.getTime() + daysAhead * 86_400_000)
  const { data: booked, error: bookedError } = await supabase
    .from('appointments')
    .select('scheduled_at')
    .eq('business_id', businessId)
    .neq('status', 'cancelled')
    .gte('scheduled_at', fromDate.toISOString())
    .lte('scheduled_at', rangeEnd.toISOString())
  if (bookedError) throw bookedError

  const bookedTimes = new Set((booked ?? []).map((b) => new Date(b.scheduled_at).getTime()))
  const slots: AvailableSlot[] = []

  for (let day = 0; day < daysAhead; day++) {
    const date = new Date(fromDate.getTime() + day * 86_400_000)
    const dayAvailability = availability.filter((a) => a.day_of_week === date.getDay())

    for (const window of dayAvailability) {
      const [startH, startM] = window.start_time.split(':').map(Number)
      const [endH, endM] = window.end_time.split(':').map(Number)
      const cursor = new Date(date)
      cursor.setHours(startH, startM, 0, 0)
      const end = new Date(date)
      end.setHours(endH, endM, 0, 0)

      while (cursor < end) {
        if (cursor > fromDate && !bookedTimes.has(cursor.getTime())) {
          slots.push({
            date: cursor.toISOString().slice(0, 10),
            time: cursor.toTimeString().slice(0, 5),
            datetime: cursor.toISOString(),
          })
        }
        cursor.setMinutes(cursor.getMinutes() + window.slot_minutes)
      }
    }
  }

  return slots
}

// ─── Reagendamiento con confirmación del agente ─────────────────────────────
// El cliente propone una fecha nueva; la cita pasa a `pending_confirmation` y
// conserva la fecha anterior en `rescheduled_from` hasta que el agente decide.
// Si el agente rechaza, se revierte a la fecha original sin perder nada.

export async function requestReschedule(
  supabase: DB,
  appointmentId: string,
  clientId: string,
  newScheduledAt: string
): Promise<Appointment> {
  const { data: current, error: readError } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .eq('client_id', clientId)
    .single()
  if (readError) throw readError

  if (!['scheduled', 'pending_confirmation'].includes(current.status)) {
    throw new Error('Esta cita ya no se puede reagendar')
  }
  if (new Date(newScheduledAt).getTime() <= Date.now()) {
    throw new Error('La nueva fecha debe estar en el futuro')
  }

  const { data, error } = await supabase
    .from('appointments')
    .update({
      status: 'pending_confirmation',
      requested_scheduled_at: newScheduledAt,
      reschedule_requested_at: new Date().toISOString(),
      rescheduled_from: current.rescheduled_from ?? current.scheduled_at,
      confirmed_by_agent_at: null,
    })
    .eq('id', appointmentId)
    .eq('client_id', clientId)
    .select('*')
    .single()
  if (error) throw error

  await supabase.from('notifications').insert({
    business_id: current.business_id,
    type: 'appointment_rescheduled',
    title: 'Reagendamiento pendiente',
    body: `Un cliente pidió mover su cita al ${new Date(newScheduledAt).toLocaleString('es-ES')}`,
  })

  return data
}

export async function resolveReschedule(
  supabase: DB,
  businessId: string,
  appointmentId: string,
  decision: 'approve' | 'reject'
): Promise<Appointment> {
  const { data: current, error: readError } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .eq('business_id', businessId)
    .single()
  if (readError) throw readError

  if (current.status !== 'pending_confirmation') {
    throw new Error('Esta cita no tiene un reagendamiento pendiente')
  }

  const patch =
    decision === 'approve'
      ? {
          status: 'scheduled' as const,
          scheduled_at: current.requested_scheduled_at ?? current.scheduled_at,
          requested_scheduled_at: null,
          confirmed_by_agent_at: new Date().toISOString(),
        }
      : {
          status: 'scheduled' as const,
          // Vuelve a la fecha original: nada se pierde en un rechazo.
          scheduled_at: current.rescheduled_from ?? current.scheduled_at,
          requested_scheduled_at: null,
          reschedule_requested_at: null,
          rescheduled_from: null,
          confirmed_by_agent_at: null,
        }

  const { data, error } = await supabase
    .from('appointments')
    .update(patch)
    .eq('id', appointmentId)
    .eq('business_id', businessId)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function cancelAppointment(
  supabase: DB,
  appointmentId: string,
  by: 'client' | 'business',
  opts: { businessId?: string; clientId?: string; reason?: string } = {}
): Promise<Appointment> {
  let query = supabase
    .from('appointments')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: by,
      cancellation_reason: opts.reason ?? null,
    })
    .eq('id', appointmentId)

  if (opts.businessId) query = query.eq('business_id', opts.businessId)
  if (opts.clientId) query = query.eq('client_id', opts.clientId)

  const { data, error } = await query.select('*').single()
  if (error) throw error
  return data
}

// El importe de una cita SOLO lo fija el negocio desde el panel. El portal lo
// lee para generar el Checkout, pero nunca puede escribirlo.
export async function setAppointmentPayment(
  supabase: DB,
  businessId: string,
  appointmentId: string,
  input: { amount?: number | null; markCash?: boolean }
): Promise<Appointment> {
  const patch: Record<string, unknown> = {}

  if (input.amount !== undefined) {
    patch.payment_amount = input.amount
    // Poner precio a una cita sin pago la deja pendiente de cobro.
    if (input.amount && input.amount > 0) patch.payment_status = 'pending'
    else patch.payment_status = 'not_required'
  }

  if (input.markCash) {
    patch.payment_status = 'cash'
    patch.paid_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('appointments')
    .update(patch)
    .eq('id', appointmentId)
    .eq('business_id', businessId)
    .select('*')
    .single()
  if (error) throw error
  return data
}
