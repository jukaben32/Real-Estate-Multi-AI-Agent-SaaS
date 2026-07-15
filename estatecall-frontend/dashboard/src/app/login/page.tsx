'use client';

// Página de login del agente. Consume POST /api/auth/agent/login del backend.
// Si el backend no está disponible, muestra un aviso honesto (no se cuelga).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("agent@estatecall.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Si ya inició sesión, lo mandamos al panel.
  useEffect(() => {
    if (ready && user) router.replace("/");
  }, [ready, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err: any) {
      setError(err.message || "No pudimos conectar con el servidor. ¿Está el backend corriendo?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-paper px-4">
      <div className="w-full max-w-sm">
        {/* Cabecera */}
        <div className="text-center mb-8">
          <div className="inline-grid place-items-center w-12 h-12 rounded-2xl bg-emerald text-white font-bold text-xl mb-3">E</div>
          <h1 className="font-semibold text-2xl text-ink">EstateCall</h1>
          <p className="text-sm text-muted">Accede a tu panel del agente</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="bg-white border border-border rounded-3xl p-7 shadow-sm">
          <label className="block text-sm font-medium text-ink mb-1">Correo</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/40 mb-4"
          />

          <label className="block text-sm font-medium text-ink mb-1">Contraseña</label>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/40 mb-4"
          />

          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

          <button
            type="submit" disabled={loading}
            className="w-full text-sm font-semibold bg-emerald text-white rounded-full py-3 hover:bg-emerald-dark transition-colors disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>

          <p className="mt-4 text-center text-xs text-muted">
            Modo demo: entra con <span className="font-mono">agent@estatecall.com</span> / <span className="font-mono">password123</span> (el login real se activa al conectar el backend).
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          ¿Eres cliente? El acceso de cliente llega pronto.
        </p>
      </div>
    </div>
  );
}
