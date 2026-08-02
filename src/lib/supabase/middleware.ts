import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

type CookieToSet = { name: string; value: string; options: CookieOptions }

const DASHBOARD_PREFIX = '/dashboard'
const PORTAL_PREFIX = '/portal'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isProtected = path.startsWith(DASHBOARD_PREFIX) || path.startsWith(PORTAL_PREFIX)

  // El portal del cliente y el panel del agente tienen logins distintos:
  // mandar a un cliente al login del agente lo dejaba en un callejón sin salida.
  const isPortal = path.startsWith(PORTAL_PREFIX)
  const isPortalPublic = path === '/portal/login' || path.startsWith('/portal/auth')

  if (!user && isProtected && !isPortalPublic) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = isPortal ? '/portal/login' : '/login'
    loginUrl.searchParams.set('redirect', path)
    return NextResponse.redirect(loginUrl)
  }

  return response
}
