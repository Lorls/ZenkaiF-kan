'use client'

import { useState, useEffect, useCallback } from 'react'
import Navbar from '@/components/Navbar'
import { weekLabel, shiftWeek, getWeekStart } from '@/lib/week'

interface ActivityType { id: number; name: string; points: number }
interface Activity { id: number; activityName: string; points: number; discordLink: string; status: string; createdAt: string }
interface Deposit { id: number; amount: number; status: string; createdAt: string }
interface Summary {
  activities: Activity[]
  deposits: Deposit[]
  pointsApprouves: number
  totalDeposeApprouve: number
  salaireEstime: number
  salaryPercent: number
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
  const [amount, setAmount] = useState('')
  const [posting, setPosting] = useState(false)
  const [depositing, setDepositing] = useState(false)
  const [error, setError] = useState('')
  const [depositError, setDepositError] = useState('')

  const weekParam = week.toISOString().split('T')[0]

  const load = useCallback(async () => {
    const [s, t] = await Promise.all([
      fetch(`/api/me/summary?week=${weekParam}`).then(r => r.ok ? r.json() : null),
      fetch('/api/activity-types?active=1').then(r => r.ok ? r.json() : []),
    ])
    if (s) setSummary(s)
    setTypes(t)
    if (t.length > 0 && !activityTypeId) setActivityTypeId(String(t[0].id))
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

  async function handlePostDeposit(e: React.FormEvent) {
    e.preventDefault()
    setDepositing(true); setDepositError('')
    const res = await fetch('/api/deposits', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(amount) }),
    })
    if (res.ok) { setAmount(''); load() }
    else { const d = await res.json(); setDepositError(d.error) }
    setDepositing(false)
  }

  async function handleDeleteDeposit(id: number) {
    await fetch(`/api/deposits/${id}`, { method: 'DELETE' })
    load()
  }

  const currentWeekStart = getWeekStart()
  const isCurrentWeek = week.getTime() === currentWeekStart.getTime()

  return (
    <>
      <Navbar />
      <div className="pt-14 lg:pt-0 lg:ml-64">
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

          {/* Header + sélecteur semaine */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-ink">Mon profil</h1>
              <p className="text-ink-muted text-sm mt-0.5">{weekLabel(week)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setWeek(w => shiftWeek(w, -1))} className="btn-ghost px-2 py-1 text-sm">←</button>
              <button onClick={() => setWeek(currentWeekStart)} disabled={isCurrentWeek} className="btn-ghost px-3 py-1 text-sm disabled:opacity-40">Cette semaine</button>
              <button onClick={() => setWeek(w => shiftWeek(w, 1))} disabled={isCurrentWeek} className="btn-ghost px-2 py-1 text-sm disabled:opacity-40">→</button>
            </div>
          </div>

          {/* Stats */}
          {summary && (
            <div className="grid grid-cols-3 gap-3">
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-gold">{summary.pointsApprouves}</p>
                <p className="text-xs text-ink-muted mt-1">Points</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-ink">{summary.totalDeposeApprouve.toLocaleString('fr-FR')} ¥</p>
                <p className="text-xs text-ink-muted mt-1">Déposé</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{summary.salaireEstime.toLocaleString('fr-FR')} ¥</p>
                <p className="text-xs text-ink-muted mt-1">Salaire estimé ({summary.salaryPercent}%)</p>
              </div>
            </div>
          )}

          {/* Poster une activité */}
          {isCurrentWeek && (
            <div className="card p-6">
              <h2 className="text-base font-semibold text-ink mb-4">Poster une activité</h2>
              {types.length === 0 ? (
                <p className="text-ink-muted text-sm">Aucun type d'activité disponible pour l'instant.</p>
              ) : (
                <form onSubmit={handlePostActivity} className="space-y-3">
                  <select value={activityTypeId} onChange={e => setActivityTypeId(e.target.value)} className="input w-full">
                    {types.map(t => <option key={t.id} value={t.id}>{t.name} — {t.points} pts</option>)}
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

          {/* Liste activités */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-base font-semibold text-ink">Mes activités ({summary?.activities.length ?? 0})</h2>
            </div>
            {!summary || summary.activities.length === 0 ? (
              <p className="p-4 text-ink-muted text-sm">Aucune activité cette semaine.</p>
            ) : (
              <div className="divide-y divide-border-subtle">
                {summary.activities.map(a => (
                  <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{a.activityName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gold font-mono">{a.points} pts</span>
                        <a href={a.discordLink} target="_blank" rel="noopener noreferrer" className="text-xs text-ink-faint hover:text-ink-muted truncate max-w-[200px]">↗ Discord</a>
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

          {/* Déclarer un dépôt */}
          {isCurrentWeek && (
            <div className="card p-6">
              <h2 className="text-base font-semibold text-ink mb-4">Déclarer un dépôt au coffre</h2>
              <form onSubmit={handlePostDeposit} className="flex gap-2">
                <input
                  type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  className="input flex-1" placeholder="Montant (¥)" min="1" required
                />
                <button type="submit" disabled={depositing || !amount} className="btn-primary whitespace-nowrap">
                  {depositing ? 'Envoi...' : 'Déclarer'}
                </button>
              </form>
              {depositError && <p className="text-red-400 text-sm mt-2">{depositError}</p>}
            </div>
          )}

          {/* Liste dépôts */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-base font-semibold text-ink">Mes dépôts ({summary?.deposits.length ?? 0})</h2>
            </div>
            {!summary || summary.deposits.length === 0 ? (
              <p className="p-4 text-ink-muted text-sm">Aucun dépôt cette semaine.</p>
            ) : (
              <div className="divide-y divide-border-subtle">
                {summary.deposits.map(d => (
                  <div key={d.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-ink">{d.amount.toLocaleString('fr-FR')} ¥</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${STATUS_STYLES[d.status] ?? ''}`}>{STATUS_LABELS[d.status] ?? d.status}</span>
                      {d.status === 'EN_ATTENTE' && isCurrentWeek && (
                        <button onClick={() => handleDeleteDeposit(d.id)} className="btn-danger text-xs px-2 py-1">×</button>
                      )}
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
