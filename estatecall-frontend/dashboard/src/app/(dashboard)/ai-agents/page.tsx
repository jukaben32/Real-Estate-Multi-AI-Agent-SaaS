'use client';

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { getList } from "@/lib/api";
import { DEMO_AGENTS } from "@/lib/demo";
import { Agent } from "@/lib/types";

export default function AgentsPage() {
  const [items, setItems] = useState<Agent[]>(DEMO_AGENTS);
  const [live, setLive] = useState(false);

  useEffect(() => {
    getList<Agent[]>("/ai-agents", DEMO_AGENTS).then((r) => {
      setItems(r.data);
      setLive(r.live);
    });
  }, []);

  return (
    <div>
      <PageHeader title="Agentes IA" subtitle={live ? "Datos en vivo" : "Vista previa (demo)"} />
      <div className="grid sm:grid-cols-2 gap-4">
        {items.map((a) => (
          <div key={a.id} className="bg-white border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid place-items-center w-11 h-11 rounded-full bg-emerald-light text-emerald font-bold">{a.name[0]}</span>
                <div>
                  <p className="font-semibold text-ink">{a.name}</p>
                  <p className="text-xs text-muted">{a.type}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${a.status === "Activo" ? "bg-emerald-light text-emerald-dark" : "bg-paper2 text-muted"}`}>
                {a.status}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="bg-paper2 rounded-xl py-2">
                <p className="font-semibold text-ink">{a.callsToday}</p>
                <p className="text-xs text-muted">llamadas hoy</p>
              </div>
              <div className="bg-paper2 rounded-xl py-2">
                <p className="font-semibold text-ink">{a.language}</p>
                <p className="text-xs text-muted">idiomas</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
