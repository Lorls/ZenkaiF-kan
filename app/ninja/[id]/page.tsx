'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { RESOURCES } from '@/lib/resources'
import { getWeekStart, getNextWeekStart, weekLabel, formatWeekRange } from '@/lib/week'

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

  const currentWeekStart = getWeekStart()
  const nextWeekStart = getNextWeekStart()

  const load = useCallback(async () => {
    const [ninjaRes, valuesRes, meRes] = await Promise.all([
      fetch(`/api/ninjas/${id}`),
      fetch('/api/settings'),
      fetch('/api/auth/me'),
    ])
    if (!ninjaRes.ok) { router.push('/dashboard'); return }
    const [ninjaData, valuesData, meData] = await Promise.all([ninjaRes.json(), valuesRes.json(), meRes.ok ? meRes.json() : null])
    setNinja(ninjaData)
    setNameInput(ninjaData.name)
    setPointsInput(String(Math.round(ninjaData.points)))
    setResourceValues(valuesData)
    setCanWrite(meData?.role !== 'VISITEUR')
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
    await fetch(`/api/donations/${donationId}`, { method: 'DELETE' })
    await load()
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
  function getTaxForWeek(weekStart: Date): Tax | undefined {
    return ninja?.taxes.find((t) => new Date(t.weekStart).getTime() === weekStart.getTime())
  }

  // Past 8 weeks
  const taxWeeks = Array.from({ length: 10 }, (_, i) => {
    const d = new Date(currentWeekStart)
    d.setUTCDate(d.getUTCDate() - i * 7)
    return d
  }).reverse()
  taxWeeks.push(nextWeekStart)

  if (loading) {
    return (
      <>
        <Navbar />
      <div className="ml-64">
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
      <div className="ml-64">
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
          <div className="card p-5">
            <h2 className="text-base font-semibold text-ink mb-3">Taxes hebdomadaires</h2>
            <div className="flex items-center gap-3 mb-2.5">
              <span className="flex items-center gap-1.5 text-xs text-gold"><span className="w-2 h-2 rounded-full bg-gold/60 inline-block" />Semaine courante</span>
              <span className="flex items-center gap-1.5 text-xs text-blue-400"><span className="w-2 h-2 rounded-full bg-blue-500/60 inline-block" />Semaine suivante</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {taxWeeks.map((weekStart) => {
                const tax = getTaxForWeek(weekStart)
                const paid = tax?.paid === true
                const isNext = weekStart.getTime() === nextWeekStart.getTime()
                const isCurrent = weekStart.getTime() === currentWeekStart.getTime()

                return (
                  <div
                    key={weekStart.toISOString()}
                    className={`flex items-center justify-between py-2 px-2.5 rounded-lg border ${
                      isCurrent ? 'border-gold/30 bg-gold/5' : isNext ? 'border-blue-900/50 bg-blue-950/20' : 'border-border-subtle bg-bg-elevated/30'
                    }`}
                  >
                    <span className={`text-xs font-medium truncate mr-1.5 ${
                      isCurrent ? 'text-gold' : isNext ? 'text-blue-400' : 'text-ink-muted'
                    }`}>
                      {formatWeekRange(weekStart)}
                    </span>
                    <button
                      onClick={() => canWrite && toggleTax(weekStart, paid)}
                      disabled={!canWrite}
                      className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border transition-all duration-200 shrink-0 ${canWrite ? 'cursor-pointer' : 'cursor-default'} ${
                        paid
                          ? `badge-paid ${canWrite ? 'hover:bg-emerald-900' : ''}`
                          : `badge-unpaid ${canWrite ? 'hover:bg-red-900' : ''}`
                      }`}
                    >
                      {paid ? (
                        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
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
