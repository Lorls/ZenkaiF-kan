'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

interface Stats {
  ninjas: { total: number; upToDate: number; inDebt: number }
  taxes: { totalUnpaid: number; complianceRate: number }
  points: { total: number }
  topDonors: { id: number; name: string; points: number }[]
  mostInDebt: { id: number; name: string; unpaid: number }[]
}

export default function StatsPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats').then(r => {
      if (!r.ok) { router.push('/dashboard'); return null }
      return r.json()
    }).then(d => { if (d) { setStats(d); setLoading(false) } })
  }, [router])

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="pt-14 lg:pt-0 lg:ml-64">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-pulse space-y-4">
            <div className="h-8 bg-bg-card rounded w-48" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-bg-card rounded" />)}
            </div>
            <div className="h-20 bg-bg-card rounded" />
            <div className="grid lg:grid-cols-2 gap-4 items-start">
              <div className="h-48 bg-bg-card rounded" />
              <div className="h-48 bg-bg-card rounded" />
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!stats) return null

  const complianceColor =
    stats.taxes.complianceRate === 100 ? 'text-emerald-400' :
    stats.taxes.complianceRate >= 70 ? 'text-gold' : 'text-red-400'

  return (
    <>
      <Navbar />
      <div className="pt-14 lg:pt-0 lg:ml-64">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <h1 className="text-2xl font-bold text-ink">Statistiques</h1>

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-4">
              <p className="text-xs text-ink-muted mb-1">Ninjas</p>
              <p className="font-mono text-2xl font-bold text-ink">{stats.ninjas.total}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-ink-muted mb-1">Conformité fiscale</p>
              <p className={`font-mono text-2xl font-bold ${complianceColor}`}>
                {stats.taxes.complianceRate} %
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-ink-muted mb-1">Sem. impayées</p>
              <p className={`font-mono text-2xl font-bold ${stats.taxes.totalUnpaid > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {stats.taxes.totalUnpaid}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-ink-muted mb-1">Points totaux</p>
              <p className="font-mono text-2xl font-bold text-gold">
                {stats.points.total.toLocaleString('fr-FR')}
              </p>
            </div>
          </div>

          {/* Compliance bar */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-ink">Situation fiscale</h2>
              <span className="text-xs text-ink-muted">
                {stats.ninjas.upToDate} / {stats.ninjas.total} à jour
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-bg-elevated overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${stats.taxes.complianceRate}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-emerald-400">{stats.ninjas.upToDate} à jour</span>
              {stats.ninjas.inDebt > 0 && (
                <span className="text-xs text-red-400">{stats.ninjas.inDebt} en retard</span>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 items-start">
            {/* Top donateurs */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-ink mb-4">Top donateurs</h2>
              {stats.topDonors.length === 0 ? (
                <p className="text-ink-muted text-sm">Aucun ninja enregistré</p>
              ) : (
                <div className="space-y-2">
                  {stats.topDonors.map((n, i) => (
                    <Link
                      key={n.id}
                      href={`/ninja/${n.id}`}
                      className="flex items-center gap-3 py-2 px-3 rounded-lg bg-bg-elevated/40 hover:bg-bg-elevated transition-colors group"
                    >
                      <span className="text-xs font-mono text-ink-faint w-4 text-right shrink-0">{i + 1}</span>
                      <span className="flex-1 text-sm text-ink group-hover:text-gold transition-colors truncate">{n.name}</span>
                      <span className="font-mono text-sm font-semibold text-gold shrink-0">
                        {n.points.toLocaleString('fr-FR')} pts
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Plus en retard */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-ink mb-4">Plus en retard</h2>
              {stats.mostInDebt.length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-400">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-sm">Tout le monde est à jour</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.mostInDebt.map((n) => (
                    <Link
                      key={n.id}
                      href={`/ninja/${n.id}`}
                      className="flex items-center gap-3 py-2 px-3 rounded-lg bg-red-950/20 border border-red-900/20 hover:border-red-900/40 transition-colors group"
                    >
                      <span className="flex-1 text-sm text-ink group-hover:text-red-300 transition-colors truncate">{n.name}</span>
                      <span className="font-mono text-sm font-semibold text-red-400 shrink-0">
                        {n.unpaid} sem.
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
