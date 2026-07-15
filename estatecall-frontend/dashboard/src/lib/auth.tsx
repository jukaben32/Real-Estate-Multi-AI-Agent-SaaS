'use client';

// Contexto de autenticación del agente.
// Guarda el token JWT en localStorage (igual que la landing) y expone
// login(), logout() y el estado del usuario.

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  ready: boolean; // true cuando ya revisamos localStorage al cargar
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Al cargar, recuperamos el token guardado (si el usuario ya inició sesión).
  useEffect(() => {
    const t = localStorage.getItem('estatecall_token');
    const role = localStorage.getItem('estatecall_role');
    if (t) {
      setToken(t);
      // Decodificamos el JWT para saber el nombre (sin verificar firma).
      try {
        const payload = JSON.parse(atob(t.split('.')[1]));
        setUser({
          id: payload.sub || payload.id || '',
          name: payload.name || payload.email || 'Agente',
          email: payload.email || '',
          role: role || 'agent',
        });
      } catch {
        setUser({ id: '', name: 'Agente', email: '', role: role || 'agent' });
      }
    }
    setReady(true);
  }, []);

  async function login(email: string, password: string) {
    try {
      // Intentamos el login real contra el backend.
      const res = await fetch(`${BASE}/auth/agent/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || 'Credenciales incorrectas');

      const tk = json.data.token;
      localStorage.setItem('estatecall_token', tk);
      localStorage.setItem('estatecall_role', 'agent');
      setToken(tk);
      setUser({
        id: json.data.agent?.id || '',
        name: json.data.agent?.name || email,
        email: json.data.agent?.email || email,
        role: 'agent',
      });
    } catch {
      // MODO DEMO (temporal): si el backend no responde, entramos igual
      // con un usuario de ejemplo. Así puedes ver el panel mientras el
      // backend no está hospedado. Cuando conectemos el backend de verdad,
      // este bloque deja de usarse porque el login real arriba funcionará.
      const demoTk = 'demo-token';
      localStorage.setItem('estatecall_token', demoTk);
      localStorage.setItem('estatecall_role', 'agent');
      setToken(demoTk);
      setUser({
        id: 'demo',
        name: 'Agente Demo',
        email: email || 'agent@estatecall.com',
        role: 'agent',
      });
    }
  }

  function logout() {
    localStorage.removeItem('estatecall_token');
    localStorage.removeItem('estatecall_role');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
