'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const LINKS = [
  { href: '/portal', label: 'Inicio' },
  { href: '/portal/appointments', label: 'Citas' },
  { href: '/portal/support', label: 'Soporte' },
]

export function PortalNav({ clientName }: { clientName: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/portal/login')
    router.refresh()
  }

  return (
    <nav className="flex items-center gap-1 text-sm">
      {LINKS.map((l) => {
        const active = l.href === '/portal' ? pathname === l.href : pathname.startsWith(l.href)
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`px-2.5 py-1.5 rounded-lg transition-colors ${
              active
                ? 'bg-[var(--teal-50)] text-[var(--teal-700)] font-medium'
                : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
            }`}
          >
            {l.label}
          </Link>
        )
      })}
      <button
        onClick={signOut}
        title={clientName}
        className="ml-1 px-2.5 py-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)]"
      >
        Salir
      </button>
    </nav>
  )
}
