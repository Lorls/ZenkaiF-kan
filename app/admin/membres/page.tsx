'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

interface Membre {
  id: number
  username: string
  role: string
  donations: number
  taxes: number
  participation: number
  organisation: number
  recrutement: number
  total: number
}

const ROLE_LABELS: Record<string, string> = {
  GERANT: 'Gérant',
  RESPONSABLE_KOBO: 'Resp. Kobo',
  RESPONSABLE_SHOMU: 'Resp. Shomu',
  MEMBRE_KOBO: 'Kobo',
  MEMBRE_SHOMU: 'Shomu',
  VISITEUR: 'Visiteur',
}

const MEDAL_COLORS = ['text-yellow-400', 'text-slate-400', 'text-amber-700']

function MedalIcon({ rank, className }: { rank: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`w-4 h-4 ${MEDAL_COLORS[rank]} ${className ?? ''}`} fill="currentColor">
      <path d="M12 2a5 5 0 100 10A5 5 0 0012 2zm0 2a3 3 0 110 6 3 3 0 010-6zM8.5 11.5l-3 8.5 3.5-1.5L12 21l3-2.5 3.5 1.5-3-8.5A6.97 6.97 0 0112 13a6.97 6.97 0 01-3.5-.5z" />
    </svg>
  )
}

const COLS = [
  { key: 'donations',     label: 'Ressources', pts: 1  },
  { key: 'taxes',         label: 'Taxes',      pts: 3  },
  { key: 'participation', label: 'Participation', pts: 5  },
  { key: 'organisation',  label: 'Organisation', pts: 15 },
  { key: 'recrutement',   label: 'Recrutement',  pts: 15 },
] as const

export default function AdminMembresPage() {
  const router = useRouter()
  const [membres, setMembres] = useState<Membre[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/membres').then(r => {
      if (!r.ok) { router.push('/dashboard'); return null }
      return r.json()
    }).then(d => { if (d) { setMembres(d); setLoading(false) } })
  }, [router])

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="pt-14 lg:pt-0 lg:ml-64">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-pulse space-y-3">
            <div className="h-8 bg-bg-card rounded w-48" />
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-bg-card rounded" />)}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="pt-14 lg:pt-0 lg:ml-64">
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-ink">Classement membres</h1>
            <p className="text-xs text-ink-muted mt-1">
              Ressources ×1 · Taxes ×3 · Participation ×5 · Organisation ×15 · Recrutement ×15
            </p>
          </div>

          {membres.length === 0 ? (
            <p className="text-ink-muted text-sm text-center py-8">Aucune activité enregistrée.</p>
          ) : (
            <div className="card overflow-x-auto">
              {/* Header */}
              <div className="min-w-[640px]">
                <div className="grid grid-cols-[2fr_repeat(5,1fr)_1fr] gap-2 px-4 py-2.5 border-b border-border text-[10px] uppercase tracking-wider text-ink-faint font-medium">
                  <span>Membre</span>
                  {COLS.map(c => (
                    <span key={c.key} className="text-center">{c.label}</span>
                  ))}
                  <span className="text-right">Score</span>
                </div>

                {membres.map((m, i) => (
                  <div
                    key={m.id}
                    className={`grid grid-cols-[2fr_repeat(5,1fr)_1fr] gap-2 px-4 py-3 items-center border-b border-border-subtle last:border-0 ${i === 0 && m.total > 0 ? 'bg-gold/[0.03]' : ''}`}
                  >
                    {/* Nom */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 shrink-0 flex items-center justify-center">
                        {i < 3 && m.total > 0 ? <MedalIcon rank={i} /> : <span className="font-mono text-xs text-ink-faint">{i + 1}</span>}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{m.username}</p>
                        <p className="text-[10px] text-ink-faint">{ROLE_LABELS[m.role] ?? m.role}</p>
                      </div>
                    </div>

                    {/* Colonnes score */}
                    {COLS.map(c => {
                      const count = m[c.key]
                      return (
                        <div key={c.key} className="text-center">
                          <span className={`font-mono text-sm ${count > 0 ? 'text-ink' : 'text-ink-faint'}`}>
                            {count > 0 ? `${count}×` : '—'}
                          </span>
                          {count > 0 && (
                            <span className="block text-[10px] text-gold">{count * c.pts} pts</span>
                          )}
                        </div>
                      )
                    })}

                    {/* Total */}
                    <div className="text-right">
                      <span className={`font-mono text-base font-bold ${m.total > 0 ? 'text-gold' : 'text-ink-faint'}`}>
                        {m.total > 0 ? m.total : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
