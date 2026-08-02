import { NextResponse } from 'next/server'
import { requireBusiness, isErr } from '@/lib/api/auth'
import { updateAppointmentStatus, setAppointmentPayment } from '@/services/appointments'

export async function PATCH(request: Request, { params }: { params: { appointmentId: string } }) {
  const ctx = await requireBusiness()
  if (isErr(ctx)) return NextResponse.json({ error: ctx.error }, { status: 401 })

  const body = await request.json()

  try {
    // Nuevo: el mismo PATCH acepta ahora datos de cobro. Si no vienen, el
    // comportamiento anterior (solo cambio de estado) queda intacto.
    if (body.paymentAmount !== undefined || body.markCash) {
      const appointment = await setAppointmentPayment(
        ctx.supabase,
        ctx.business.id,
        params.appointmentId,
        { amount: body.paymentAmount, markCash: Boolean(body.markCash) }
      )
      return NextResponse.json({ appointment })
    }

    const appointment = await updateAppointmentStatus(
      ctx.supabase,
      ctx.business.id,
      params.appointmentId,
      body.status
    )
    return NextResponse.json({ appointment })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo actualizar la cita'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
