// Cliente HTTP de la API del backend.
// La URL base se lee de NEXT_PUBLIC_API_URL (variable de entorno de Vercel).
// Si no existe, usa el backend local (tu PC en el puerto 4000).

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// Petición genérica con el token de auth (guardado en localStorage).
export async function apiFetch(path: string, opts: RequestInit = {}) {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('estatecall_token') : null;

  const headers = new Headers(opts.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any)?.message || `Error ${res.status}`);
  return json;
}

// Intenta la API real. Si falla (backend apagado, CORS, etc.) usa datos demo.
// Devuelve { data, live }: live=true si vino de la API de verdad.
export async function getList<T>(
  path: string,
  demo: T
): Promise<{ data: T; live: boolean }> {
  try {
    const json = await apiFetch(path);
    const items =
      (json as any)?.data?.items ??
      (json as any)?.items ??
      (json as any)?.data ??
      [];
    if (!Array.isArray(items) || items.length === 0) throw new Error('sin datos');
    return { data: items as T, live: true };
  } catch {
    return { data: demo, live: false };
  }
}
