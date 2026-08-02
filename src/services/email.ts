import { Resend } from 'resend'

let resendClient: Resend | null = null
function getResend() {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY)
  return resendClient
}

// RESEND_DEV_OVERRIDE_TO redirects every outgoing email to the developer's own
// inbox in non-production environments, so local testing never spams a real lead.
function resolveRecipient(to: string): string {
  if (process.env.NODE_ENV !== 'production' && process.env.RESEND_DEV_OVERRIDE_TO) {
    return process.env.RESEND_DEV_OVERRIDE_TO
  }
  return to
}

export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  const resend = getResend()
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
    to: resolveRecipient(opts.to),
    subject: opts.subject,
    html: opts.html,
  })
}

// El email nunca debe tumbar el flujo que lo dispara: una cita se reserva igual
// aunque Resend esté caído. Todos los helpers de abajo pasan por aquí.
async function safeSend(opts: { to?: string | null; subject: string; html: string }) {
  if (!opts.to) return { skipped: true as const }
  try {
    return await sendEmail({ to: opts.to, subject: opts.subject, html: opts.html })
  } catch (err) {
    console.error('[email] envio fallido:', opts.subject, err)
    return { skipped: true as const }
  }
}

// ─── Branding ───────────────────────────────────────────────────────────────

export interface EmailBrand {
  businessName: string
  logoUrl?: string | null
  primaryColor?: string | null
  portalUrl?: string | null
}

const DEFAULT_COLOR = '#0f766e'

export function appUrl(path = ''): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  return `${base.replace(/\/$/, '')}${path}`
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtDate(iso: string, timezone?: string | null): string {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: timezone ?? undefined,
    }).format(new Date(iso))
  } catch {
    return new Date(iso).toLocaleString('es-ES')
  }
}

function money(amount?: number | null, currency = 'usd'): string {
  if (amount == null) return ''
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount)
  } catch {
    return `${amount} ${currency.toUpperCase()}`
  }
}

/** Envoltorio HTML basado en tablas — compatible con Gmail y Outlook. */
function layout(brand: EmailBrand, inner: string): string {
  const color = brand.primaryColor || DEFAULT_COLOR
  const header = brand.logoUrl
    ? `<img src="${esc(brand.logoUrl)}" alt="${esc(brand.businessName)}" height="40" style="height:40px;display:block;border:0;" />`
    : `<span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">${esc(brand.businessName)}</span>`

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(16,24,40,.08);">
        <tr><td style="background:${esc(color)};padding:20px 28px;">${header}</td></tr>
        <tr><td style="padding:28px;color:#101828;font-size:15px;line-height:1.6;">${inner}</td></tr>
        <tr><td style="padding:18px 28px;background:#fafafa;border-top:1px solid #eaecf0;color:#667085;font-size:12px;line-height:1.5;">
          Enviado por ${esc(brand.businessName)}.
          ${brand.portalUrl ? `<br /><a href="${esc(brand.portalUrl)}" style="color:${esc(color)};">Gestiona tus citas en el portal</a>` : ''}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function button(label: string, href: string, color = DEFAULT_COLOR): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;"><tr>
    <td style="background:${esc(color)};border-radius:8px;">
      <a href="${esc(href)}" style="display:inline-block;padding:12px 22px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;">${esc(label)}</a>
    </td></tr></table>`
}

/** Tabla clave/valor. Omite filas vacías automáticamente. */
function details(rows: Array<[string, string | null | undefined]>): string {
  const visible = rows.filter(([, v]) => v)
  if (!visible.length) return ''
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border:1px solid #eaecf0;border-radius:10px;overflow:hidden;">
    ${visible
      .map(
        ([k, v], i) => `<tr style="background:${i % 2 ? '#fafafa' : '#ffffff'};">
        <td style="padding:10px 14px;color:#667085;font-size:13px;width:40%;">${esc(k)}</td>
        <td style="padding:10px 14px;color:#101828;font-size:14px;font-weight:600;">${esc(v)}</td>
      </tr>`
      )
      .join('')}
  </table>`
}

// ─── Compatibilidad: las dos firmas originales siguen funcionando igual ─────

export async function sendAppointmentConfirmationEmail(opts: {
  to: string
  clientName: string
  businessName: string
  scheduledAt: string
  listingTitle?: string
  // Todo lo de abajo es nuevo y opcional.
  brand?: Partial<EmailBrand>
  timezone?: string | null
  address?: string | null
  paymentAmount?: number | null
  paymentCurrency?: string
}) {
  const brand: EmailBrand = {
    businessName: opts.businessName,
    portalUrl: appUrl('/portal'),
    ...opts.brand,
  }
  const color = brand.primaryColor || DEFAULT_COLOR

  return safeSend({
    to: opts.to,
    subject: `Tu cita con ${opts.businessName} esta confirmada`,
    html: layout(
      brand,
      `<p style="margin:0 0 12px;">Hola <strong>${esc(opts.clientName)}</strong>,</p>
       <p style="margin:0;">Tu visita con <strong>${esc(opts.businessName)}</strong> quedo confirmada.</p>
       ${details([
         ['Fecha y hora', fmtDate(opts.scheduledAt, opts.timezone)],
         ['Propiedad', opts.listingTitle],
         ['Direccion', opts.address],
         ['Importe', opts.paymentAmount ? money(opts.paymentAmount, opts.paymentCurrency) : null],
       ])}
       ${button('Ver mi cita', appUrl('/portal/appointments'), color)}
       <p style="margin:0;color:#667085;font-size:13px;">Puedes reagendar o cancelar desde el portal cuando lo necesites.</p>`
    ),
  })
}

