'use client'

import { useState } from 'react'
import type { Website, Business } from '@/types'

export function WebsiteEditor({ business, initialWebsite }: { business: Business; initialWebsite: Website | null }) {
  const [form, setForm] = useState({
    isPublished: initialWebsite?.is_published ?? false,
    headline: initialWebsite?.headline ?? '',
    about: initialWebsite?.about ?? '',
    theme: initialWebsite?.theme ?? 'light',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const siteUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/sites/${business.slug}` : `/sites/${business.slug}`

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    await fetch('/api/website', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <form onSubmit={save} className="card-surface p-4 max-w-2xl space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isPublished}
          onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
        />
        Published
      </label>
      {form.isPublished && (
        <p className="text-xs text-[var(--text-3)]">
          Live at{' '}
          <a href={siteUrl} target="_blank" rel="noreferrer" className="text-[var(--teal-600)]">
            {siteUrl}
          </a>
        </p>
      )}
      <div>
        <label className="text-xs text-[var(--text-3)]">Headline</label>
        <input
          value={form.headline}
          onChange={(e) => setForm({ ...form, headline: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Find your next home with us"
        />
      </div>
      <div>
        <label className="text-xs text-[var(--text-3)]">About</label>
        <textarea
          value={form.about}
          onChange={(e) => setForm({ ...form, about: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
          rows={4}
        />
      </div>
      <div>
        <label className="text-xs text-[var(--text-3)]">Theme</label>
        <select
          value={form.theme}
          onChange={(e) => setForm({ ...form, theme: e.target.value })}
          className="border rounded-lg px-3 py-2"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save website'}
      </button>
    </form>
  )
}
