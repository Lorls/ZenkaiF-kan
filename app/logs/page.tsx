'use client'

import { useState, useEffect, useCallback } from 'react'
import Navbar from '@/components/Navbar'

interface Log {
  id: number; username: string; action: string; entity: string
  entityName: string | null; description: string; diff: string | null
  sessionId: string | null; reverted: boolean; revertedAt: string | null
  revertedByName: string | null; revertReason: string | null
  isOrphaned: boolean; isCascade: boolean; createdAt: string
}
interface Stats { today: number; total: number; reverts: number; topUser: string | null }

const ACTION_COLORS: Record<string, string> = {
  create: 'text-emerald-400 bg-emerald-950 border-emerald-900',
  update: 'text-blue-400 bg-blue-950 border-blue-900',
  delete: 'text-red-400 bg-red-950 border-red-900',
  import: 'text-purple-400 bg-purple-950 border-purple-900',
  revert: 'text-amber-400 bg-amber-950 border-amber-900',
}
const ACTION_LABELS: Record<string, string> = {
  create: 'Créé', update: 'Modifié', delete: 'Supprimé', import: 'Importé', revert: 'Annulé',
}
const ENTITY_LABELS: Record<string, string> = {
  ninja: 'Ninja', donation: 'Don', tax: 'Taxe', settings: 'Paramètres', grades: 'Grades', import: 'Import',
}

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `il y a ${s}s`
  if (s < 3600) return `il y a ${Math.floor(s / 60)}min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)}h`
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

