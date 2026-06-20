'use client'

import { useState, useRef } from 'react'
import Navbar from '@/components/Navbar'
import { RESOURCES } from '@/lib/resources'
import { isoWeekToDate, getWeekStart, formatWeekRange } from '@/lib/week'

interface ParsedRow {
  name: string
  weekStart: string   // ISO date string
  weekLabel: string   // human-readable
  taxe: string
  resources: Record<string, number>
  _skip: boolean
  _note?: string
}

function parseFrenchNumber(val: string): number {
  if (!val || val.trim() === '') return 0
  const cleaned = val.trim().replace(/[\s ]/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

function parseCSV(text: string): ParsedRow[] {
  const allLines = text.split('\n').map(l => l.trimEnd())

  // Detect separator
  const nonEmpty = allLines.find(l => l.trim().length > 0) ?? ''
  const sep = nonEmpty.includes('\t') ? '\t' : nonEmpty.includes(';') ? ';' : ','

  const lines = allLines.map(l => l.split(sep).map(c => c.trim().replace(/^"|"$/g, '')))

  // Find header row: first row containing "nom personne" or "taxe"
  let headerIdx = -1
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const row = lines[i].map(c => c.toLowerCase())
    if (row.some(c => c.includes('nom personne') || (c.includes('taxe') && !c.includes('total')))) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return []

  const headers = lines[headerIdx]

  const findCol = (...names: string[]) => {
    for (const name of names) {
      const idx = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()))
      if (idx >= 0) return idx
    }
    return -1
  }

  const nameIdx = findCol('nom personne', 'personne')
  const dateIdx = findCol('date')
  const taxeIdx = findCol('taxe')
  const anneeSemaineIdx = findCol('année-semaine', 'annee-semaine', 'semaine', 'année')

  const resourceIdx: Record<string, number> = {}
  for (const r of RESOURCES) {
    const idx = headers.findIndex(h => h.trim().toLowerCase() === r.toLowerCase())
    if (idx >= 0) resourceIdx[r] = idx
  }

  const rows: ParsedRow[] = []

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = lines[i]
    if (cells.every(c => c === '')) continue

    const name = nameIdx >= 0 ? (cells[nameIdx] ?? '').trim() : ''
    if (!name) continue

    // Tax
    const taxeRaw = taxeIdx >= 0 ? (cells[taxeIdx] ?? '').trim() : ''
    const taxePaid = taxeRaw !== '' && taxeRaw.toLowerCase() !== 'rembourser'

    // Week
    const anneeSemaine = anneeSemaineIdx >= 0 ? (cells[anneeSemaineIdx] ?? '').trim() : ''
    let weekDate: Date | null = isoWeekToDate(anneeSemaine)

    if (!weekDate) {
      // Fall back to DD/MM or DD.MM + 2026
      const dateRaw = dateIdx >= 0 ? (cells[dateIdx] ?? '').trim() : ''
      const parts = dateRaw.split(/[\/\.]/)
      if (parts.length >= 2) {
        const d = new Date(2026, parseInt(parts[1]) - 1, parseInt(parts[0]), 12)
        weekDate = getWeekStart(d)
      } else {
        weekDate = getWeekStart()
      }
    }

    // Resources
    const resources: Record<string, number> = {}
    let hasResources = false
    for (const r of RESOURCES) {
      const idx = resourceIdx[r]
      if (idx !== undefined && idx < cells.length) {
        const v = parseFrenchNumber(cells[idx])
        resources[r] = v
        if (v > 0) hasResources = true
      } else {
        resources[r] = 0
      }
    }

    // Skip rows with no data at all
    const skip = !hasResources && !taxePaid

    rows.push({
      name,
      weekStart: weekDate.toISOString(),
      weekLabel: anneeSemaine || formatWeekRange(weekDate),
      taxe: taxeRaw,
      resources,
      _skip: skip,
      _note: skip ? 'Vide — ignorée' : undefined,
    })
  }

  return rows
}

interface ImportResult {
  ninjasCreated: number
  ninjasUpdated: number
  donationsCreated: number
  taxesSet: number
}

