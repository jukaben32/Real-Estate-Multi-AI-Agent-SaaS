'use client'

import { useState } from 'react'
import type { BusinessService } from '@/types'

export function ServicesManager({ initialServices }: { initialServices: BusinessService[] }) {
  const [services, setServices] = useState(initialServices)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: '' })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        description: form.description || undefined,
        price: form.price ? Number(form.price) : undefined,
      }),
    })
    if (res.ok) {
      const { service } = await res.json()
      setServices((prev) => [...prev, service])
      setForm({ name: '', description: '', price: '' })
      setShowForm(false)
    }
  }

  async function toggleActive(service: BusinessService) {
    const res = await fetch(`/api/services/${service.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !service.is_active }),
    })
    if (res.ok) {
      const { service: updated } = await res.json()
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    }
  }

  async function remove(serviceId: string) {
    if (!confirm('Delete this service?')) return
    const res = await fetch(`/api/services/${serviceId}`, { method: 'DELETE' })
    if (res.ok) setServices((prev) => prev.filter((s) => s.id !== serviceId))
  }

  return (
    <div>
      {!showForm && (
        <button className="btn-primary mb-4" onClick={() => setShowForm(true)}>
          + New Service
        </button>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="card-surface p-4 mb-4 grid grid-cols-2 gap-3">
          <input
            placeholder="Service name (e.g. Property Viewing)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="col-span-2 border rounded-lg px-3 py-2"
            required
          />
          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="col-span-2 border rounded-lg px-3 py-2"
          />
          <input
            type="number"
            placeholder="Price (optional)"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="border rounded-lg px-3 py-2"
            min={0}
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {services.map((service) => (
          <div key={service.id} className="card-surface p-3 flex items-center justify-between">
            <div>
              <p className="font-medium">{service.name}</p>
              <p className="text-xs text-[var(--text-3)]">
                {service.description}
                {service.price != null ? ` · $${service.price.toLocaleString()}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleActive(service)}
                className={`text-xs rounded-full px-3 py-1 ${
                  service.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {service.is_active ? 'Active' : 'Inactive'}
              </button>
              <button onClick={() => remove(service.id)} className="text-red-600 text-sm">
                Delete
              </button>
            </div>
          </div>
        ))}
        {services.length === 0 && (
          <p className="text-sm text-[var(--text-3)]">
            No services yet — add what your AI agent should offer callers.
          </p>
        )}
      </div>
    </div>
  )
}
