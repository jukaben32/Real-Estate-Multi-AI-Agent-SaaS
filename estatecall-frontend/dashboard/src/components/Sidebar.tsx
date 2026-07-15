'use client';

// Barra lateral (sidebar) del panel. Navegación principal.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const links = [
  { href: "/", label: "Inicio", icon: Grid },
  { href: "/properties", label: "Propiedades", icon: Home },
  { href: "/appointments", label: "Citas", icon: Calendar },
  { href: "/calls", label: "Llamadas", icon: Phone },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/ai-agents", label: "Agentes IA", icon: Bot },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 shrink-0 bg-ink text-paper flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2 px-6 border-b border-white/10">
        <span className="grid place-items-center w-9 h-9 rounded-xl bg-emerald text-white font-bold text-lg">E</span>
        <span className="font-semibold text-lg">Estate<span className="text-emerald">Call</span></span>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((l) => {
          const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                active ? "bg-emerald text-white" : "text-paper/70 hover:bg-white/10"
              }`}
            >
              <Icon className="w-5 h-5" />
              {l.label}
            </Link>
          );
        })}
      </nav>

      {/* Pie: usuario + salir */}
      <div className="p-3 border-t border-white/10">
        <div className="px-3 py-2 text-sm">
          <p className="font-semibold text-paper">{user?.name || "Agente"}</p>
          <p className="text-paper/50 text-xs truncate">{user?.email || ""}</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-paper/70 hover:bg-white/10 transition-colors"
        >
          <Logout className="w-5 h-5" /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

// ---- Iconos (SVG en línea, sin dependencias) ----
function Grid(props: any) { return <svg {...props} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>; }
function Home(props: any) { return <svg {...props} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>; }
function Calendar(props: any) { return <svg {...props} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>; }
function Phone(props: any) { return <svg {...props} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>; }
function Users(props: any) { return <svg {...props} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1A4 4 0 0 1 16 11"/></svg>; }
function Bot(props: any) { return <svg {...props} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4M8 16h.01M16 16h.01"/></svg>; }
function Logout(props: any) { return <svg {...props} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>; }
