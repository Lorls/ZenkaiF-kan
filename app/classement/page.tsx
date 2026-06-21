'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import { weekLabel, shiftWeek, getWeekStart } from '@/lib/week'

interface Entry { userId: number; username: string; nbActivites: number; points: number }

export default function ClassementPage() {
  const [week, setWeek] = useState<Date>(() => getWeekStart())
  const [classement, setClassement] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  const weekParam = week.toISOString().split('T')[0]
  const isCurrentWeek = week.getTime() === getWeekStart().getTime()

  async function load() {
    setLoading(true)
    const data = await fetch(`/api/gestion/classement?week=${weekParam}`).then(r => r.ok ? r.json() : { classement: [] })
    setClassement(data.classement ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [week])

  return (
    <>
      <Navbar />
      <div className="pt-14 lg:pt-0 lg:ml-64">
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-ink">Classement</h1>
              <p className="text-ink-muted text-sm mt-0.5">{weekLabel(week)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setWeek(w => shiftWeek(w, -1))} className="btn-ghost px-2 py-1 text-sm">←</button>
              <button onClick={() => setWeek(getWeekStart())} disabled={isCurrentWeek} className="btn-ghost px-3 py-1 text-sm disabled:opacity-40">Cette semaine</button>
              <button onClick={() => setWeek(w => shiftWeek(w, 1))} disabled={isCurrentWeek} className="btn-ghost px-2 py-1 text-sm disabled:opacity-40">→</button>
            </div>
          </div>

          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-bg-elevated rounded animate-pulse" />)}</div>
            ) : classement.length === 0 ? (
              <p className="p-4 text-ink-muted text-sm">Aucune activité approuvée cette semaine.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-elevated/40">
                    <th className="text-left px-4 py-2.5 text-ink-muted font-medium w-10">#</th>
                    <th className="text-left px-4 py-2.5 text-ink-muted font-medium">Membre</th>
                    <th className="text-right px-4 py-2.5 text-ink-muted font-medium">Activités</th>
                    <th className="text-right px-4 py-2.5 text-ink-muted font-medium">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {classement.map((e, i) => (
                    <tr key={e.userId} className="border-b border-border-subtle last:border-0">
                      <td className="px-4 py-3 text-ink-muted font-mono text-xs">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-gold/20 text-gold' : 'bg-bg-elevated text-ink-muted'}`}>
                            {e.username[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-ink">{e.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-ink-muted">{e.nbActivites}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-gold">{e.points}</td>
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
