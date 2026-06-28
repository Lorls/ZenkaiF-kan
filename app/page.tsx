'use client'

import { useState, useEffect, useCallback } from 'react'
import Navbar from '@/components/Navbar'
import { weekLabel, shiftWeek, getWeekStart } from '@/lib/week'

interface ActivityType { id: number; name: string; points: number }
interface Activity { id: number; activityName: string; points: number; discordLink: string; status: string; createdAt: string }
interface MalusItem { id: number; malusName: string; points: number; createdAt: string }
interface Summary {
  activities: Activity[]
  malus: MalusItem[]
  pointsApprouves: number
  pointsMalus: number
  week: string
}

const STATUS_STYLES: Record<string, string> = {
  EN_ATTENTE: 'bg-amber-950/40 text-amber-400 border-amber-900/40',
  APPROUVE:   'bg-emerald-950/40 text-emerald-400 border-emerald-900/40',
  REJETE:     'bg-red-950/40 text-red-400 border-red-900/40',
}
const STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  APPROUVE: 'Approuvé',
  REJETE: 'Rejeté',
}

export default function ProfilePage() {
  const [week, setWeek] = useState<Date>(() => getWeekStart())
  const [summary, setSummary] = useState<Summary | null>(null)
  const [types, setTypes] = useState<ActivityType[]>([])
  const [activityTypeId, setActivityTypeId] = useState('')
  const [discordLink, setDiscordLink] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  const weekParam = week.toISOString().split('T')[0]

  const load = useCallback(async () => {
    const [s, t] = await Promise.all([
      fetch(`/api/me/summary?week=${weekParam}`).then(r => r.ok ? r.json() : null),
      fetch('/api/activity-types?active=1').then(r => r.ok ? r.json() : []),
    ])
    if (s) setSummary(s)
    setTypes(t as ActivityType[])
    if (t.length > 0 && !activityTypeId) setActivityTypeId(String((t as ActivityType[])[0].id))
  }, [weekParam, activityTypeId])

  useEffect(() => { load() }, [week])

  async function handlePostActivity(e: React.FormEvent) {
    e.preventDefault()
    setPosting(true); setError('')
    const res = await fetch('/api/activities', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityTypeId: Number(activityTypeId), discordLink }),
    })
    if (res.ok) { setDiscordLink(''); load() }
    else { const d = await res.json(); setError(d.error) }
    setPosting(false)
  }

  async function handleDeleteActivity(id: number) {
    await fetch(`/api/activities/${id}`, { method: 'DELETE' })
    load()
  }

  const currentWeekStart = getWeekStart()
  const isCurrentWeek = week.getTime() === currentWeekStart.getTime()

  return (
    <>
      <Navbar />
      <div className="pt-14 lg:pt-0 lg:ml-64 min-h-screen">
        <div className="px-6 py-6 max-w-6xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-ink">Mon profil</h1>
              <p className="text-ink-muted text-sm mt-0.5">{weekLabel(week)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setWeek(w => shiftWeek(w, -1))} className="btn-ghost px-3 py-1.5 text-sm">←</button>
              <button onClick={() => setWeek(currentWeekStart)} disabled={isCurrentWeek} className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-40">Cette semaine</button>
              <button onClick={() => setWeek(w => shiftWeek(w, 1))} disabled={isCurrentWeek} className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-40">→</button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="card p-5">
              <p className="text-xs text-ink-muted mb-1">Points approuvés</p>
              <p className="text-3xl font-bold text-gold">{summary?.pointsApprouves ?? 0}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-ink-muted mb-1">Malus</p>
              <p className="text-3xl font-bold text-red-400">{summary?.pointsMalus ?? 0} pts</p>
            </div>
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-2 gap-6">

            {/* Colonne gauche — formulaires */}
            <div className="flex flex-col gap-6">

              {/* Poster une activité */}
              {isCurrentWeek && (
                <div className="card p-6">
                  <h2 className="text-base font-semibold text-ink mb-4">Poster une activité</h2>
                  {types.length === 0 ? (
                    <p className="text-ink-muted text-sm">Aucun type d'activité disponible.</p>
                  ) : (
                    <form onSubmit={handlePostActivity} className="flex flex-col gap-3">
                      <select value={activityTypeId} onChange={e => setActivityTypeId(e.target.value)} className="input w-full">
                        {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <input
                        type="url" value={discordLink} onChange={e => setDiscordLink(e.target.value)}
                        className="input w-full" placeholder="Lien Discord du message (https://discord.com/...)" required
                      />
                      {error && <p className="text-red-400 text-sm">{error}</p>}
                      <button type="submit" disabled={posting || !discordLink.trim()} className="btn-primary">
                        {posting ? 'Envoi...' : 'Soumettre'}
                      </button>
                    </form>
                  )}
                </div>
              )}

            </div>

            {/* Colonne droite — listes */}
            <div className="flex flex-col gap-6">

              {/* Liste activités */}
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                  <h2 className="text-base font-semibold text-ink">Mes activités</h2>
                  <span className="text-xs font-mono text-ink-muted">{summary?.activities.length ?? 0}</span>
                </div>
                {!summary || summary.activities.length === 0 ? (
                  <p className="p-5 text-ink-muted text-sm">Aucune activité cette semaine.</p>
                ) : (
                  <div className="divide-y divide-border-subtle">
                    {summary.activities.map(a => (
                      <div key={a.id} className="px-5 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{a.activityName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <a href={a.discordLink} target="_blank" rel="noopener noreferrer" className="text-xs text-ink-faint hover:text-ink-muted truncate">↗ Discord</a>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${STATUS_STYLES[a.status] ?? ''}`}>{STATUS_LABELS[a.status] ?? a.status}</span>
                          {a.status === 'EN_ATTENTE' && isCurrentWeek && (
                            <button onClick={() => handleDeleteActivity(a.id)} className="btn-danger text-xs px-2 py-1">×</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Liste malus */}
              {summary && summary.malus.length > 0 && (
                <div className="card overflow-hidden border-red-900/30">
                  <div className="px-5 py-3 border-b border-red-900/30 flex items-center justify-between bg-red-950/10">
                    <h2 className="text-base font-semibold text-red-400">Malus reçus</h2>
                    <span className="text-xs font-mono font-bold text-red-400">{summary.pointsMalus} pts</span>
                  </div>
                  <div className="divide-y divide-border-subtle">
                    {summary.malus.map(m => (
                      <div key={m.id} className="px-5 py-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-ink">{m.malusName}</p>
                        <span className="text-sm font-mono font-bold text-red-400 shrink-0">{m.points} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </>
  )
}
