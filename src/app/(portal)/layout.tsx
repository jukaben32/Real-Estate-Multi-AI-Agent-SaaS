import type { ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getPortalContext } from '@/services/portal'
import { PortalNav } from '@/components/PortalNav'

// Este layout NO redirige: /portal/login vive dentro del grupo y debe poder
// renderizarse sin sesión. El middleware ya protege el resto de /portal/*.
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const ctx = user ? await getPortalContext(supabase, user.id) : null

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <header className="bg-white border-b border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/portal" className="flex items-center gap-2 min-w-0">
            {ctx?.business.logo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={ctx.business.logo_url}
                alt={ctx.business.name}
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <span className="grid place-items-center w-8 h-8 rounded-lg bg-[var(--teal-700)] text-white font-display font-bold text-sm">
                {(ctx?.business.name ?? 'E').charAt(0).toUpperCase()}
              </span>
            )}
            <span className="font-display font-semibold text-[var(--text-1)] truncate">
              {ctx?.business.name ?? 'Portal'}
            </span>
          </Link>
          {ctx && <PortalNav clientName={ctx.client.name} />}
        </div>
      </header>
      <main className="max-w-3xl mx-auto p-4">{children}</main>
    </div>
  )
}
