'use client';

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { getList } from "@/lib/api";
import { DEMO_PROPERTIES } from "@/lib/demo";
import { Property } from "@/lib/types";

export default function PropertiesPage() {
  const [items, setItems] = useState<Property[]>(DEMO_PROPERTIES);
  const [live, setLive] = useState(false);

  useEffect(() => {
    getList<Property[]>("/properties", DEMO_PROPERTIES).then((r) => {
      setItems(r.data);
      setLive(r.live);
    });
  }, []);

  return (
    <div>
      <PageHeader title="Propiedades" subtitle={live ? "Datos en vivo" : "Vista previa (demo)"} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((p) => (
          <div key={p.id} className="bg-white border border-border rounded-2xl p-5">
            <p className="font-semibold text-ink">{p.title}</p>
            <p className="text-emerald font-semibold mt-1">{p.price}</p>
            <p className="text-xs text-muted mt-1">{p.city}</p>
            <div className="mt-3 pt-3 border-t border-border flex gap-3 text-xs text-muted">
              {p.beds > 0 && <span>{p.beds} hab.</span>}
              {p.baths > 0 && <span>{p.baths} baños</span>}
              <span className="ml-auto text-emerald">{p.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
