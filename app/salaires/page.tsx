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
      <div className="pt-14 lg:pt-0 lg:ml-64">
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-ink">Salaires</h1>
              <p className="text-ink-muted text-sm mt-0.5">{weekLabel(week)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setWeek(w => shiftWeek(w, -1))} className="btn-ghost px-2 py-1 text-sm">←</button>
              <button onClick={() => setWeek(getWeekStart())} disabled={isCurrentWeek} className="btn-ghost px-3 py-1 text-sm disabled:opacity-40">Cette semaine</button>
              <button onClick={() => setWeek(w => shiftWeek(w, 1))} disabled={isCurrentWeek} className="btn-ghost px-2 py-1 text-sm disabled:opacity-40">→</button>
            </div>
          </div>

          {/* Paramètre pourcentage */}
          <div className="card p-6">
            <h2 className="text-base font-semibold text-ink mb-1">Pourcentage de salaire</h2>
            <p className="text-ink-muted text-sm mb-4">Part des dépôts reversée en salaire à chaque membre.</p>
            <form onSubmit={handleSavePercent} className="flex items-center gap-2">
              <input type="number" value={percent} onChange={e => setPercent(e.target.value)} className="input w-24" min="0" max="100" step="0.1" />
              <span className="text-ink-muted">%</span>
              <button type="submit" disabled={savingPercent} className="btn-primary">
                {savingPercent ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </form>
            {percentError && <p className="text-red-400 text-sm mt-2">{percentError}</p>}
          </div>

          {/* Résumé semaine */}
          {data && data.salaires.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-ink">{data.totalGeneral.toLocaleString('fr-FR')} ¥</p>
                <p className="text-xs text-ink-muted mt-1">Total déposé</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{data.salaireTotal.toLocaleString('fr-FR')} ¥</p>
                <p className="text-xs text-ink-muted mt-1">Total salaires ({data.salaryPercent}%)</p>
              </div>
            </div>
          )}

          {/* Tableau */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-base font-semibold text-ink">Détail par membre</h2>
            </div>
            {loading ? (
              <div className="p-6 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-bg-elevated rounded animate-pulse" />)}</div>
            ) : !data || data.salaires.length === 0 ? (
              <p className="p-4 text-ink-muted text-sm">Aucun dépôt approuvé cette semaine.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-elevated/40">
                    <th className="text-left px-4 py-2.5 text-ink-muted font-medium">Membre</th>
                    <th className="text-right px-4 py-2.5 text-ink-muted font-medium">Déposé</th>
                    <th className="text-right px-4 py-2.5 text-ink-muted font-medium">Salaire</th>
                  </tr>
                </thead>
                <tbody>
                  {data.salaires.map(s => (
                    <tr key={s.userId} className="border-b border-border-subtle last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-bg-elevated text-ink-muted">
                            {s.username[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-ink">{s.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-ink">{s.totalDepose.toLocaleString('fr-FR')} ¥</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">{s.salaire.toLocaleString('fr-FR')} ¥</td>
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
