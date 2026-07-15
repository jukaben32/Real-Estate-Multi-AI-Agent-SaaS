'use client';

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { getList } from "@/lib/api";
import { DEMO_CALLS } from "@/lib/demo";
import { Call } from "@/lib/types";

export default function CallsPage() {
  const [items, setItems] = useState<Call[]>(DEMO_CALLS);
  const [live, setLive] = useState(false);

  useEffect(() => {
    getList<Call[]>("/calls", DEMO_CALLS).then((r) => {
      setItems(r.data);
      setLive(r.live);
    });
  }, []);

  return (
    <div>
      <PageHeader title="Llamadas" subtitle={live ? "Datos en vivo" : "Vista previa (demo)"} />
      <div className="space-y-3">
        {items.map((c) => (
          <div key={c.id} className="bg-white border border-border rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="font-medium text-ink">{c.client}</p>
              <p className="text-xs text-muted">{c.date} · {Math.floor(c.durationSec / 60)} min {c.durationSec % 60} s</p>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full ${
              c.outcome === "Cita agendada" ? "bg-emerald-light text-emerald-dark"
                : c.outcome === "No interesa" ? "bg-paper2 text-muted"
                : "bg-gold/15 text-gold"
            }`}>{c.outcome}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
