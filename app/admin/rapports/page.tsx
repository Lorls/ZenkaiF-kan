'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { fridayWeekLabel } from '@/lib/week'

const TYPES: Record<string, string> = {
  PARTICIPATION: 'Participation mission',
  ORGANISATION: 'Organisation mission',
  RECRUTEMENT: 'Recrutement',
}
const POINTS: Record<string, number> = { PARTICIPATION: 5, ORGANISATION: 15, RECRUTEMENT: 15 }

interface Rapport {
  id: number
  type: string
  weekStart: string
  description: string
  status: 'EN_ATTENTE' | 'APPROUVE' | 'REJETE'
  reviewNote: string | null
  createdAt: string
  user: { id: number; username: string; role: string }
  reviewedBy: { id: number; username: string } | null
}

export default function AdminRapportsPage() {
  const router = useRouter()
  const [rapports, setRapports] = useState<Rapport[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'EN_ATTENTE' | 'APPROUVE' | 'REJETE' | 'TOUS'>('EN_ATTENTE')
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({})
  const [processing, setProcessing] = useState<number | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/rapports')
    if (!res.ok) { router.push('/dashboard'); return }
    setRapports(await res.json())
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function review(id: number, status: 'APPROUVE' | 'REJETE') {
    setProcessing(id)
    await fetch(`/api/rapports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reviewNote: reviewNotes[id] ?? '' }),
    })
    await load()
    setProcessing(null)
  }

  const visible = rapports.filter(r => filter === 'TOUS' || r.status === filter)
  const pending = rapports.filter(r => r.status === 'EN_ATTENTE').length

  return (
    <>
      <Navbar />
      <div className="pt-14 lg:pt-0 lg:ml-64">
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-ink">Rapports</h1>
            {pending > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-900/40">
                {pending} en attente
              </span>
            )}
          </div>

          {/* Filtre */}
          <div className="flex gap-1.5 flex-wrap">
            {(['EN_ATTENTE', 'APPROUVE', 'REJETE', 'TOUS'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  filter === f
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-border-subtle text-ink-muted hover:border-gold/40 hover:text-ink'
                }`}
              >
                {{ EN_ATTENTE: 'En attente', APPROUVE: 'Approuvés', REJETE: 'Rejetés', TOUS: 'Tous' }[f]}
                {f !== 'TOUS' && (
                  <span className="ml-1 font-mono opacity-60">{rapports.filter(r => r.status === f).length}</span>
                )}
              </button>
            ))}
          </div>

          {!loading && visible.length === 0 && (
            <p className="text-ink-muted text-sm text-center py-8">Aucun rapport dans cette catégorie.</p>
          )}

          <div className="space-y-4">
            {visible.map(r => (
              <div key={r.id} className="card p-5 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{r.user.username}</span>
                      <span className="text-xs text-ink-faint font-mono">{r.user.role}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-ink-muted">
                      <span>{TYPES[r.type] ?? r.type}</span>
                      <span className="text-ink-faint">·</span>
                      <span className="font-mono text-gold">+{POINTS[r.type] ?? 0} pts</span>
                      <span className="text-ink-faint">·</span>
                      <span>{fridayWeekLabel(r.weekStart)}</span>
                    </div>
                  </div>
                  {r.status === 'EN_ATTENTE' ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-950/40 text-amber-400 border-amber-900/40 shrink-0">En attente</span>
                  ) : r.status === 'APPROUVE' ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border bg-emerald-950/40 text-emerald-400 border-emerald-900/40 shrink-0">Approuvé</span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border bg-red-950/40 text-red-400 border-red-900/40 shrink-0">Rejeté</span>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap bg-bg-elevated/40 rounded-lg px-3 py-2.5 border border-border-subtle">
                  {r.description}
                </p>

                {/* Review note (if reviewed) */}
                {r.reviewNote && (
                  <p className="text-xs text-ink-muted italic">
                    Note ({r.reviewedBy?.username}) : {r.reviewNote}
                  </p>
                )}

                {/* Actions */}
                {r.status === 'EN_ATTENTE' && (
                  <div className="space-y-2 pt-1 border-t border-border-subtle">
                    <input
                      type="text"
                      placeholder="Note optionnelle (visible par le membre)"
                      value={reviewNotes[r.id] ?? ''}
                      onChange={e => setReviewNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                      className="input text-xs py-1.5"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => review(r.id, 'APPROUVE')}
                        disabled={processing === r.id}
                        className="flex-1 text-xs font-medium py-1.5 px-3 rounded-lg border border-emerald-700/50 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-950/60 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        {processing === r.id ? '…' : '✓ Approuver'}
                      </button>
                      <button
                        onClick={() => review(r.id, 'REJETE')}
                        disabled={processing === r.id}
                        className="flex-1 text-xs font-medium py-1.5 px-3 rounded-lg border border-red-800/50 bg-red-950/30 text-red-400 hover:bg-red-950/60 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        {processing === r.id ? '…' : '✗ Rejeter'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  )
}
