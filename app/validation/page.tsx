'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import { weekLabel, shiftWeek, getWeekStart } from '@/lib/week'

interface Activity { id: number; activityName: string; points: number; discordLink: string; createdAt: string; user: { username: string } }
interface Deposit { id: number; amount: number; createdAt: string; user: { username: string } }

export default function ValidationPage() {
  const [week, setWeek] = useState<Date>(() => getWeekStart())
  const [activities, setActivities] = useState<Activity[]>([])
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [loading, setLoading] = useState(true)

  const weekParam = week.toISOString().split('T')[0]
  const isCurrentWeek = week.getTime() === getWeekStart().getTime()

  async function load() {
    setLoading(true)
    const [a, d] = await Promise.all([
      fetch(`/api/activities?status=EN_ATTENTE&week=${weekParam}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/deposits?status=EN_ATTENTE&week=${weekParam}`).then(r => r.ok ? r.json() : []),
    ])
    setActivities(a)
    setDeposits(d)
    setLoading(false)
  }
  useEffect(() => { load() }, [week])

  async function reviewActivity(id: number, status: 'APPROUVE' | 'REJETE') {
    await fetch(`/api/activities/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  async function reviewDeposit(id: number, status: 'APPROUVE' | 'REJETE') {
    await fetch(`/api/deposits/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  return (
    <>
      <Navbar />
      <div className="pt-14 lg:pt-0 lg:ml-64">
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-ink">Validation</h1>
              <p className="text-ink-muted text-sm mt-0.5">{weekLabel(week)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setWeek(w => shiftWeek(w, -1))} className="btn-ghost px-2 py-1 text-sm">←</button>
              <button onClick={() => setWeek(getWeekStart())} disabled={isCurrentWeek} className="btn-ghost px-3 py-1 text-sm disabled:opacity-40">Cette semaine</button>
              <button onClick={() => setWeek(w => shiftWeek(w, 1))} disabled={isCurrentWeek} className="btn-ghost px-2 py-1 text-sm disabled:opacity-40">→</button>
            </div>
          </div>

          {/* Activités en attente */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Activités en attente</h2>
              <span className="text-xs font-mono text-ink-muted">{activities.length}</span>
            </div>
            {loading ? (
              <div className="p-6 space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-12 bg-bg-elevated rounded animate-pulse" />)}</div>
            ) : activities.length === 0 ? (
              <p className="p-4 text-ink-muted text-sm">Aucune activité en attente.</p>
            ) : (
              <div className="divide-y divide-border-subtle">
                {activities.map(a => (
                  <div key={a.id} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink text-sm">{a.user.username}</span>
                        <span className="text-xs text-ink-muted">·</span>
                        <span className="text-sm text-ink-muted">{a.activityName}</span>
                        <span className="text-xs font-mono text-gold">{a.points} pts</span>
                      </div>
                      <a href={a.discordLink} target="_blank" rel="noopener noreferrer" className="text-xs text-ink-faint hover:text-ink-muted mt-0.5 block truncate">↗ {a.discordLink}</a>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => reviewActivity(a.id, 'APPROUVE')} className="text-xs px-2 py-1 rounded bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 hover:bg-emerald-950 transition-colors cursor-pointer">✓</button>
                      <button onClick={() => reviewActivity(a.id, 'REJETE')} className="btn-danger text-xs px-2 py-1">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dépôts en attente */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Dépôts en attente</h2>
              <span className="text-xs font-mono text-ink-muted">{deposits.length}</span>
            </div>
            {loading ? (
              <div className="p-6 space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-12 bg-bg-elevated rounded animate-pulse" />)}</div>
            ) : deposits.length === 0 ? (
              <p className="p-4 text-ink-muted text-sm">Aucun dépôt en attente.</p>
            ) : (
              <div className="divide-y divide-border-subtle">
                {deposits.map(d => (
                  <div key={d.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-medium text-ink text-sm">{d.user.username}</span>
                      <span className="text-ink-muted text-sm"> — </span>
                      <span className="font-mono text-ink text-sm">{d.amount.toLocaleString('fr-FR')} ¥</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => reviewDeposit(d.id, 'APPROUVE')} className="text-xs px-2 py-1 rounded bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 hover:bg-emerald-950 transition-colors cursor-pointer">✓</button>
                      <button onClick={() => reviewDeposit(d.id, 'REJETE')} className="btn-danger text-xs px-2 py-1">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </main>
      </div>
    </>
  )
}
