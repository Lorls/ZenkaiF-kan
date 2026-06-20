'use client'

import { useRouter } from 'next/navigation'
import { GRADES, GradeThresholds } from '@/lib/grades'

interface Tax {
  weekStart: string
  paid: boolean
}

interface Ninja {
  id: number
  name: string
  points: number
  taxes: Tax[]
}

interface NinjaCardProps {
  ninja: Ninja
  thresholds: GradeThresholds
  canWrite?: boolean
  onDelete: (id: number) => void
}

export default function NinjaCard({ ninja, thresholds, canWrite = true, onDelete }: NinjaCardProps) {
  const router = useRouter()

  const unpaidCount = ninja.taxes.filter(t => !t.paid).length
  const accentClass = unpaidCount > 0
    ? 'border-l-red-800/70'
    : ninja.points > 0
    ? 'border-l-gold/40'
    : 'border-l-border'

  return (
    <div
      className={`card p-4 hover:border-gold/40 hover:shadow-glow-sm transition-all duration-200 cursor-pointer group relative border-l-2 ${accentClass}`}
      onClick={() => router.push(`/ninja/${ninja.id}`)}
    >
      {/* Delete */}
      {canWrite && <button
        onClick={(e) => {
          e.stopPropagation()
          if (confirm(`Supprimer ${ninja.name} ?`)) onDelete(ninja.id)
        }}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200
                   w-7 h-7 flex items-center justify-center rounded-md text-ink-faint hover:text-red-400 hover:bg-red-950"
        title="Supprimer"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>}

      {/* Name */}
      <h3 className="font-semibold text-ink truncate pr-8 group-hover:text-gold transition-colors duration-200 mb-3">
        {ninja.name}
      </h3>

      {/* Points + Grades */}
      <div className="flex items-end justify-between gap-2">
        {/* Points */}
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-2xl font-semibold text-gold">
            {Math.round(ninja.points).toLocaleString('fr-FR')}
          </span>
          <span className="text-xs text-ink-muted">pts</span>
        </div>

        {/* Grade mini-table */}
        <div
          className="flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
          title="Éligibilité aux grades"
        >
          <div className="flex gap-2.5">
            {GRADES.map((g) => {
              const eligible = ninja.points >= thresholds[g.key]
              return (
                <div key={g.key} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-mono text-ink-muted leading-none">{g.label}</span>
                  {eligible ? (
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-ink-faint" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tax badge */}
      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
        {unpaidCount === 0 ? (
          <span className="badge-paid">
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            À jour
          </span>
        ) : (
          <span className="badge-unpaid">
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            {unpaidCount} sem. impayée{unpaidCount > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}
