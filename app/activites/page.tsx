'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'

interface ActivityType { id: number; name: string; points: number; active: boolean; createdAt: string }

export default function ActivitesPage() {
  const [types, setTypes] = useState<ActivityType[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [points, setPoints] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<{ id: number; name: string; points: string } | null>(null)
  const [error, setError] = useState('')

  async function load() {
    const data = await fetch('/api/activity-types').then(r => r.ok ? r.json() : [])
    setTypes(data)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true); setError('')
    const res = await fetch('/api/activity-types', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, points: Number(points) }),
    })
    if (res.ok) { setName(''); setPoints(''); load() }
    else { const d = await res.json(); setError(d.error) }
    setCreating(false)
  }

  async function handleEdit(id: number) {
    if (!editing) return
    const res = await fetch(`/api/activity-types/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editing.name, points: Number(editing.points) }),
    })
    if (res.ok) { setEditing(null); load() }
  }

  async function handleToggle(id: number, active: boolean) {
    await fetch(`/api/activity-types/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    load()
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Supprimer le type "${name}" ?`)) return
    await fetch(`/api/activity-types/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <>
      <Navbar />
      <div className="pt-14 lg:pt-0 lg:ml-64 min-h-screen">
        <div className="px-6 py-6 max-w-6xl mx-auto">

          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-ink">Types d'activité</h1>
          </div>

          {/* Formulaire création */}
          <div className="card p-5 mb-6">
            <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-4">Ajouter un type</h2>
            <form onSubmit={handleCreate} className="flex gap-3">
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="input flex-1" placeholder="Nom de l'activité" required />
              <input type="number" value={points} onChange={e => setPoints(e.target.value)} className="input w-36" placeholder="Points" min="0" required />
              <button type="submit" disabled={creating || !name.trim() || !points} className="btn-primary whitespace-nowrap px-6">
                {creating ? 'Ajout...' : 'Ajouter'}
              </button>
            </form>
            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          </div>

          {/* Tableau */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Types ({types.length})</h2>
            </div>
            {loading ? (
              <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-bg-elevated rounded animate-pulse" />)}</div>
            ) : types.length === 0 ? (
              <p className="p-5 text-ink-muted text-sm">Aucun type créé.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-elevated/40">
                    <th className="text-left px-5 py-3 text-ink-muted font-medium">Nom</th>
                    <th className="text-left px-5 py-3 text-ink-muted font-medium w-40">Points</th>
                    <th className="text-left px-5 py-3 text-ink-muted font-medium w-32">Statut</th>
                    <th className="text-left px-5 py-3 text-ink-muted font-medium w-32">Créé le</th>
                    <th className="px-5 py-3 w-48" />
                  </tr>
                </thead>
                <tbody>
                  {types.map(t => (
                    <tr key={t.id} className="border-b border-border-subtle last:border-0 hover:bg-bg-elevated/20 transition-colors">
                      <td className="px-5 py-3">
                        {editing?.id === t.id ? (
                          <input value={editing.name} onChange={e => setEditing(prev => prev ? { ...prev, name: e.target.value } : prev)} className="input text-sm py-1.5 w-full" />
                        ) : (
                          <span className="font-medium text-ink">{t.name}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {editing?.id === t.id ? (
                          <input type="number" value={editing.points} onChange={e => setEditing(prev => prev ? { ...prev, points: e.target.value } : prev)} className="input text-sm py-1.5 w-24" min="0" />
                        ) : (
                          <span className="font-mono font-bold text-gold">{t.points}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <button onClick={() => handleToggle(t.id, t.active)} className={`text-[10px] font-mono px-2.5 py-1 rounded border cursor-pointer transition-colors ${t.active ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40 hover:bg-emerald-950' : 'bg-bg-elevated text-ink-muted border-border hover:bg-bg-elevated'}`}>
                          {t.active ? 'Actif' : 'Inactif'}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-xs text-ink-muted">{new Date(t.createdAt).toLocaleDateString('fr-FR')}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          {editing?.id === t.id ? (
                            <>
                              <button onClick={() => handleEdit(t.id)} className="btn-primary text-xs px-3 py-1.5">Sauver</button>
                              <button onClick={() => setEditing(null)} className="btn-ghost text-xs px-3 py-1.5">Annuler</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => setEditing({ id: t.id, name: t.name, points: String(t.points) })} className="btn-ghost text-xs px-3 py-1.5">Éditer</button>
                              <button onClick={() => handleDelete(t.id, t.name)} className="btn-danger text-xs px-3 py-1.5">Supprimer</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
