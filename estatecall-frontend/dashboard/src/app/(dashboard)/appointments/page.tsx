'use client';

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { getList } from "@/lib/api";
import { DEMO_APPOINTMENTS } from "@/lib/demo";
import { Appointment } from "@/lib/types";

export default function AppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>(DEMO_APPOINTMENTS);
  const [live, setLive] = useState(false);

  useEffect(() => {
    getList<Appointment[]>("/appointments", DEMO_APPOINTMENTS).then((r) => {
      setItems(r.data);
      setLive(r.live);
    });
  }, []);

  return (
    <div>
      <PageHeader title="Citas" subtitle={live ? "Datos en vivo" : "Vista previa (demo)"} />
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-paper2 text-muted">
            <tr>
              <th className="text-left font-medium px-5 py-3">Cliente</th>
              <th className="text-left font-medium px-5 py-3">Propiedad</th>
              <th className="text-left font-medium px-5 py-3">Fecha</th>
              <th className="text-left font-medium px-5 py-3">Hora</th>
              <th className="text-left font-medium px-5 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((a) => (
              <tr key={a.id}>
                <td className="px-5 py-3 font-medium text-ink">{a.client}</td>
                <td className="px-5 py-3 text-body">{a.property}</td>
                <td className="px-5 py-3 text-body">{a.date}</td>
                <td className="px-5 py-3 text-body">{a.time}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${a.status === "Confirmada" ? "bg-emerald-light text-emerald-dark" : "bg-paper2 text-muted"}`}>
                    {a.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
