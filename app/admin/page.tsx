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
  const [wiping, setWiping] = useState(false)
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

  async function handleWipe() {
    if (!confirm('Supprimer TOUS les ninjas, dons, taxes et logs ?\n\nLes comptes et paramètres sont conservés.\nCette action est irréversible.')) return
    setWiping(true)
    await fetch('/api/admin/reset', { method: 'POST' })
    setWiping(false)
  }

  async function handleReset(id: number) {
    const res = await fetch(`/api/admin/users/${id}`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) setResetResult({ id, password: data.password })
  }

  return (
    <>
      <Navbar />
      <div className="ml-64">
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

        {/* Danger zone */}
        <div className="card p-6 border-red-900/50">
          <h2 className="text-base font-semibold text-red-400 mb-1">Zone dangereuse</h2>
          <p className="text-ink-muted text-sm mb-4">
            Supprime tous les ninjas, leurs dons, taxes et logs. Les comptes utilisateurs et les paramètres sont conservés.
          </p>
          <button
            onClick={handleWipe}
            disabled={wiping}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-950 border border-red-900 text-red-400 hover:bg-red-900 hover:text-red-300 transition-colors duration-200 text-sm font-medium cursor-pointer disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            {wiping ? 'Suppression...' : 'Supprimer tous les ninjas et données'}
          </button>
        </div>

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
      </div>
    </>
  )
}