export default function ImportPage() {
  const [csvText, setCsvText] = useState('')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleParse() {
    setRows(parseCSV(csvText))
    setResult(null)
    setError('')
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setCsvText(text)
      setRows(parseCSV(text))
      setResult(null)
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function handleImport() {
    const validRows = rows.filter(r => !r._skip)
    if (validRows.length === 0) return
    setImporting(true)
    setError('')

    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: validRows }),
    })

    if (res.ok) {
      setResult(await res.json())
      setRows([])
      setCsvText('')
    } else {
      const data = await res.json()
      setError(data.error || "Erreur lors de l'import")
      setImporting(false)
    }
    setImporting(false)
  }

  const validRows = rows.filter(r => !r._skip)
  const skippedRows = rows.filter(r => r._skip)
  const uniqueNinjas = [...new Set(validRows.map(r => r.name))]
  const uniqueWeeks = [...new Set(validRows.map(r => r.weekLabel))]

  return (
    <>
      <Navbar />
      <div className="pt-14 lg:pt-0 lg:ml-64">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Import Google Sheets</h1>
          <p className="text-ink-muted text-sm mt-1">
            Exporte ton sheet en CSV, colle le contenu ci-dessous ou uploade le fichier.
          </p>
        </div>

        {/* Instructions */}
        <div className="card p-4 border-gold/20">
          <p className="text-sm font-medium text-gold mb-2">Comment exporter depuis Google Sheets :</p>
          <ol className="text-sm text-ink-muted space-y-1 list-decimal list-inside">
            <li>Fichier → Télécharger → Valeurs séparées par des virgules (.csv)</li>
            <li>Colle le contenu ci-dessous ou uploade le fichier .csv</li>
            <li>Vérifie l&apos;aperçu et clique sur Importer</li>
          </ol>
          <p className="text-xs text-ink-faint mt-2">
            Format attendu : <span className="font-mono">Nom du récolteur · Nom personne · Date · Taxe · Bois · … · Ryo · Année-Semaine</span>.
            La colonne &quot;Taxe&quot; : toute valeur non vide = payée. &quot;Rembourser&quot; = ignoré. &quot;Année-Semaine&quot; (ex: 2026-S19) est utilisé pour la semaine.
          </p>
          <p className="text-xs text-amber-500 mt-2">
            ⚠ Configure d&apos;abord les valeurs des ressources dans <a href="/settings" className="underline">Paramètres</a> — les points sont calculés au moment de l&apos;import.
          </p>
        </div>

        {/* Input */}
        {!result && (
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                className="btn-ghost flex items-center gap-2 text-sm border border-border rounded-lg px-3 py-2"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Uploader un fichier .csv
              </button>
              <span className="text-ink-faint text-sm">ou colle le CSV ci-dessous</span>
              <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFile} />
            </div>

            <textarea
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder=",Nom du récolteur,Nom personne,Date,Taxe,Bois,...,Ryo,Année-Semaine,Total points ligne,"
              className="input font-mono text-xs resize-none"
              rows={10}
            />

            <div className="flex gap-2">
              <button onClick={handleParse} disabled={!csvText.trim()} className="btn-primary">
                Analyser
              </button>
              {rows.length > 0 && (
                <button onClick={() => { setRows([]); setCsvText('') }} className="btn-ghost">
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="card p-6 border-emerald-900/50 bg-emerald-950/20">
            <div className="flex items-start gap-3">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-emerald-400 mb-3">Import réussi !</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  {[
                    { label: 'Ninjas créés', val: result.ninjasCreated },
                    { label: 'Ninjas mis à jour', val: result.ninjasUpdated },
                    { label: 'Dons enregistrés', val: result.donationsCreated },
                    { label: 'Taxes payées', val: result.taxesSet },
                  ].map(({ label, val }) => (
                    <div key={label} className="bg-bg-elevated rounded-lg p-3">
                      <p className="font-mono text-2xl font-bold text-ink">{val}</p>
                      <p className="text-xs text-ink-muted mt-1">{label}</p>
                    </div>
                  ))}
                </div>
                <button onClick={() => setResult(null)} className="btn-ghost mt-4 text-sm">
                  Faire un autre import
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="card p-4 border-red-900/50 bg-red-950/20 text-red-400 text-sm">{error}</div>
        )}

        {/* Preview */}
        {rows.length > 0 && !result && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">
                  Aperçu — {validRows.length} ligne{validRows.length !== 1 ? 's' : ''} valides
                  {skippedRows.length > 0 && (
                    <span className="text-ink-muted font-normal text-sm ml-2">
                      ({skippedRows.length} ignorées)
                    </span>
                  )}
                </h2>
                <p className="text-ink-muted text-sm">
                  {uniqueNinjas.length} ninja{uniqueNinjas.length !== 1 ? 's' : ''} · {uniqueWeeks.length} semaine{uniqueWeeks.length !== 1 ? 's' : ''} ({uniqueWeeks.slice(0, 3).join(', ')}{uniqueWeeks.length > 3 ? ' …' : ''})
                </p>
              </div>
              <button
                onClick={handleImport}
                disabled={importing || validRows.length === 0}
                className="btn-primary flex items-center gap-2 whitespace-nowrap"
              >
                {importing ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Import en cours...
                  </>
                ) : (
                  `Importer ${validRows.length} ligne${validRows.length !== 1 ? 's' : ''}`
                )}
              </button>
            </div>

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-elevated/50">
                      <th className="text-left px-3 py-2.5 text-ink-muted font-medium whitespace-nowrap">Ninja</th>
                      <th className="text-left px-3 py-2.5 text-ink-muted font-medium whitespace-nowrap">Semaine</th>
                      <th className="text-left px-3 py-2.5 text-ink-muted font-medium">Taxe</th>
                      {RESOURCES.map(r => (
                        <th key={r} className="text-right px-2 py-2.5 text-ink-muted font-medium whitespace-nowrap text-xs">{r}</th>
                      ))}
                      <th className="px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr
                        key={i}
                        className={`border-b border-border-subtle last:border-0 ${row._skip ? 'opacity-30' : ''}`}
                      >
                        <td className="px-3 py-2 font-medium text-ink whitespace-nowrap">{row.name}</td>
                        <td className="px-3 py-2 font-mono text-xs text-ink-muted whitespace-nowrap">{row.weekLabel}</td>
                        <td className="px-3 py-2">
                          {row.taxe && row.taxe.toLowerCase() !== 'rembourser' ? (
                            <span className="badge-paid">✓ Payée</span>
                          ) : row.taxe === '' ? (
                            <span className="text-ink-faint text-xs">—</span>
                          ) : (
                            <span className="text-xs text-amber-500 italic">{row.taxe}</span>
                          )}
                        </td>
                        {RESOURCES.map(r => (
                          <td key={r} className={`px-2 py-2 text-right font-mono text-xs ${row.resources[r] ? 'text-ink' : 'text-ink-faint'}`}>
                            {row.resources[r] ? row.resources[r].toLocaleString('fr-FR') : '—'}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-xs text-ink-faint italic whitespace-nowrap">
                          {row._note ?? ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>
    </>
  )
}
