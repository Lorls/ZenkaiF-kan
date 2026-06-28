'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import { weekLabel, shiftWeek, getWeekStart } from '@/lib/week'

interface Activity { id: number; activityName: string; points: number; discordLink: string; createdAt: string; user: { username: string } }

export default function ValidationPage() {
  const [week, setWeek] = useState<Date>(() => getWeekStart())
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  const weekParam = week.toISOString().split('T')[0]
  const isCurrentWeek = week.getTime() === getWeekStart().getTime()

  async function load() {
    setLoading(true)
    const a = await fetch(`/api/activities?status=EN_ATTENTE&week=${weekParam}`).then(r => r.ok ? r.json() : [])
    setActivities(a)
    setLoading(false)
  }
  useEffect(() => { load() }, [week])

  async function reviewActivity(id: number, status: 'APPROUVE' | 'REJETE') {
    await fetch(`/api/activities/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    load()
  }

  return (
    <>
      <Navbar />
      <div className="pt-14 lg:pt-0 lg:ml-64 min-h-screen">
        <div className="px-6 py-6 max-w-4xl mx-auto">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-ink">Validation</h1>
              <p className="text-ink-muted text-sm mt-0.5">{weekLabel(week)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setWeek(w => shiftWeek(w, -1))} className="btn-ghost px-3 py-1.5 text-sm">←</button>
              <button onClick={() => setWeek(getWeekStart())} disabled={isCurrentWeek} className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-40">Cette semaine</button>
              <button onClick={() => setWeek(w => shiftWeek(w, 1))} disabled={isCurrentWeek} className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-40">→</button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Activités en attente</h2>
              <span className="text-xs font-mono bg-amber-950/40 text-amber-400 border border-amber-900/40 px-2 py-0.5 rounded">{activities.length}</span>
            </div>
            {loading ? (
              <div className="p-5 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-bg-elevated rounded animate-pulse" />)}</div>
            ) : activities.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-ink-muted text-sm">Aucune activité en attente.</p>
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {activities.map(a => (
                  <div key={a.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-ink text-sm">{a.user.username}</span>
                          <span className="text-ink-muted text-sm">·</span>
                          <span className="text-sm text-ink-muted">{a.activityName}</span>
                          <span className="text-xs font-mono font-bold text-gold">{a.points} pts</span>
                        </div>
                        <a href={a.discordLink} target="_blank" rel="noopener noreferrer" className="text-xs text-ink-faint hover:text-gold mt-1 block truncate transition-colors">↗ {a.discordLink}</a>
                        <p className="text-[10px] text-ink-faint mt-1">{new Date(a.createdAt).toLocaleString('fr-FR')}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                        <button onClick={() => reviewActivity(a.id, 'APPROUVE')} className="px-3 py-1.5 rounded text-xs font-medium bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 hover:bg-emerald-950 transition-colors cursor-pointer">Approuver</button>
                        <button onClick={() => reviewActivity(a.id, 'REJETE')} className="btn-danger text-xs px-3 py-1.5">Rejeter</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
