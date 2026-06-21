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

  const podiumColors = ['text-gold', 'text-slate-300', 'text-amber-600']

  return (
    <>
      <Navbar />
      <div className="pt-14 lg:pt-0 lg:ml-64 min-h-screen">
        <div className="px-6 py-6 max-w-6xl mx-auto">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-ink">Classement</h1>
              <p className="text-ink-muted text-sm mt-0.5">{weekLabel(week)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setWeek(w => shiftWeek(w, -1))} className="btn-ghost px-3 py-1.5 text-sm">←</button>
              <button onClick={() => setWeek(getWeekStart())} disabled={isCurrentWeek} className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-40">Cette semaine</button>
              <button onClick={() => setWeek(w => shiftWeek(w, 1))} disabled={isCurrentWeek} className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-40">→</button>
            </div>
          </div>

          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-bg-elevated rounded animate-pulse" />)}</div>
            ) : classement.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-ink-muted">Aucune activité approuvée cette semaine.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-elevated/40">
                    <th className="text-left px-5 py-3 text-ink-muted font-medium w-16">#</th>
                    <th className="text-left px-5 py-3 text-ink-muted font-medium">Membre</th>
                    <th className="text-right px-5 py-3 text-ink-muted font-medium w-40">Activités approuvées</th>
                    <th className="text-right px-5 py-3 text-ink-muted font-medium w-40">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {classement.map((e, i) => (
                    <tr key={e.userId} className={`border-b border-border-subtle last:border-0 ${i === 0 ? 'bg-gold/5' : 'hover:bg-bg-elevated/20'} transition-colors`}>
                      <td className="px-5 py-4">
                        <span className={`text-lg font-bold ${podiumColors[i] ?? 'text-ink-muted'}`}>{i + 1}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-gold/20 text-gold' : 'bg-bg-elevated text-ink-muted'}`}>
                            {e.username[0].toUpperCase()}
                          </div>
                          <span className={`font-semibold ${i === 0 ? 'text-gold' : 'text-ink'}`}>{e.username}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-ink-muted">{e.nbActivites}</td>
                      <td className="px-5 py-4 text-right">
                        <span className={`text-xl font-bold font-mono ${i === 0 ? 'text-gold' : 'text-ink'}`}>{e.points}</span>
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
