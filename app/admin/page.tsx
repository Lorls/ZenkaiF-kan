'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import { ROLES, ROLE_LABELS, Role } from '@/lib/permissions'

interface User { id: number; username: string; role: Role; createdAt: string }
interface NewUser extends User { password: string }

const ROLE_STYLES: Record<Role, string> = {
  GERANT: 'bg-gold/10 text-gold border-gold/20',
  MEMBRE: 'bg-bg-elevated text-ink-muted border-border',
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [me, setMe] = useState<{ userId: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [newUsername, setNewUsername] = useState('')
  const [newRole, setNewRole] = useState<Role>('MEMBRE')
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<NewUser | null>(null)
  const [resetResult, setResetResult] = useState<{ id: number; password: string } | null>(null)
  const [error, setError] = useState('')
  const [roleError, setRoleError] = useState('')

  async function load() {
    const [data, meData] = await Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/auth/me').then(r => r.ok ? r.json() : null),
    ])
    setUsers(Array.isArray(data) ? data : [])
    setMe(meData)
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
      body: JSON.stringify({ username: newUsername, role: newRole }),
    })
    const data = await res.json()
    if (res.ok) { setCreated(data); setNewUsername(''); load() }
    else setError(data.error)
    setCreating(false)
  }

  async function handleDelete(id: number, username: string) {
    if (!confirm(`Supprimer le compte de ${username} ?`)) return
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      setRoleError(d.error)
    } else {
      load()
    }
  }

  async function handleReset(id: number) {
    const res = await fetch(`/api/admin/users/${id}`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) setResetResult({ id, password: data.password })
  }

  async function handleRoleChange(id: number, role: Role) {
    setRoleError('')
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (!res.ok) {
      const d = await res.json()
      setRoleError(d.error)
    } else {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
    }
  }

  return (
    <>
      <Navbar />
      <div className="pt-14 lg:pt-0 lg:ml-64">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Panel Admin</h1>
          <p className="text-ink-muted text-sm mt-1">Gestion des comptes utilisateurs.</p>
        </div>

        {/* Create user */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-ink mb-4">Créer un compte</h2>
          <form onSubmit={handleCreate} className="flex gap-2">
            <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)}
              className="input flex-1" placeholder="Nom d'utilisateur" required />
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value as Role)}
              className="input w-40"
            >
              {ROLES.map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
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
              <p className="text-xs text-ink-muted mt-2">Identifiant : <strong>{created.username}</strong> · Rôle : <strong>{ROLE_LABELS[created.role]}</strong> — Ce mot de passe ne sera plus affiché.</p>
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

        {/* Role error */}
        {roleError && (
          <div className="card p-3 border-red-900/50 bg-red-950/20">
            <p className="text-red-400 text-sm">{roleError}</p>
            <button onClick={() => setRoleError('')} className="text-xs text-ink-faint mt-1 hover:text-ink">Fermer</button>
          </div>
        )}

        {/* Users list */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
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
                  <th className="text-left px-4 py-2.5 text-ink-muted font-medium">Créé le</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${u.role === 'GERANT' ? 'bg-gold/20 text-gold' : 'bg-bg-elevated text-ink-muted'}`}>
                          {u.username[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-ink">{u.username}</span>
                        {u.id === me?.userId && <span className="text-[10px] text-ink-faint">(moi)</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value as Role)}
                        className={`text-xs font-mono px-2 py-1 rounded border bg-transparent cursor-pointer focus:outline-none focus:ring-1 focus:ring-gold/40 ${ROLE_STYLES[u.role] ?? 'bg-bg-elevated text-ink-muted border-border'}`}
                      >
                        {ROLES.map(r => (
                          <option key={r} value={r} className="bg-bg-card text-ink">{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => handleReset(u.id)} className="btn-ghost text-xs px-2 py-1">Réinit. mdp</button>
                        {u.id !== me?.userId && (
                          <button onClick={() => handleDelete(u.id, u.username)} className="btn-danger text-xs px-2 py-1">Supprimer</button>
                        )}
                      </div>
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