export async function sendNewLeadEmail(opts: {
  to: string
  clientName: string
  clientPhone?: string
  businessName: string
  clientEmail?: string | null
  budget?: number | null
  brand?: Partial<EmailBrand>
}) {
  const brand: EmailBrand = { businessName: opts.businessName, ...opts.brand }
  return safeSend({
    to: opts.to,
    subject: `Nuevo lead: ${opts.clientName}`,
    html: layout(
      brand,
      `<p style="margin:0;">Tu agente IA capturo un nuevo lead para <strong>${esc(opts.businessName)}</strong>.</p>
       ${details([
         ['Nombre', opts.clientName],
         ['Telefono', opts.clientPhone],
         ['Correo', opts.clientEmail],
         ['Presupuesto', opts.budget ? money(opts.budget) : null],
       ])}
       ${button('Ver en el panel', appUrl('/dashboard/clients'), brand.primaryColor || DEFAULT_COLOR)}`
    ),
  })
}

// ─── Plantillas nuevas ──────────────────────────────────────────────────────

export async function sendAppointmentCancelledEmail(opts: {
  to: string
  recipient: 'client' | 'business'
  clientName: string
  brand: EmailBrand
  scheduledAt: string
  listingTitle?: string | null
  reason?: string | null
  timezone?: string | null
}) {
  const color = opts.brand.primaryColor || DEFAULT_COLOR
  const who = opts.recipient === 'client' ? 'Tu cita' : `La cita de ${opts.clientName}`
  return safeSend({
    to: opts.to,
    subject: `Cita cancelada · ${opts.brand.businessName}`,
    html: layout(
      opts.brand,
      `<p style="margin:0 0 12px;">Hola,</p>
       <p style="margin:0;">${esc(who)} ha sido cancelada.</p>
       ${details([
         ['Fecha original', fmtDate(opts.scheduledAt, opts.timezone)],
         ['Propiedad', opts.listingTitle],
         ['Motivo', opts.reason],
       ])}
       ${
         opts.recipient === 'client'
           ? button('Reservar otra fecha', appUrl('/portal/appointments'), color)
           : button('Ver agenda', appUrl('/dashboard/viewings'), color)
       }`
    ),
  })
}

export async function sendRescheduleRequestedEmail(opts: {
  to: string
  recipient: 'client' | 'business'
  clientName: string
  brand: EmailBrand
  previousAt: string
  requestedAt: string
  listingTitle?: string | null
  timezone?: string | null
}) {
  const color = opts.brand.primaryColor || DEFAULT_COLOR
  const body =
    opts.recipient === 'business'
      ? `<p style="margin:0;"><strong>${esc(opts.clientName)}</strong> solicito reagendar su cita. Queda pendiente de tu confirmacion.</p>`
      : `<p style="margin:0;">Recibimos tu solicitud de reagendar. <strong>${esc(opts.brand.businessName)}</strong> la confirmara en breve y te avisaremos.</p>`

  return safeSend({
    to: opts.to,
    subject:
      opts.recipient === 'business'
        ? `Reagendamiento pendiente · ${opts.clientName}`
        : `Solicitud de reagendamiento recibida · ${opts.brand.businessName}`,
    html: layout(
      opts.brand,
      `${body}
       ${details([
         ['Fecha anterior', fmtDate(opts.previousAt, opts.timezone)],
         ['Nueva fecha solicitada', fmtDate(opts.requestedAt, opts.timezone)],
         ['Propiedad', opts.listingTitle],
       ])}
       ${
         opts.recipient === 'business'
           ? button('Confirmar o rechazar', appUrl('/dashboard/viewings'), color)
           : button('Ver estado', appUrl('/portal/appointments'), color)
       }`
    ),
  })
}

export async function sendRescheduleConfirmedEmail(opts: {
  to: string
  clientName: string
  brand: EmailBrand
  scheduledAt: string
  listingTitle?: string | null
  timezone?: string | null
}) {
  return safeSend({
    to: opts.to,
    subject: `Nueva fecha confirmada · ${opts.brand.businessName}`,
    html: layout(
      opts.brand,
      `<p style="margin:0 0 12px;">Hola <strong>${esc(opts.clientName)}</strong>,</p>
       <p style="margin:0;"><strong>${esc(opts.brand.businessName)}</strong> confirmo tu nueva fecha.</p>
       ${details([
         ['Fecha y hora', fmtDate(opts.scheduledAt, opts.timezone)],
         ['Propiedad', opts.listingTitle],
       ])}
       ${button('Ver mi cita', appUrl('/portal/appointments'), opts.brand.primaryColor || DEFAULT_COLOR)}`
    ),
  })
}

