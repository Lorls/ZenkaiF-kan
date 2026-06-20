'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { RESOURCES } from '@/lib/resources'
import { getWeekStart, getNextWeekStart, formatWeekRange } from '@/lib/week'
import { GRADES, GradeKey, GradeThresholds, DEFAULT_THRESHOLDS } from '@/lib/grades'
import { getTaxRyosByGrade, getLateFeeForWeek, getTotalOwed, DEMOTION_THRESHOLD_WEEKS } from '@/lib/taxUtils'
import { can } from '@/lib/permissions'

interface Donation {
  id: number
  resource: string
  amount: number
  pointsEarned: number
  createdAt: string
}

interface Tax {
  id: number
  weekStart: string
  paid: boolean
}

interface Ninja {
  id: number
  name: string
  points: number
  exonerations: number
  donations: Donation[]
  taxes: Tax[]
}

interface ResourceValues {
  [key: string]: number
}

export default function NinjaPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [ninja, setNinja] = useState<Ninja | null>(null)
  const [resourceValues, setResourceValues] = useState<ResourceValues>({})
  const [loading, setLoading] = useState(true)
  const [canWrite, setCanWrite] = useState(true)
  const [thresholds, setThresholds] = useState<GradeThresholds>(DEFAULT_THRESHOLDS)
  const [taxGrade, setTaxGrade] = useState<GradeKey | null>(null)

  // Edit states
  const [editName, setEditName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [editPoints, setEditPoints] = useState(false)
  const [pointsInput, setPointsInput] = useState('')

  // Inline donation state
  const [pendingAmounts, setPendingAmounts] = useState<Record<string, number>>({})
  const [editingResource, setEditingResource] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [submittingResource, setSubmittingResource] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)

  const currentWeekStart = getWeekStart()
  const nextWeekStart = getNextWeekStart()

  const load = useCallback(async () => {
    const [ninjaRes, valuesRes, meRes, gradesRes] = await Promise.all([
      fetch(`/api/ninjas/${id}`),
      fetch('/api/settings'),
      fetch('/api/auth/me'),
      fetch('/api/grades'),
    ])
    if (!ninjaRes.ok) { router.push('/dashboard'); return }
    const [ninjaData, valuesData, meData, gradesData] = await Promise.all([ninjaRes.json(), valuesRes.json(), meRes.ok ? meRes.json() : null, gradesRes.json()])
    setNinja(ninjaData)
    setNameInput(ninjaData.name)
    setPointsInput(String(Math.round(ninjaData.points)))
    setResourceValues(valuesData)
    setCanWrite(can(meData?.role ?? '', 'ninjas:write'))
    setThresholds(gradesData)
    setLoading(false)
  }, [id, router])

  useEffect(() => { load() }, [load])

  async function saveName() {
    if (!ninja || !nameInput.trim()) return
    const res = await fetch(`/api/ninjas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameInput }),
    })
    if (res.ok) { setNinja((n) => n ? { ...n, name: nameInput } : n); setEditName(false) }
  }

  async function savePoints() {
    if (!ninja) return
    const pts = parseFloat(pointsInput)
    if (isNaN(pts)) return
    const res = await fetch(`/api/ninjas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: pts }),
    })
    if (res.ok) { setNinja((n) => n ? { ...n, points: pts } : n); setEditPoints(false) }
  }

  function setPending(resource: string, value: number) {
    setPendingAmounts((prev) => ({ ...prev, [resource]: Math.max(0, value) }))
  }

  function startEditing(resource: string) {
    setEditingResource(resource)
    setEditingValue(String(pendingAmounts[resource] ?? 0))
  }

  function commitEditing() {
    if (!editingResource) return
    const v = parseFloat(editingValue)
    setPending(editingResource, isNaN(v) ? 0 : v)
    setEditingResource(null)
  }

  async function submitDonation(resource: string) {
    const amount = pendingAmounts[resource] ?? 0
    if (amount <= 0) return
    setSubmittingResource(resource)
    const res = await fetch('/api/donations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ninjaId: id, resource, amount }),
    })
    if (res.ok) {
      setPending(resource, 0)
      await load()
    }
    setSubmittingResource(null)
  }

  async function deleteDonation(donationId: number) {
    if (!confirm('Supprimer ce don ?')) return
    await fetch(`/api/donations/${donationId}`, { method: 'DELETE' })
    await load()
  }

  async function markAllPaid() {
    if (!ninja || unpaidWeeks.length === 0) return
    setMarkingAll(true)
    await fetch('/api/taxes/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ninjaId: id,
        weekStarts: unpaidWeeks.map(w => w.toISOString()),
        paid: true,
      }),
    })
    await load()
    setMarkingAll(false)
  }

  async function toggleTax(weekStart: Date, currentPaid: boolean) {
    await fetch('/api/taxes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ninjaId: id, weekStart: weekStart.toISOString(), paid: !currentPaid }),
    })
    await load()
  }

  // Group donations by resource
  const resourceTotals = RESOURCES.reduce((acc, r) => {
    const donations = ninja?.donations.filter((d) => d.resource === r) || []
    acc[r] = {
      amount: donations.reduce((s, d) => s + d.amount, 0),
      points: donations.reduce((s, d) => s + d.pointsEarned, 0),
    }
    return acc
  }, {} as Record<string, { amount: number; points: number }>)

  // Tax helpers
  const unpaidWeeks = (ninja?.taxes ?? [])
    .filter(t => !t.paid)
    .map(t => new Date(t.weekStart))
    .sort((a, b) => a.getTime() - b.getTime())

  const exoneratedWeeks = (ninja?.taxes ?? [])
    .filter(t => t.paid && new Date(t.weekStart).getTime() > currentWeekStart.getTime())
    .map(t => new Date(t.weekStart))
    .sort((a, b) => a.getTime() - b.getTime())

  const currentWeekTax = ninja?.taxes.find(
    t => new Date(t.weekStart).getTime() === currentWeekStart.getTime()
  )

  const weeklyTaxRyos = getTaxRyosByGrade(taxGrade)
  const totalOwed = getTotalOwed(unpaidWeeks, taxGrade)

  if (loading) {
    return (
      <>
        <Navbar />
      <div className="pt-14 lg:pt-0 lg:ml-64">
        <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse space-y-4">
          <div className="h-8 bg-bg-card rounded w-48" />
          <div className="h-32 bg-bg-card rounded" />
        </div>
      </div>
      </>
    )
  }

  if (!ninja) return null

  return (
    <>
      <Navbar />
      <div className="pt-14 lg:pt-0 lg:ml-64">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Back */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-ink-muted hover:text-ink text-sm transition-colors duration-200 cursor-pointer"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Retour
        </button>

        {/* Hero card */}
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            {/* Name */}
            <div className="flex-1">
              <p className="text-xs uppercase tracking-widest text-ink-muted mb-2 font-mono">Ninja</p>
              {!canWrite ? (
                <h1 className="text-2xl font-bold text-ink">{ninja.name}</h1>
              ) : editName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="input text-xl font-bold"
                    onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditName(false) }}
                    autoFocus
                  />
                  <button onClick={saveName} className="btn-primary px-3 py-2 text-sm">OK</button>
                  <button onClick={() => setEditName(false)} className="btn-ghost px-3 py-2 text-sm">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => setEditName(true)}
                  className="text-2xl font-bold text-ink hover:text-gold transition-colors cursor-pointer group flex items-center gap-2"
                >
                  {ninja.name}
                  <svg viewBox="0 0 24 24" className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                  </svg>
                </button>
              )}
            </div>

            {/* Points */}
            <div className="sm:text-right">
              <p className="text-xs uppercase tracking-widest text-ink-muted mb-2 font-mono">Points</p>
              {!canWrite ? (
                <p className="font-mono text-3xl font-bold text-gold sm:text-right">
                  {Math.round(ninja.points).toLocaleString('fr-FR')}
                </p>
              ) : editPoints ? (
                <div className="flex items-center gap-2 sm:justify-end">
                  <input
                    type="number"
                    value={pointsInput}
                    onChange={(e) => setPointsInput(e.target.value)}
                    className="input font-mono text-xl font-bold text-gold w-32"
                    onKeyDown={(e) => { if (e.key === 'Enter') savePoints(); if (e.key === 'Escape') setEditPoints(false) }}
                    autoFocus
                  />
                  <button onClick={savePoints} className="btn-primary px-3 py-2 text-sm">OK</button>
                  <button onClick={() => setEditPoints(false)} className="btn-ghost px-3 py-2 text-sm">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => { setPointsInput(String(ninja.points)); setEditPoints(true) }}
                  className="font-mono text-3xl font-bold text-gold hover:text-gold-light transition-colors cursor-pointer group flex items-center gap-2 sm:justify-end"
                >
                  {Math.round(ninja.points).toLocaleString('fr-FR')}
                  <svg viewBox="0 0 24 24" className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                  </svg>
                </button>
              )}
              {canWrite && <p className="text-xs text-ink-muted mt-0.5">Cliquer pour modifier</p>}
            </div>
          </div>
        </div>

        {/* Taxes + Resources side by side */}
        <div className="grid lg:grid-cols-[40%_1fr] gap-6 items-start">

          {/* Taxes */}
          <div className="card p-5 space-y-4">
            <h2 className="text-base font-semibold text-ink">Taxes</h2>

            {/* Sélecteur de grade fiscal */}
            <div className="pb-4 border-b border-border-subtle">
              <p className="text-xs text-ink-muted mb-2">Grade fiscal (simulation)</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setTaxGrade(null)}
                  className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-all duration-150 cursor-pointer ${
                    taxGrade === null
                      ? 'border-ink-muted bg-bg-elevated text-ink'
                      : 'border-border-subtle text-ink-faint hover:border-ink-muted hover:text-ink-muted'
                  }`}
                >
                  Exonéré
                </button>
                {GRADES.map(g => {
                  const eligible = ninja ? ninja.points >= thresholds[g.key] : false
                  return (
                    <button
                      key={g.key}
                      onClick={() => setTaxGrade(g.key)}
                      className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-all duration-150 cursor-pointer ${
                        taxGrade === g.key
                          ? 'border-gold bg-gold/10 text-gold'
                          : 'border-border-subtle text-ink-faint hover:border-gold/40 hover:text-ink-muted'
                      }`}
                      title={eligible ? `Éligible (${g.taxRyos.toLocaleString('fr-FR')} ¥/sem.)` : `Non éligible (${g.taxRyos.toLocaleString('fr-FR')} ¥/sem.)`}
                    >
                      {g.label}
                      {eligible && <span className="ml-1 text-emerald-400">✓</span>}
                    </button>
                  )
                })}
              </div>
              {taxGrade !== null && (() => {
                const nextWeekPaid = (ninja.taxes ?? []).some(t =>
                  t.paid && getWeekStart(new Date(t.weekStart)).getTime() === nextWeekStart.getTime()
                )
                const exoRyos = Math.round((ninja.exonerations ?? 0) * weeklyTaxRyos)
                const nextWeekOwed = nextWeekPaid ? 0 : Math.max(0, weeklyTaxRyos - exoRyos)
                return (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-gold font-mono">
                      {weeklyTaxRyos.toLocaleString('fr-FR')} ¥ / semaine
                    </p>
                    <div className="rounded-lg bg-bg-elevated/50 p-2.5 border border-border-subtle space-y-1.5">
                      <p className="text-[10px] uppercase tracking-wider text-ink-faint font-medium">Semaine prochaine</p>
                      {nextWeekPaid ? (
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          <span className="text-xs font-medium">Déjà payée — 0 ¥ dû</span>
                        </div>
                      ) : exoRyos > 0 ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-xs text-ink-muted">Base</span>
                            <span className="text-xs font-mono text-ink">{weeklyTaxRyos.toLocaleString('fr-FR')} ¥</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-ink-muted">Exonération</span>
                            <span className="text-xs font-mono text-emerald-400">−{exoRyos.toLocaleString('fr-FR')} ¥</span>
                          </div>
                          <div className="flex justify-between border-t border-border-subtle pt-1.5">
                            <span className="text-xs font-semibold text-ink">À payer</span>
                            <span className="text-xs font-mono font-bold text-gold">{nextWeekOwed.toLocaleString('fr-FR')} ¥</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between">
                          <span className="text-xs text-ink-muted">À payer</span>
                          <span className="text-xs font-mono font-bold text-gold">{weeklyTaxRyos.toLocaleString('fr-FR')} ¥</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>

            {taxGrade === null && (
              <p className="text-xs text-ink-faint italic">
                Sélectionne un grade pour simuler la dette fiscale.
              </p>
            )}

            {weeklyTaxRyos > 0 && (
              <>
                {/* Compteurs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-bg-elevated/50 p-3 border border-border-subtle">
                    <p className="text-xs text-ink-muted mb-1">Semaines impayées</p>
                    <p className={`font-mono text-2xl font-bold ${unpaidWeeks.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {unpaidWeeks.length}
                    </p>
                  </div>
                  <div className="rounded-lg bg-bg-elevated/50 p-3 border border-border-subtle">
                    <p className="text-xs text-ink-muted mb-1">Total dû</p>
                    <p className={`font-mono text-2xl font-bold ${totalOwed > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {totalOwed > 0 ? `${totalOwed.toLocaleString('fr-FR')} ¥` : '—'}
                    </p>
                  </div>
                </div>

                {/* Semaines exonérées à venir */}
                {exoneratedWeeks.length > 0 && (
                  <div>
                    <p className="text-xs text-ink-muted mb-2">
                      Semaines exonérées à venir{' '}
                      <span className="text-gold font-mono">({exoneratedWeeks.length})</span>
                    </p>
                    <div className="space-y-1">
                      {exoneratedWeeks.map(ws => (
                        <div key={ws.toISOString()} className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg bg-gold/5 border border-gold/20">
                          <svg viewBox="0 0 24 24" className="w-3 h-3 text-gold flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          <span className="text-xs text-gold">{formatWeekRange(ws)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Solde en cours */}
                {ninja.exonerations > 0 && (
                  <div className="rounded-lg bg-gold/5 border border-gold/20 p-3 flex items-center justify-between">
                    <p className="text-xs text-gold/80">Solde d&apos;exonération en cours</p>
                    <p className="font-mono text-sm font-semibold text-gold">
                      {ninja.exonerations.toFixed(2)} / 1.00
                    </p>
                  </div>
                )}

                {/* Alerte rétrogradation */}
                {unpaidWeeks.length >= DEMOTION_THRESHOLD_WEEKS && (
                  <div className="rounded-lg bg-red-950/30 border border-red-800/50 p-3">
                    <p className="text-xs text-red-400 font-semibold">Rétrogradation requise</p>
                    <p className="text-xs text-red-400/70 mt-0.5">Plus de 2 ans de taxes impayées</p>
                  </div>
                )}

                {/* Semaine courante */}
                <div>
                  <p className="text-xs text-ink-muted mb-2">Semaine actuelle — {formatWeekRange(currentWeekStart)}</p>
                  <button
                    onClick={() => canWrite && toggleTax(currentWeekStart, currentWeekTax?.paid === true)}
                    disabled={!canWrite}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-200 ${canWrite ? 'cursor-pointer' : 'cursor-default'} ${
                      currentWeekTax?.paid === true
                        ? `badge-paid ${canWrite ? 'hover:bg-emerald-900' : ''}`
                        : `badge-unpaid ${canWrite ? 'hover:bg-red-900' : ''}`
                    }`}
                  >
                    {currentWeekTax?.paid === true ? (
                      <>
                        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        Payée
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Impayée
                      </>
                    )}
                  </button>
                </div>

                {/* Liste des semaines impayées */}
                {unpaidWeeks.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-ink-muted">Semaines en retard</p>
                      {canWrite && unpaidWeeks.length > 1 && (
                        <button
                          onClick={markAllPaid}
                          disabled={markingAll}
                          className="text-[10px] font-medium text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          {markingAll ? '…' : `Tout marquer payé (${unpaidWeeks.length})`}
                        </button>
                      )}
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {unpaidWeeks.map((ws) => {
                        const lateFee = getLateFeeForWeek(ws)
                        const isCurrent = ws.getTime() === currentWeekStart.getTime()
                        return (
                          <div key={ws.toISOString()} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-red-950/20 border border-red-900/30">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${isCurrent ? 'text-gold' : 'text-ink-muted'}`}>
                                {formatWeekRange(ws)}
                              </span>
                              {lateFee > 0 && (
                                <span className="text-[10px] text-red-400/70 font-mono">+{lateFee.toLocaleString('fr-FR')} ¥</span>
                              )}
                            </div>
                            {canWrite && (
                              <button
                                onClick={() => toggleTax(ws, false)}
                                className="text-[10px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                              >
                                Marquer payée
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Resources — inline donation */}
          <div className="card p-5">
            <h2 className="text-base font-semibold text-ink mb-3">Ressources données</h2>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-2">
              {RESOURCES.map((resource) => {
                const { amount, points } = resourceTotals[resource]
                const pending = pendingAmounts[resource] ?? 0
                const ptsPerUnit = resourceValues[resource] ?? 1
                const pendingPts = Math.round(pending * ptsPerUnit)
                const isEditing = editingResource === resource
                const isSubmitting = submittingResource === resource

                return (
                  <div
                    key={resource}
                    className={`rounded-lg border p-2.5 flex flex-col gap-1.5 transition-colors ${
                      amount > 0 ? 'border-gold/20 bg-gold/5' : 'border-border-subtle bg-bg-elevated/20'
                    }`}
                  >
                    {/* Label + total */}
                    <p className="text-xs text-ink-muted truncate leading-tight">{resource}</p>
                    <p className={`font-mono text-base font-semibold leading-none ${amount > 0 ? 'text-ink' : 'text-ink-faint'}`}>
                      {amount > 0 ? amount.toLocaleString('fr-FR') : '—'}
                    </p>
                    {amount > 0 && (
                      <p className="text-xs text-gold leading-none">+{Math.round(points)} pts</p>
                    )}

                    {/* Pending controls + confirm — hidden for VISITEUR */}
                    {canWrite && (
                      <>
                        <div className="mt-auto pt-1.5 border-t border-border-subtle/50 flex items-center gap-1">
                          {/* − */}
                          <button
                            onClick={() => setPending(resource, pending - 1)}
                            disabled={pending <= 0}
                            className="w-6 h-6 rounded flex items-center justify-center border border-gold/30 bg-gold/5 text-gold/70 hover:border-gold/70 hover:bg-gold/15 hover:text-gold disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer text-sm font-bold leading-none select-none"
                          >−</button>

                          {/* Editable amount */}
                          {isEditing ? (
                            <input
                              type="number"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={commitEditing}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') commitEditing() }}
                              className="flex-1 min-w-0 font-mono text-xs text-center bg-bg-elevated border border-gold/40 rounded px-1 py-0.5 outline-none text-ink"
                              style={{ MozAppearance: 'textfield' }}
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() => startEditing(resource)}
                              className={`flex-1 font-mono text-xs text-center rounded px-1 py-0.5 transition-colors duration-150 cursor-pointer border ${
                                pending > 0
                                  ? 'text-gold border-gold/30 bg-gold/10 hover:bg-gold/15'
                                  : 'text-ink-faint border-transparent hover:border-border-subtle hover:text-ink-muted'
                              }`}
                            >
                              {pending > 0 ? pending.toLocaleString('fr-FR') : '0'}
                            </button>
                          )}

                          {/* + */}
                          <button
                            onClick={() => setPending(resource, pending + 1)}
                            className="w-6 h-6 rounded flex items-center justify-center border border-gold/30 bg-gold/5 text-gold/70 hover:border-gold/70 hover:bg-gold/15 hover:text-gold transition-all duration-150 cursor-pointer text-sm font-bold leading-none select-none"
                          >+</button>
                        </div>

                        {/* Confirm button */}
                        {pending > 0 && (
                          <button
                            onClick={() => submitDonation(resource)}
                            disabled={isSubmitting}
                            className="w-full text-xs font-medium py-1 px-2 rounded border border-gold/40 bg-gold/10 text-gold hover:bg-gold/20 hover:border-gold/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
                          >
                            {isSubmitting ? '…' : `+${pendingPts} pts`}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Donation history */}
        {ninja.donations.length > 0 && (
          <div className="card p-6">
            <h2 className="text-base font-semibold text-ink mb-4">Historique des dons</h2>
            <div className="space-y-1.5">
              {ninja.donations.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-bg-elevated/40 group">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-ink">{d.resource}</span>
                    <span className="font-mono text-sm text-ink-muted">×{d.amount.toLocaleString('fr-FR')}</span>
                    <span className="text-xs text-gold">+{Math.round(d.pointsEarned)} pts</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-ink-faint">
                      {new Date(d.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </span>
                    {canWrite && <button
                      onClick={() => deleteDonation(d.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-400 cursor-pointer"
                      title="Supprimer ce don"
                    >
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>}
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
