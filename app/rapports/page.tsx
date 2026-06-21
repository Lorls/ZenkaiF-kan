'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getFridayWeekStart, formatFridayWeekRange, fridayWeekLabel } from '@/lib/week'

const TYPES = [
  { key: 'PARTICIPATION', label: 'Participation mission', pts: 5 },
  { key: 'ORGANISATION', label: 'Organisation mission', pts: 15 },
  { key: 'RECRUTEMENT', label: 'Recrutement', pts: 15 },
] as const

type RapportType = typeof TYPES[number]['key']

interface Rapport {
  id: number
  type: RapportType
  weekStart: string
  description: string
  status: 'EN_ATTENTE' | 'APPROUVE' | 'REJETE'
  reviewNote: string | null
  createdAt: string
}

const STATUS_STYLE = {
  EN_ATTENTE: 'bg-amber-950/40 text-amber-400 border-amber-900/40',
  APPROUVE: 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40',
  REJETE: 'bg-red-950/40 text-red-400 border-red-900/40',
}
const STATUS_LABEL = { EN_ATTENTE: 'En attente', APPROUVE: 'Approuvé', REJETE: 'Rejeté' }

export default function RapportsPage() {
  const router = useRouter()
  const [rapports, setRapports] = useState<Rapport[]>([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState<RapportType>('PARTICIPATION')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const currentWeekStart = getFridayWeekStart()

  const load = useCallback(async () => {
    const res = await fetch('/api/rapports?mine=true')
    if (!res.ok) { router.push('/dashboard'); return }
    setRapports(await res.json())
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) return
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/rapports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: activeType, description }),
    })
    if (res.ok) {
      setDescription('')
      await load()
    } else {
      const d = await res.json()
      setError(d.error || 'Erreur')
    }
    setSubmitting(false)
  }

  // Groupe par semaine
  const byWeek = rapports.reduce<Record<string, Rapport[]>>((acc, r) => {
    const key = new Date(r.weekStart).toISOString()
    ;(acc[key] ??= []).push(r)
    return acc
  }, {})

  const weeks = Object.keys(byWeek).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  const typeInfo = TYPES.find(t => t.key === activeType)!

  return (
    <>
      <Navbar />
      <div className="pt-14 lg:pt-0 lg:ml-64">
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <h1 className="text-2xl font-bold text-ink">Mes rapports</h1>

          {/* Formulaire */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-ink">Soumettre un rapport</h2>

            {/* Type selector */}
            <div className="flex flex-wrap gap-2">
              {TYPES.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveType(t.key)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150 cursor-pointer ${
                    activeType === t.key
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-border-subtle text-ink-muted hover:border-gold/40 hover:text-ink'
                  }`}
                >
                  {t.label}
                  <span className="ml-1.5 font-mono opacity-70">+{t.pts} pts</span>
                </button>
              ))}
            </div>

            <div className="text-xs text-ink-faint">
              Semaine en cours : <span className="text-ink-muted">{formatFridayWeekRange(currentWeekStart)}</span>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={`Décris ta ${typeInfo.label.toLowerCase()}…`}
                rows={4}
                className="input resize-none"
                required
              />
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button
                type="submit"
                disabled={submitting || !description.trim()}
                className="btn-primary"
              >
                {submitting ? 'Envoi…' : 'Soumettre le rapport'}
              </button>
            </form>
          </div>

          {/* Historique */}
          {!loading && weeks.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-ink">Historique</h2>
              {weeks.map(weekIso => {
                const weekRapports = byWeek[weekIso]
                return (
                  <div key={weekIso} className="card p-4 space-y-3">
                    <p className="text-xs font-medium text-ink-muted">{fridayWeekLabel(weekIso)}</p>
                    {weekRapports.map(r => {
                      const typeLabel = TYPES.find(t => t.key === r.type)?.label ?? r.type
                      return (
                        <div key={r.id} className={`rounded-lg border p-3 space-y-1.5 ${STATUS_STYLE[r.status]}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium">{typeLabel}</span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLE[r.status]}`}>
                              {STATUS_LABEL[r.status]}
                            </span>
                          </div>
                          <p className="text-xs text-ink leading-relaxed">{r.description}</p>
                          {r.reviewNote && (
                            <p className="text-[10px] text-ink-muted italic border-t border-current/10 pt-1.5">
                              Note : {r.reviewNote}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}

          {!loading && weeks.length === 0 && (
            <p className="text-ink-muted text-sm text-center py-8">Aucun rapport soumis pour l&apos;instant.</p>
          )}
        </main>
      </div>
    </>
  )
}
