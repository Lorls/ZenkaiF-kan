'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import { weekLabel, getWeekStart } from '@/lib/week'

interface User { id: number; username: string }
interface MalusEntry { id: number; malusName: string; points: number; createdAt: string; user: { username: string } }

export default function MalusPage() {
  const [users, setUsers] = useState<User[]>([])
  const [malus, setMalus] = useState<MalusEntry[]>([])
  const [userId, setUserId] = useState('')
  const [malusName, setMalusName] = useState('')
  const [points, setPoints] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState('')

  const week = getWeekStart()

  async function load() {
    const [u, m] = await Promise.all([
      fetch('/api/admin/users').then(r => r.ok ? r.json() : []),
      fetch(`/api/malus?week=${week.toISOString().split('T')[0]}`).then(r => r.ok ? r.json() : []),
    ])
    setUsers(Array.isArray(u) ? u : [])
    setMalus(Array.isArray(m) ? m : [])
    if (Array.isArray(u) && u.length > 0 && !userId) setUserId(String(u[0].id))
  }
  useEffect(() => { load() }, [])

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    setAssigning(true); setError('')
    const res = await fetch('/api/malus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: Number(userId), malusName, points: Number(points) }),
    })
    if (res.ok) { setMalusName(''); setPoints(''); load() }
    else { const d = await res.json(); setError(d.error) }
    setAssigning(false)
  }

  async function handleDelete(id: number) {
    await fetch(`/api/malus/${id}`, { method: 'DELETE' })
    load()
  }

  const totalMalus = malus.reduce((s, m) => s + m.points, 0)

  return (
    <>
      <Navbar />
      <div className="pt-14 lg:pt-0 lg:ml-64 min-h-screen">
        <div className="px-6 py-6 max-w-6xl mx-auto">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-ink">Malus</h1>
              <p className="text-ink-muted text-sm mt-0.5">{weekLabel(week)} — semaine courante</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">

            {/* Formulaire attribution */}
            <div className="flex flex-col gap-6">
              <div className="card p-6">
                <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-4">Attribuer un malus</h2>
                <form onSubmit={handleAssign} className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs text-ink-muted mb-1.5 block">Membre</label>
                    <select value={userId} onChange={e => setUserId(e.target.value)} className="input w-full">
                      {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-ink-muted mb-1.5 block">Raison / nom du malus</label>
                    <input
                      type="text" value={malusName} onChange={e => setMalusName(e.target.value)}
                      className="input w-full" placeholder="Ex : Absence réunion" required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-ink-muted mb-1.5 block">Points retirés</label>
                    <input
                      type="number" value={points} onChange={e => setPoints(e.target.value)}
                      className="input w-full" placeholder="Ex : 50" min="1" required
                    />
                    <p className="text-xs text-ink-faint mt-1">La valeur sera soustraite (− {points || '0'} pts)</p>
                  </div>
                  {error && <p className="text-red-400 text-sm">{error}</p>}
                  <button type="submit" disabled={assigning || !userId || !malusName.trim() || !points} className="btn-danger">
                    {assigning ? 'Attribution...' : 'Attribuer le malus'}
                  </button>
                </form>
              </div>
            </div>

            {/* Liste malus de la semaine */}
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-base font-semibold text-ink">Malus attribués cette semaine</h2>
                <span className="text-xs font-mono text-red-400">{totalMalus} pts</span>
              </div>
              {malus.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-ink-muted text-sm">Aucun malus cette semaine.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-elevated/40">
                      <th className="text-left px-5 py-3 text-ink-muted font-medium">Membre</th>
                      <th className="text-left px-5 py-3 text-ink-muted font-medium">Raison</th>
                      <th className="text-right px-5 py-3 text-ink-muted font-medium w-28">Points</th>
                      <th className="px-5 py-3 w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {malus.map(m => (
                      <tr key={m.id} className="border-b border-border-subtle last:border-0 hover:bg-bg-elevated/20 transition-colors">
                        <td className="px-5 py-3 font-medium text-ink">{m.user.username}</td>
                        <td className="px-5 py-3 text-ink-muted">{m.malusName}</td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-red-400">{m.points} pts</td>
                        <td className="px-5 py-3">
                          <button onClick={() => handleDelete(m.id)} className="btn-danger text-xs px-2.5 py-1 float-right">×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
