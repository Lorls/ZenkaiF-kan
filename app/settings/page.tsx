'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { RESOURCES } from '@/lib/resources'
import { GRADES } from '@/lib/grades'

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [exonerations, setExonerations] = useState<Record<string, string>>({})
  const [grades, setGrades] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/exoneration').then(r => r.json()),
      fetch('/api/grades').then(r => r.json()),
    ]).then(([res, exo, grd]) => {
      setValues(Object.fromEntries(Object.entries(res).map(([k, v]) => [k, String(v)])))
      setExonerations(Object.fromEntries(Object.entries(exo).map(([k, v]) => [k, String(v)])))
      setGrades(Object.fromEntries(Object.entries(grd).map(([k, v]) => [k, String(v)])))
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    await Promise.all([
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(Object.entries(values).map(([k, v]) => [k, parseFloat(v) || 0]))),
      }),
      fetch('/api/exoneration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(Object.entries(exonerations).map(([k, v]) => [k, parseFloat(v) || 0]))),
      }),
      fetch('/api/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(Object.entries(grades).map(([k, v]) => [k, parseFloat(v) || 0]))),
      }),
    ])
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const SaveButton = () => (
    <div className="mt-6 pt-4 border-t border-border flex items-center gap-3">
      <button onClick={handleSave} disabled={saving || loading} className="btn-primary flex items-center gap-2">
        {saving ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Enregistrement...
          </>
        ) : 'Enregistrer'}
      </button>
      {saved && (
        <span className="text-emerald-400 text-sm flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Enregistré
        </span>
      )}
    </div>
  )

  return (
    <>
      <Navbar />
      <div className="pt-14 lg:pt-0 lg:ml-64">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Paramètres</h1>
          <p className="text-ink-muted text-sm mt-1">Ressources et seuils de grades.</p>
        </div>

        {/* Grades */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-ink mb-1">Seuils de grade</h2>
          <p className="text-xs text-ink-muted mb-6">
            Nombre de points minimum requis pour passer chaque examen de grade.
          </p>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-bg-elevated rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {GRADES.map(g => (
                <div key={g.key} className="flex items-center gap-4">
                  <label className="w-36 text-sm text-ink font-medium flex-shrink-0">
                    {g.key}
                  </label>
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="number"
                      value={grades[g.key] ?? String(g.default)}
                      onChange={e => setGrades(prev => ({ ...prev, [g.key]: e.target.value }))}
                      className="input font-mono"
                      min="0"
                      step="1"
                    />
                    <span className="text-sm text-ink-muted whitespace-nowrap flex-shrink-0">points</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <SaveButton />
        </div>

        {/* Resources */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-ink mb-1">Valeur des ressources</h2>
          <p className="text-xs text-ink-muted mb-6">
            Modifier ces valeurs n&apos;affecte pas les points déjà attribués.
          </p>
          {loading ? (
            <div className="space-y-3">
              {[...Array(13)].map((_, i) => <div key={i} className="h-12 bg-bg-elevated rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <>
              {/* En-têtes colonnes */}
              <div className="flex items-center gap-4 mb-2 pl-0">
                <span className="w-36 flex-shrink-0" />
                <span className="flex-1 text-xs text-ink-muted font-medium text-center">Points / unité</span>
                <span className="flex-1 text-xs text-gold/80 font-medium text-center">Exonération / unité</span>
              </div>
              <div className="space-y-2">
                {RESOURCES.map(resource => (
                  <div key={resource} className="flex items-center gap-4">
                    <label className="w-36 text-sm text-ink font-medium flex-shrink-0">{resource}</label>
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="number"
                        value={values[resource] ?? '1'}
                        onChange={e => setValues(prev => ({ ...prev, [resource]: e.target.value }))}
                        className="input font-mono"
                        min="0"
                        step="any"
                      />
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="number"
                        value={exonerations[resource] ?? '0'}
                        onChange={e => setExonerations(prev => ({ ...prev, [resource]: e.target.value }))}
                        className="input font-mono border-gold/20 focus:border-gold/50"
                        min="0"
                        step="any"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          <SaveButton />
        </div>

        <div className="card p-4 border-gold/20">
          <div className="flex gap-3">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <p className="text-sm text-ink-muted leading-relaxed">
              Les points des dons passés sont figés au taux en vigueur au moment du don.
              Seuls les nouveaux dons enregistrés après cette modification utiliseront les nouvelles valeurs.
            </p>
          </div>
        </div>
      </main>
      </div>
    </>
  )
}
