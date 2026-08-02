import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Intercambia el código del enlace mágico por una sesión y, lo importante,
// enlaza el usuario de auth recién creado con su ficha en `clients`.
// Sin este enlace el cliente entraría al portal y no vería ninguna cita.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') || '/portal'

  if (!code) {
    return NextResponse.redirect(`${origin}/portal/login?error=enlace_invalido`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user?.email) {
    return NextResponse.redirect(`${origin}/portal/login?error=enlace_expirado`)
  }

  // El agente IA crea fichas de cliente sin `auth_user_id`. Al entrar por
  // primera vez las reclamamos por correo. Requiere service role porque RLS
  // aún no reconoce a este usuario como dueño de esas filas.
  try {
    const admin = createAdminClient()
    await admin
      .from('clients')
      .update({ auth_user_id: data.user.id, portal_last_seen_at: new Date().toISOString() })
      .ilike('email', data.user.email)
      .is('auth_user_id', null)
  } catch (err) {
    console.error('[portal-callback] no se pudo enlazar el cliente:', err)
  }

  return NextResponse.redirect(`${origin}${redirect}`)
}
