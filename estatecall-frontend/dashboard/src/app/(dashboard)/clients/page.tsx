'use client';

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { getList } from "@/lib/api";
import { DEMO_CLIENTS } from "@/lib/demo";
import { Client } from "@/lib/types";

export default function ClientsPage() {
  const [items, setItems] = useState<Client[]>(DEMO_CLIENTS);
  const [live, setLive] = useState(false);

  useEffect(() => {
    getList<Client[]>("/clients", DEMO_CLIENTS).then((r) => {
      setItems(r.data);
      setLive(r.live);
    });
  }, []);

  return (
    <div>
      <PageHeader title="Clientes" subtitle={live ? "Datos en vivo" : "Vista previa (demo)"} />
      <div className="grid sm:grid-cols-2 gap-4">
        {items.map((c) => (
          <div key={c.id} className="bg-white border border-border rounded-2xl p-5">
            <p className="font-semibold text-ink">{c.name}</p>
            <p className="text-xs text-muted mt-0.5">{c.email} · {c.phone}</p>
            <p className="text-sm text-body mt-2">Interés: <span className="text-emerald">{c.interest}</span></p>
          </div>
        ))}
      </div>
    </div>
  );
}