export async function sendPaymentReceivedEmail(opts: {
  to: string
  recipient: 'client' | 'business'
  clientName: string
  brand: EmailBrand
  amount: number
  currency?: string
  scheduledAt: string
  listingTitle?: string | null
  timezone?: string | null
}) {
  const intro =
    opts.recipient === 'client'
      ? `<p style="margin:0;">Recibimos tu pago. Tu cita queda marcada como pagada por adelantado.</p>`
      : `<p style="margin:0;"><strong>${esc(opts.clientName)}</strong> pago su cita por adelantado.</p>`

  return safeSend({
    to: opts.to,
    subject:
      opts.recipient === 'client'
        ? `Pago confirmado · ${opts.brand.businessName}`
        : `Pago recibido · ${opts.clientName}`,
    html: layout(
      opts.brand,
      `${intro}
       ${details([
         ['Importe', money(opts.amount, opts.currency)],
         ['Cita', fmtDate(opts.scheduledAt, opts.timezone)],
         ['Propiedad', opts.listingTitle],
       ])}
       ${button(
         opts.recipient === 'client' ? 'Ver mi cita' : 'Ver en el panel',
         appUrl(opts.recipient === 'client' ? '/portal/appointments' : '/dashboard/viewings'),
         opts.brand.primaryColor || DEFAULT_COLOR
       )}`
    ),
  })
}

export async function sendAppointmentReminderEmail(opts: {
  to: string
  clientName: string
  brand: EmailBrand
  scheduledAt: string
  listingTitle?: string | null
  address?: string | null
  timezone?: string | null
}) {
  return safeSend({
    to: opts.to,
    subject: `Recordatorio: tu cita es manana · ${opts.brand.businessName}`,
    html: layout(
      opts.brand,
      `<p style="margin:0 0 12px;">Hola <strong>${esc(opts.clientName)}</strong>,</p>
       <p style="margin:0;">Te recordamos tu cita con <strong>${esc(opts.brand.businessName)}</strong>.</p>
       ${details([
         ['Fecha y hora', fmtDate(opts.scheduledAt, opts.timezone)],
         ['Propiedad', opts.listingTitle],
         ['Direccion', opts.address],
       ])}
       ${button('Ver o reagendar', appUrl('/portal/appointments'), opts.brand.primaryColor || DEFAULT_COLOR)}`
    ),
  })
}

export async function sendSupportMessageEmail(opts: {
  to: string
  recipient: 'client' | 'business'
  brand: EmailBrand
  subject: string
  preview: string
  ticketId: string
}) {
  const color = opts.brand.primaryColor || DEFAULT_COLOR
  return safeSend({
    to: opts.to,
    subject: `Nuevo mensaje · ${opts.subject}`,
    html: layout(
      opts.brand,
      `<p style="margin:0 0 6px;color:#667085;font-size:13px;">Ticket de soporte</p>
       <p style="margin:0 0 14px;font-size:17px;font-weight:600;">${esc(opts.subject)}</p>
       <blockquote style="margin:0;padding:12px 16px;background:#f9fafb;border-left:3px solid ${esc(color)};border-radius:0 8px 8px 0;color:#344054;">
         ${esc(opts.preview)}
       </blockquote>
       ${button(
         'Responder',
         appUrl(
           opts.recipient === 'client'
             ? `/portal/support/${opts.ticketId}`
             : `/dashboard/support?ticket=${opts.ticketId}`
         ),
         color
       )}`
    ),
  })
}

export async function sendPortalInviteEmail(opts: {
  to: string
  clientName: string
  brand: EmailBrand
  magicLink: string
}) {
  return safeSend({
    to: opts.to,
    subject: `Crea tu cuenta en el portal de ${opts.brand.businessName}`,
    html: layout(
      opts.brand,
      `<p style="margin:0 0 12px;">Hola <strong>${esc(opts.clientName)}</strong>,</p>
       <p style="margin:0;">Ya puedes gestionar tus citas con <strong>${esc(opts.brand.businessName)}</strong> desde tu portal: ver horarios, reagendar, cancelar, pagar y abrir tickets de soporte.</p>
       ${button('Acceder a mi portal', opts.magicLink, opts.brand.primaryColor || DEFAULT_COLOR)}
       <p style="margin:0;color:#667085;font-size:13px;">El enlace es de un solo uso y caduca en 1 hora. Si no lo solicitaste, ignora este correo.</p>`
    ),
  })
}

export async function sendPortalMagicLinkEmail(opts: {
  to: string
  brand: EmailBrand
  magicLink: string
}) {
  return safeSend({
    to: opts.to,
    subject: `Tu enlace de acceso · ${opts.brand.businessName}`,
    html: layout(
      opts.brand,
      `<p style="margin:0;">Haz clic para entrar a tu portal. No necesitas contrasena.</p>
       ${button('Entrar al portal', opts.magicLink, opts.brand.primaryColor || DEFAULT_COLOR)}
       <p style="margin:0;color:#667085;font-size:13px;">El enlace caduca en 1 hora y solo puede usarse una vez.</p>`
    ),
  })
}
