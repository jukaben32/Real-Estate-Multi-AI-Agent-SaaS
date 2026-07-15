'use client';

// Home del panel: tarjetas de estadísticas + resumen de Alexis.
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { apiFetch, getList } from "@/lib/api";
import { DEMO_STATS, DEMO_APPOINTMENTS, DEMO_AGENTS } from "@/lib/demo";
import { Stats, Appointment, Agent } from "@/lib/types";

export default function HomePage() {
  const [stats, setStats] = useState<Stats>(DEMO_STATS);
  const [appts, setAppts] = useState<Appointment[]>(DEMO_APPOINTMENTS);
  const [agent, setAgent] = useState<Agent>(DEMO_AGENTS[0]);
  const [live, setLive] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await getList<Stats>("/properties", DEMO_STATS);
      // Las stats no vienen en una lista; las calculamos de lo que sí existe.
      const p = await getList("/properties", []);
      const a = await getList("/appointments", DEMO_APPOINTMENTS);
      const c = await getList("/calls", []);
      const cl = await getList("/clients", []);
      setLive(p.live || a.live || c.live || cl.live);
      setStats({
        properties: p.data.length,
        appointments: a.data.length,
        calls: c.data.length,
        clients: cl.data.length,
      });
      setAppts(a.data);
    })();
  }, []);

  const cards = [
    { label: "Propiedades", value: stats.properties, color: "text-emerald" },
    { label: "Citas", value: stats.appointments, color: "text-emerald" },
    { label: "Llamadas", value: stats.calls, color: "text-emerald" },
    { label: "Clientes", value: stats.clients, color: "text-emerald" },
  ];

  return (
    <div>
      <PageHeader title="Inicio" subtitle={live ? "Datos en vivo del backend" : "Vista previa (demo)"} />

      {/* Tarjetas de stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-border rounded-2xl p-5">
            <p className="text-sm text-muted">{c.label}</p>
            <p className={`font-semibold text-3xl mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        {/* Próximas citas */}
        <div className="lg:col-span-2 bg-white border border-border rounded-2xl p-5">
          <h2 className="font-semibold text-ink mb-3">Próximas citas</h2>
          <ul className="divide-y divide-border">
            {appts.map((a) => (
              <li key={a.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">{a.client}</p>
                  <p className="text-xs text-muted">{a.property}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-ink">{a.date}</p>
                  <p className="text-xs text-emerald">{a.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Alexis */}
        <div className="bg-ink text-paper rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-10 h-10 rounded-full bg-emerald-light text-emerald font-bold">A</span>
            <div>
              <p className="font-semibold">{agent.name}</p>
              <p className="text-xs text-paper/60">{agent.type}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="bg-white/10 rounded-xl py-3">
              <p className="font-semibold text-xl">{agent.callsToday}</p>
              <p className="text-xs text-paper/60">llamadas hoy</p>
            </div>
            <div className="bg-white/10 rounded-xl py-3">
              <p className="font-semibold text-xl">{agent.language}</p>
              <p className="text-xs text-paper/60">idiomas</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-emerald flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald animate-pulse" /> Activo ahora
          </p>
        </div>
      </div>
    </div>
  );
}
