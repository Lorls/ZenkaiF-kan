'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import { weekLabel, shiftWeek, getWeekStart } from '@/lib/week'

interface SalaireEntry { userId: number; username: string; totalDepose: number; salaire: number }
interface SalairesData { salaires: SalaireEntry[]; totalGeneral: number; salaireTotal: number; salaryPercent: number; week: string }

export default function SalairesPage() {
  const [week, setWeek] = useState<Date>(() => getWeekStart())
  const [data, setData] = useState<SalairesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [percent, setPercent] = useState('')
  const [savingPercent, setSavingPercent] = useState(false)
  const [percentError, setPercentError] = useState('')

  const weekParam = week.toISOString().split('T')[0]
  const isCurrentWeek = week.getTime() === getWeekStart().getTime()

  async function load() {
    setLoading(true)
    const d = await fetch(`/api/gestion/salaires?week=${weekParam}`).then(r => r.ok ? r.json() : null)
    setData(d)
    if (d && percent === '') setPercent(String(d.salaryPercent))
    setLoading(false)
  }
  useEffect(() => { load() }, [week])

  async function handleSavePercent(e: React.FormEvent) {
    e.preventDefault()
    setSavingPercent(true); setPercentError('')
    const res = await fetch('/api/settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ salaryPercent: Number(percent) }),
    })
    if (!res.ok) { const d = await res.json(); setPercentError(d.error) }
    else load()
    setSavingPercent(false)
  }

  return (
    <>
      <Navbar />
      <div className="pt-14 lg:pt-0 lg:ml-64 min-h-screen">
        <div className="px-6 py-6 max-w-6xl mx-auto">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-ink">Salaires</h1>
              <p className="text-ink-muted text-sm mt-0.5">{weekLabel(week)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setWeek(w => shiftWeek(w, -1))} className="btn-ghost px-3 py-1.5 text-sm">←</button>
              <button onClick={() => setWeek(getWeekStart())} disabled={isCurrentWeek} className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-40">Cette semaine</button>
              <button onClick={() => setWeek(w => shiftWeek(w, 1))} disabled={isCurrentWeek} className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-40">→</button>
            </div>
          </div>

          {/* Stats + paramètre sur une ligne */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="card p-5">
              <p className="text-xs text-ink-muted mb-1">Total déposé (semaine)</p>
              <p className="text-3xl font-bold text-ink">{(data?.totalGeneral ?? 0).toLocaleString('fr-FR')} ¥</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-ink-muted mb-1">Total salaires reversés</p>
              <p className="text-3xl font-bold text-emerald-400">{(data?.salaireTotal ?? 0).toLocaleString('fr-FR')} ¥</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-ink-muted mb-2">Pourcentage de salaire</p>
              <form onSubmit={handleSavePercent} className="flex items-center gap-2">
                <input type="number" value={percent} onChange={e => setPercent(e.target.value)} className="input w-20 text-lg font-bold" min="0" max="100" step="0.1" />
                <span className="text-ink-muted text-lg font-bold">%</span>
                <button type="submit" disabled={savingPercent} className="btn-primary text-xs px-3 py-1.5 ml-1">
                  {savingPercent ? '...' : 'Sauver'}
                </button>
              </form>
              {percentError && <p className="text-red-400 text-xs mt-1">{percentError}</p>}
            </div>
          </div>

          {/* Tableau détail */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="text-base font-semibold text-ink">Détail par membre</h2>
            </div>
            {loading ? (
              <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-bg-elevated rounded animate-pulse" />)}</div>
            ) : !data || data.salaires.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-ink-muted">Aucun dépôt approuvé cette semaine.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-elevated/40">
                    <th className="text-left px-5 py-3 text-ink-muted font-medium">Membre</th>
                    <th className="text-right px-5 py-3 text-ink-muted font-medium w-56">Total déposé</th>
                    <th className="text-right px-5 py-3 text-ink-muted font-medium w-56">Salaire ({data.salaryPercent}%)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.salaires.map(s => (
                    <tr key={s.userId} className="border-b border-border-subtle last:border-0 hover:bg-bg-elevated/20 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-bg-elevated text-ink-muted">
                            {s.username[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-ink">{s.username}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-ink">{s.totalDepose.toLocaleString('fr-FR')} ¥</td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-emerald-400 text-base">{s.salaire.toLocaleString('fr-FR')} ¥</td>
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
