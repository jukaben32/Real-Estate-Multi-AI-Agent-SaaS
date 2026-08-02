'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function PortalLoginPage() {
  return (
    <Suspense>
      <PortalLoginForm />
    </Suspense>
  )
}

function PortalLoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const redirect = searchParams.get('redirect') || '/portal'
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // shouldCreateUser: el cliente puede no tener cuenta todavía; su primera
        // reserva la hizo el agente IA por teléfono, no él.
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/portal/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    })

    setLoading(false)
    if (authError) {
      setError(authError.message)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="card-raised p-7 max-w-sm mx-auto mt-10 text-center">
        <h1 className="font-display text-xl font-semibold text-[var(--text-1)] mb-2">
          Revisa tu correo
        </h1>
        <p className="text-sm text-[var(--text-3)]">
          Te enviamos un enlace de acceso a <strong>{email}</strong>. Caduca en 1 hora.
        </p>
        <button className="btn-secondary mt-5" onClick={() => setSent(false)}>
          Usar otro correo
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card-raised p-7 space-y-4 max-w-sm mx-auto mt-10">
      <div className="text-center mb-2">
        <h1 className="font-display text-2xl font-semibold text-[var(--text-1)]">Tu portal</h1>
        <p className="text-sm text-[var(--text-3)]">
          Entra con tu correo. No necesitas contraseña.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <label className="block text-sm font-medium text-[var(--text-1)] mb-1">Correo</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
          placeholder="tu@correo.com"
          required
        />
      </div>
      <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
        {loading ? 'Enviando…' : 'Enviarme el enlace'}
      </button>
      <p className="text-xs text-center text-[var(--text-3)]">
        Usa el mismo correo que diste al reservar tu cita.
      </p>
    </form>
  )
}
