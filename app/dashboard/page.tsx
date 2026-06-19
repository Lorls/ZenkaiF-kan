'use client'

import { useEffect, useState } from 'react'
import NinjaCard from '@/components/NinjaCard'
import AddNinjaModal from '@/components/AddNinjaModal'
import Navbar from '@/components/Navbar'
import { getWeekStart, formatWeekRange } from '@/lib/week'
import { GradeThresholds, DEFAULT_THRESHOLDS } from '@/lib/grades'

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

export default function DashboardPage() {
  const [ninjas, setNinjas] = useState<Ninja[]>([])
  const [thresholds, setThresholds] = useState<GradeThresholds>(DEFAULT_THRESHOLDS)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [canWrite, setCanWrite] = useState(true)

  const currentWeek = formatWeekRange(getWeekStart())

  useEffect(() => {
    Promise.all([
      fetch('/api/ninjas').then(r => r.json()),
      fetch('/api/grades').then(r => r.json()),
      fetch('/api/auth/me').then(r => r.ok ? r.json() : null),
    ]).then(([ninjaData, gradeData, meData]) => {
      setNinjas(Array.isArray(ninjaData) ? ninjaData : [])
      setThresholds(gradeData)
      setCanWrite(meData?.role !== 'VISITEUR')
      setLoading(false)
    })
  }, [])

  function handleDelete(id: number) {
    fetch(`/api/ninjas/${id}`, { method: 'DELETE' }).then(() =>
      setNinjas((prev) => prev.filter((n) => n.id !== id))
    )
  }

  async function handleTaxToggle(ninjaId: number, currentPaid: boolean) {
    const weekStart = getWeekStart()
    await fetch('/api/taxes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ninjaId, weekStart: weekStart.toISOString(), paid: !currentPaid }),
    })
    setNinjas((prev) =>
      prev.map((n) => {
        if (n.id !== ninjaId) return n
        const ws = weekStart.getTime()
        const exists = n.taxes.some((t) => new Date(t.weekStart).getTime() === ws)
        const taxes = exists
          ? n.taxes.map((t) =>
              new Date(t.weekStart).getTime() === ws ? { ...t, paid: !currentPaid } : t
            )
          : [...n.taxes, { weekStart: weekStart.toISOString(), paid: !currentPaid }]
        return { ...n, taxes }
      })
    )
  }

  const normalize = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

  const filtered = ninjas.filter((n) => {
    const name = normalize(n.name)
    return normalize(search).split(/\s+/).filter(Boolean).every((token) => name.includes(token))
  })

  const currentWeekStart = getWeekStart().getTime()
  const paidCount = ninjas.filter((n) =>
    n.taxes.some((t) => new Date(t.weekStart).getTime() === currentWeekStart && t.paid)
  ).length

  return (
    <>
      <Navbar />
      <div className="ml-64">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-ink">Ninjas</h1>
            <p className="text-ink-muted text-sm mt-0.5">
              Semaine actuelle : {currentWeek}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 text-sm text-ink-muted mr-2">
              <span>
                <span className="font-mono text-ink font-semibold">{ninjas.length}</span> ninjas
              </span>
              <span>
                <span className="font-mono text-emerald-400 font-semibold">{paidCount}</span>
                /{ninjas.length} taxes payées
              </span>
            </div>

            {canWrite && (
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Ajouter
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        {ninjas.length > 0 && (
          <div className="relative mb-6 max-w-sm">
            <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher un ninja..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-5 bg-bg-elevated rounded w-3/4 mb-4" />
                <div className="h-8 bg-bg-elevated rounded w-1/2 mb-3" />
                <div className="h-5 bg-bg-elevated rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-ink-muted">
            {search ? (
              <p>Aucun ninja trouvé pour &quot;{search}&quot;</p>
            ) : (
              <div>
                <p className="text-lg mb-2">Aucun ninja enregistré</p>
                <p className="text-sm">Clique sur &quot;Ajouter&quot; pour inscrire le premier ninja.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((ninja) => (
              <NinjaCard
                key={ninja.id}
                ninja={ninja}
                thresholds={thresholds}
                canWrite={canWrite}
                onDelete={handleDelete}
                onTaxToggle={handleTaxToggle}
              />
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <AddNinjaModal
          onClose={() => setShowModal(false)}
          onAdd={(ninja) => setNinjas((prev) => [...prev, ninja].sort((a, b) => a.name.localeCompare(b.name)))}
        />
      )}
      </div>
    </>
  )
}