function groupByDay(logs: Log[]) {
  const groups: Record<string, Log[]> = {}
  for (const log of logs) {
    const day = new Date(log.createdAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!groups[day]) groups[day] = []
    groups[day].push(log)
  }
  return groups
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [logUsers, setLogUsers] = useState<{ username: string; count: number }[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const [search,   setSearch]   = useState('')
  const [user,     setUser]     = useState('')
  const [action,   setAction]   = useState('')
  const [entity,   setEntity]   = useState('')
  const [status,   setStatus]   = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [mode,     setMode]     = useState<'timeline' | 'byUser'>('timeline')

  const [revertModal, setRevertModal] = useState<Log | null>(null)
  const [revertReason, setRevertReason] = useState('')
  const [reverting, setReverting] = useState(false)
  const [revertMsg, setRevertMsg] = useState('')

  const fetchLogs = useCallback(async (p = 1) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p), ...(search && { search }), ...(user && { user }),
      ...(action && { action }), ...(entity && { entity }), ...(status !== 'all' && { status }),
      ...(dateFrom && { dateFrom }), ...(dateTo && { dateTo }),
    })
    const res = await fetch(`/api/logs?${params}`)
    const data = await res.json()
    setLogs(data.logs ?? [])
    setTotal(data.total ?? 0)
    setPages(data.pages ?? 1)
    setStats(data.stats ?? null)
    setPage(p)
    setLoading(false)
  }, [search, user, action, entity, status, dateFrom, dateTo])

  useEffect(() => { fetchLogs(1) }, [fetchLogs])

  useEffect(() => {
    fetch('/api/logs/users').then(r => r.json()).then(d => Array.isArray(d) && setLogUsers(d))
  }, [])

  async function handleRevert() {
    if (!revertModal) return
    setReverting(true)
    const res = await fetch(`/api/logs/${revertModal.id}/revert`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: revertReason }),
    })
    const data = await res.json()
    setRevertMsg(data.message)
    if (data.ok) { setRevertModal(null); setRevertReason(''); fetchLogs(page) }
    setReverting(false)
  }

  async function exportCSV() {
    const params = new URLSearchParams({ page: '1', limit: '9999', ...(search && { search }), ...(user && { user }), ...(action && { action }), ...(entity && { entity }), ...(status !== 'all' && { status }), ...(dateFrom && { dateFrom }), ...(dateTo && { dateTo }) })
    const res = await fetch(`/api/logs?${params}`)
    const { logs: all } = await res.json()
    const header = 'Date,Heure,Utilisateur,Action,Entité,Description,Statut'
    const rows = (all as Log[]).map(l => {
      const d = new Date(l.createdAt)
      const st = l.reverted ? 'annulé' : l.isOrphaned ? 'orphelin' : l.isCascade ? 'cascade' : 'actif'
      return `"${d.toLocaleDateString('fr-FR')}","${d.toLocaleTimeString('fr-FR')}","${l.username}","${l.action}","${l.entity}","${l.description}","${st}"`
    })
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'koeki-logs.csv'; a.click()
  }

  // Group logs by user for byUser mode
  const byUser = logs.reduce((acc, log) => {
    if (!acc[log.username]) acc[log.username] = []
    acc[log.username].push(log)
    return acc
  }, {} as Record<string, Log[]>)

  const canRevert = (log: Log) => !log.reverted && !log.isCascade && !log.isOrphaned && log.action !== 'revert'

  return (
    <>
      <Navbar />
      <div className="ml-64">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Logs</h1>
            <p className="text-ink-muted text-sm mt-0.5">Journal complet de toutes les actions</p>
          </div>
          <button onClick={exportCSV} className="btn-ghost text-sm flex items-center gap-1.5 border border-border rounded-lg px-3 py-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total', val: stats.total, color: 'text-ink' },
              { label: "Aujourd'hui", val: stats.today, color: 'text-gold' },
              { label: 'Annulations', val: stats.reverts, color: 'text-amber-400' },
              { label: 'Plus actif', val: stats.topUser ?? '—', color: 'text-emerald-400' },
            ].map(s => (
              <div key={s.label} className="card px-4 py-3">
                <p className={`font-mono text-xl font-bold ${s.color}`}>{s.val}</p>
                <p className="text-xs text-ink-muted mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="card p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par ninja, action, utilisateur, ressource…" className="input pl-9" />
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap gap-2">
            <select value={user} onChange={e => setUser(e.target.value)} className="input w-auto text-sm">
              <option value="">Tous les utilisateurs</option>
              {logUsers.map(u => <option key={u.username} value={u.username}>{u.username} ({u.count})</option>)}
            </select>

            <select value={action} onChange={e => setAction(e.target.value)} className="input w-auto text-sm">
              <option value="">Toutes les actions</option>
              <option value="create">Créations</option>
              <option value="update">Modifications</option>
              <option value="delete">Suppressions</option>
              <option value="import">Imports</option>
              <option value="revert">Annulations</option>
            </select>

            <select value={entity} onChange={e => setEntity(e.target.value)} className="input w-auto text-sm">
              <option value="">Toutes les entités</option>
              <option value="ninja">Ninjas</option>
              <option value="donation">Dons</option>
              <option value="tax">Taxes</option>
              <option value="settings">Paramètres</option>
              <option value="grades">Grades</option>
              <option value="import">Imports</option>
            </select>

            <select value={status} onChange={e => setStatus(e.target.value)} className="input w-auto text-sm">
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="reverted">Annulé</option>
              <option value="orphaned">Orphelin</option>
              <option value="cascade">Cascade</option>
            </select>

            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input w-auto text-sm" title="Du" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input w-auto text-sm" title="Au" />

            {(search || user || action || entity || status !== 'all' || dateFrom || dateTo) && (
              <button onClick={() => { setSearch(''); setUser(''); setAction(''); setEntity(''); setStatus('all'); setDateFrom(''); setDateTo('') }}
                className="btn-ghost text-sm text-red-400 hover:text-red-300">
                ✕ Effacer
              </button>
            )}
          </div>

          {/* Mode + count */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {(['timeline', 'byUser'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${mode === m ? 'bg-bg-elevated text-ink' : 'text-ink-muted hover:text-ink'}`}>
                  {m === 'timeline' ? 'Timeline' : 'Par utilisateur'}
                </button>
              ))}
            </div>
            <span className="text-xs text-ink-muted">{total} résultat{total !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Logs */}
        {loading ? (
          <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-16 card animate-pulse" />)}</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-ink-muted">Aucun log trouvé</div>
        ) : mode === 'timeline' ? (
          <div className="space-y-6">
            {Object.entries(groupByDay(logs)).map(([day, dayLogs]) => (
              <div key={day}>
                <p className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-2 px-1">{day}</p>
                <div className="space-y-1.5">
                  {dayLogs.map(log => <LogRow key={log.id} log={log} onRevert={() => { setRevertModal(log); setRevertMsg('') }} canRevert={canRevert(log)} />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(byUser).map(([uname, uLogs]) => (
              <div key={uname} className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-bg-elevated/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gold/10 text-gold text-sm font-bold flex items-center justify-center">
                      {uname[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-ink">{uname}</span>
                    <span className="text-xs text-ink-muted">{uLogs.length} action{uLogs.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="divide-y divide-border-subtle">
                  {uLogs.map(log => <LogRow key={log.id} log={log} onRevert={() => { setRevertModal(log); setRevertMsg('') }} canRevert={canRevert(log)} compact />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination — toujours visible */}
        {total > 0 && (
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-ink-muted">
              {((page - 1) * 50) + 1}–{Math.min(page * 50, total)} sur {total} entrée{total !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchLogs(page - 1)}
                disabled={page === 1}
                className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Préc.
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                  let p: number
                  if (pages <= 7) p = i + 1
                  else if (page <= 4) p = i + 1
                  else if (page >= pages - 3) p = pages - 6 + i
                  else p = page - 3 + i
                  return (
                    <button
                      key={p}
                      onClick={() => fetchLogs(p)}
                      className={`w-8 h-8 rounded-md text-sm font-mono transition-colors ${
                        p === page
                          ? 'bg-gold text-bg-base font-bold'
                          : 'text-ink-muted hover:text-ink hover:bg-bg-elevated'
                      }`}
                    >
                      {p}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => fetchLogs(page + 1)}
                disabled={page === pages}
                className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Suiv. →
              </button>
            </div>
            <span className="text-xs text-ink-muted">Page {page}/{pages}</span>
          </div>
        )}
      </main>

      {/* Revert modal */}
      {revertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setRevertModal(null)}>
          <div className="card w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-ink text-lg">Annuler cette action ?</h3>
            <div className={`text-sm p-3 rounded-lg border ${ACTION_COLORS[revertModal.action] ?? 'border-border'}`}>
              {revertModal.description}
            </div>
            <div>
              <label className="block text-xs text-ink-muted mb-1.5">Raison (optionnel)</label>
              <input value={revertReason} onChange={e => setRevertReason(e.target.value)}
                className="input text-sm" placeholder="Ex: erreur de saisie" />
            </div>
            {revertMsg && <p className="text-red-400 text-sm">{revertMsg}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setRevertModal(null)} className="btn-ghost flex-1">Annuler</button>
              <button onClick={handleRevert} disabled={reverting} className="btn-primary flex-1 bg-amber-600 hover:bg-amber-500">
                {reverting ? 'En cours…' : '↩ Confirmer l\'annulation'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}

function LogRow({ log, onRevert, canRevert, compact = false }: { log: Log; onRevert: () => void; canRevert: boolean; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const diff = log.diff ? (() => { try { return JSON.parse(log.diff!) } catch { return null } })() : null
  const actionColor = ACTION_COLORS[log.action] ?? 'text-ink-muted bg-bg-elevated border-border'

  return (
    <div className={`group flex items-start gap-3 px-4 py-3 hover:bg-bg-elevated/20 transition-colors ${log.reverted || log.isCascade ? 'opacity-50' : ''}`}>
      {/* Action badge */}
      <span className={`flex-shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border mt-0.5 ${actionColor}`}>
        {ACTION_LABELS[log.action] ?? log.action}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-xs font-medium text-gold">{log.username}</span>
          {log.entityName && <span className="text-xs text-ink-muted">· {log.entityName}</span>}
          {log.entity && <span className="text-[10px] text-ink-faint bg-bg-elevated px-1.5 py-0.5 rounded">{ENTITY_LABELS[log.entity] ?? log.entity}</span>}
        </div>
        <p className={`text-sm mt-0.5 ${log.reverted ? 'line-through text-ink-muted' : 'text-ink'}`}>{log.description}</p>

        {/* Status badges */}
        <div className="flex gap-1.5 mt-1 flex-wrap">
          {log.reverted && <span className="text-[10px] text-amber-400 bg-amber-950 border border-amber-900 px-1.5 py-0.5 rounded">ANNULÉ{log.revertedByName ? ` par ${log.revertedByName}` : ''}</span>}
          {log.isCascade && <span className="text-[10px] text-ink-faint bg-bg-elevated border border-border px-1.5 py-0.5 rounded">CASCADE</span>}
          {log.isOrphaned && <span className="text-[10px] text-amber-500 bg-amber-950 border border-amber-900 px-1.5 py-0.5 rounded">⚠ ORPHELIN</span>}
          {log.revertReason && <span className="text-[10px] text-ink-faint italic">"{log.revertReason}"</span>}
        </div>

        {/* Diff expanded */}
        {expanded && diff && (
          <div className="mt-2 text-xs font-mono bg-bg-elevated rounded p-2 text-ink-muted space-y-0.5">
            {Object.entries(diff).filter(([k]) => !['after', 'before', 'revertedLogId'].includes(k)).map(([k, v]) => (
              <div key={k}><span className="text-ink-faint">{k}:</span> {JSON.stringify(v)}</div>
            ))}
            {diff.before && <div><span className="text-red-400">− </span>{JSON.stringify(diff.before).slice(0, 120)}</div>}
            {diff.after  && <div><span className="text-emerald-400">+ </span>{JSON.stringify(diff.after).slice(0, 120)}</div>}
          </div>
        )}
      </div>

      {/* Right: time + actions */}
      <div className="flex-shrink-0 flex items-center gap-2">
        <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-ink-faint hover:text-ink transition-colors" title="Voir le diff">
          {diff ? (expanded ? '▲' : '▼') : ''}
        </button>
        <span className="text-xs text-ink-faint whitespace-nowrap">{timeAgo(log.createdAt)}</span>
        {canRevert && (
          <button onClick={onRevert}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-amber-400 hover:text-amber-300 bg-amber-950 hover:bg-amber-900 border border-amber-900 px-2 py-0.5 rounded whitespace-nowrap">
            ↩ Annuler
          </button>
        )}
      </div>
    </div>
  )
}
