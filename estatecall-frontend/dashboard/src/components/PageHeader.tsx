'use client';

// Encabezado reutilizable para cada página del panel.
export default function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-semibold text-2xl text-ink">{title}</h1>
      {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
    </div>
  );
}
