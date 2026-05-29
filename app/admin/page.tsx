'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'

interface User { id: number; username: string; isAdmin: boolean; createdAt: string; actionCount: number }
interface NewUser extends User { password: string }

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [newUsername, setNewUsername] = useState('')
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<NewUser | null>(null)
  const [resetResult, setResetResult] = useState<{ id: number; password: string } | null>(null)
  const [error, setError] = useState('')

  async function load() {
    const data = await fetch('/api/admin/users').then(r => r.json())
    setUsers(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newUsername.trim()) return
    setCreating(true)
    setError('')
    const res = await fetch('/api/admin/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: newUsername }),
    })
    const data = await res.json()
    if (res.ok) { setCreated(data); setNewUsername(''); load() }
    else setError(data.error)
    setCreating(false)
  }

  async function handleDelete(id: number, username: string) {
    if (!confirm(`Supprimer le compte de ${username} ?`)) return
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    load()
  }

  async function handleReset(id: number) {
    const res = await fetch(`/api/admin/users/${id}`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) setResetResult({ id, password: data.password })
  }

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Panel Admin</h1>
          <p className="text-ink-muted text-sm mt-1">Gestion des comptes — chaque action est tracée sous l&apos;identité de son auteur.</p>
        </div>

        {/* Create user */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-ink mb-4">Créer un compte ninja</h2>
          <form onSubmit={handleCreate} className="flex gap-2">
            <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)}
              className="input flex-1" placeholder="Nom d'utilisateur (ex: Temari)" required />
            <button type="submit" disabled={creating || !newUsername.trim()} className="btn-primary whitespace-nowrap">
              {creating ? 'Création...' : 'Créer'}
            </button>
          </form>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

          {created && (
            <div className="mt-4 p-4 rounded-lg border border-emerald-900 bg-emerald-950/30">
              <p className="text-emerald-400 font-medium mb-2">Compte créé — mot de passe à copier maintenant :</p>
              <div className="flex items-center gap-3">
                <code className="font-mono text-xl tracking-widest text-ink bg-bg-elevated px-4 py-2 rounded-lg">
                  {created.password}
                </code>
                <button onClick={() => navigator.clipboard.writeText(created.password)} className="btn-ghost text-sm">
                  Copier
                </button>
              </div>
              <p className="text-xs text-ink-muted mt-2">Identifiant : <strong>{created.username}</strong> — Ce mot de passe ne sera plus affiché.</p>
              <button onClick={() => setCreated(null)} className="text-xs text-ink-faint mt-2 hover:text-ink">Fermer</button>
            </div>
          )}
        </div>

        {/* Reset password result */}
        {resetResult && (
          <div className="card p-4 border-gold/30 bg-gold/5">
            <p className="text-gold font-medium mb-2">Nouveau mot de passe :</p>
            <div className="flex items-center gap-3">
              <code className="font-mono text-xl tracking-widest text-ink bg-bg-elevated px-4 py-2 rounded-lg">{resetResult.password}</code>
              <button onClick={() => navigator.clipboard.writeText(resetResult.password)} className="btn-ghost text-sm">Copier</button>
            </div>
            <button onClick={() => setResetResult(null)} className="text-xs text-ink-faint mt-2 hover:text-ink">Fermer</button>
          </div>
        )}

        {/* Users list */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Comptes ({users.length})</h2>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-bg-elevated rounded animate-pulse" />)}</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-elevated/40">
                  <th className="text-left px-4 py-2.5 text-ink-muted font-medium">Identifiant</th>
                  <th className="text-left px-4 py-2.5 text-ink-muted font-medium">Rôle</th>
                  <th className="text-right px-4 py-2.5 text-ink-muted font-medium">Actions</th>
                  <th className="text-left px-4 py-2.5 text-ink-muted font-medium">Créé le</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-4 py-3 font-medium text-ink flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${u.isAdmin ? 'bg-gold/20 text-gold' : 'bg-bg-elevated text-ink-muted'}`}>
                        {u.username[0].toUpperCase()}
                      </div>
                      {u.username}
                    </td>
                    <td className="px-4 py-3">
                      {u.isAdmin ? <span className="text-xs font-mono bg-gold/10 text-gold px-2 py-0.5 rounded">ADMIN</span>
                                 : <span className="text-xs text-ink-muted">Ninja</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-ink-muted text-xs">{u.actionCount}</td>
                    <td className="px-4 py-3 text-xs text-ink-muted">{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3">
                      {!u.isAdmin && (
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => handleReset(u.id)} className="btn-ghost text-xs px-2 py-1">Réinit. mdp</button>
                          <button onClick={() => handleDelete(u.id, u.username)} className="btn-danger text-xs px-2 py-1">Supprimer</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  )
}
