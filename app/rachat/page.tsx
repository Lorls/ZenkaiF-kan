'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import { can } from '@/lib/permissions'

type Situation = 'Non Besoin' | 'Besoin' | 'Besoin primaire'
type Categorie = 'T1' | 'T2' | 'T3' | 'T4'

const SITUATIONS: Situation[] = ['Non Besoin', 'Besoin', 'Besoin primaire']
const CATEGORIES: Categorie[] = ['T1', 'T2', 'T3', 'T4']

const SITUATION_STYLES: Record<Situation, string> = {
  'Non Besoin':     'text-ink-muted bg-bg-elevated border-border',
  'Besoin':         'text-amber-400 bg-amber-950/30 border-amber-900/40',
  'Besoin primaire':'text-red-400 bg-red-950/30 border-red-900/40',
}

interface Equipement {
  id: number
  nom: string
  categorie: Categorie
  prixPlan: number | null
  prixCraft: number | null
  situation: Situation
}

interface Ressource {
  id: number
  nom: string
  prixRachatMax: number | null
  situation: Situation
}

function fmtPrix(v: number | null) {
  if (v == null) return <span className="text-ink-faint">—</span>
  return <span>{v.toLocaleString('fr-FR')}</span>
}

function SituationBadge({ value }: { value: Situation }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${SITUATION_STYLES[value]}`}>
      {value}
    </span>
  )
}

function SituationSelect({ value, onChange, className = '' }: { value: Situation; onChange: (v: Situation) => void; className?: string }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as Situation)}
      className={`text-xs px-2 py-1 rounded border bg-transparent cursor-pointer focus:outline-none focus:ring-1 focus:ring-gold/40 ${SITUATION_STYLES[value]} ${className}`}
    >
      {SITUATIONS.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  )
}

// ─── Equipements ─────────────────────────────────────────────────────────────

function EquipementsSection({ isAdmin }: { isAdmin: boolean }) {
  const [items, setItems] = useState<Equipement[]>([])
  const [activeTab, setActiveTab] = useState<Categorie>('T1')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editState, setEditState] = useState({ nom: '', prixPlan: '', prixCraft: '', situation: 'Non Besoin' as Situation })
  const [adding, setAdding] = useState(false)
  const [newItem, setNewItem] = useState({ nom: '', prixPlan: '', prixCraft: '', situation: 'Non Besoin' as Situation })
  const [saving, setSaving] = useState(false)

  async function load() {
    const data = await fetch('/api/rachat/equipements').then(r => r.json())
    setItems(Array.isArray(data) ? data : [])
  }

  useEffect(() => { load() }, [])

  function startEdit(item: Equipement) {
    setEditingId(item.id)
    setEditState({
      nom: item.nom,
      prixPlan: item.prixPlan != null ? String(item.prixPlan) : '',
      prixCraft: item.prixCraft != null ? String(item.prixCraft) : '',
      situation: item.situation,
    })
  }

  async function saveEdit(id: number) {
    setSaving(true)
    await fetch(`/api/rachat/equipements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editState, prixPlan: editState.prixPlan || null, prixCraft: editState.prixCraft || null }),
    })
    await load()
    setEditingId(null)
    setSaving(false)
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer cette ligne ?')) return
    await fetch(`/api/rachat/equipements/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function handleAdd() {
    if (!newItem.nom.trim()) return
    setSaving(true)
    await fetch('/api/rachat/equipements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newItem, categorie: activeTab, prixPlan: newItem.prixPlan || null, prixCraft: newItem.prixCraft || null }),
    })
    await load()
    setNewItem({ nom: '', prixPlan: '', prixCraft: '', situation: 'Non Besoin' })
    setAdding(false)
    setSaving(false)
  }

  const filtered = items.filter(i => i.categorie === activeTab)

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Équipements</h2>
        {isAdmin && (
          <button onClick={() => { setAdding(true); setEditingId(null) }} className="btn-primary text-xs px-3 py-1.5">
            + Ajouter
          </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-border bg-bg-elevated/40">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => { setActiveTab(cat); setAdding(false); setEditingId(null) }}
            className={`px-5 py-2.5 text-sm font-medium transition-colors duration-150 border-b-2 -mb-px ${
              activeTab === cat
                ? 'border-gold text-gold'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-elevated/20">
            <th className="text-left px-4 py-2.5 text-ink-muted font-medium">Nom</th>
            <th className="text-right px-4 py-2.5 text-ink-muted font-medium">Prix Plan</th>
            <th className="text-right px-4 py-2.5 text-ink-muted font-medium">Prix Craft</th>
            <th className="text-center px-4 py-2.5 text-ink-muted font-medium">Situation</th>
            {isAdmin && <th className="px-4 py-2.5 w-20" />}
          </tr>
        </thead>
        <tbody>
          {filtered.map(item => (
            <tr key={item.id} className="border-b border-border-subtle last:border-0 hover:bg-bg-elevated/30 transition-colors">
              {editingId === item.id ? (
                <>
                  <td className="px-4 py-2">
                    <input
                      value={editState.nom}
                      onChange={e => setEditState(s => ({ ...s, nom: e.target.value }))}
                      className="input text-sm py-1 w-full"
                      autoFocus
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={editState.prixPlan}
                      onChange={e => setEditState(s => ({ ...s, prixPlan: e.target.value }))}
                      className="input text-sm py-1 w-full text-right"
                      placeholder="—"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={editState.prixCraft}
                      onChange={e => setEditState(s => ({ ...s, prixCraft: e.target.value }))}
                      className="input text-sm py-1 w-full text-right"
                      placeholder="—"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <SituationSelect value={editState.situation} onChange={v => setEditState(s => ({ ...s, situation: v }))} />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => saveEdit(item.id)} disabled={saving} className="btn-primary text-xs px-2 py-1">✓</button>
                      <button onClick={() => setEditingId(null)} className="btn-ghost text-xs px-2 py-1">✕</button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-3 font-medium text-ink">{item.nom}</td>
                  <td className="px-4 py-3 text-right font-mono text-ink-muted">{fmtPrix(item.prixPlan)}</td>
                  <td className="px-4 py-3 text-right font-mono text-ink-muted">{fmtPrix(item.prixCraft)}</td>
                  <td className="px-4 py-3 text-center"><SituationBadge value={item.situation} /></td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => startEdit(item)} className="btn-ghost text-xs px-2 py-1">Éditer</button>
                        <button onClick={() => handleDelete(item.id)} className="btn-danger text-xs px-2 py-1">✕</button>
                      </div>
                    </td>
                  )}
                </>
              )}
            </tr>
          ))}

          {/* Add row */}
          {isAdmin && adding && (
            <tr className="border-b border-border-subtle bg-bg-elevated/20">
              <td className="px-4 py-2">
                <input
                  value={newItem.nom}
                  onChange={e => setNewItem(s => ({ ...s, nom: e.target.value }))}
                  className="input text-sm py-1 w-full"
                  placeholder="Nom de l'équipement"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
              </td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  value={newItem.prixPlan}
                  onChange={e => setNewItem(s => ({ ...s, prixPlan: e.target.value }))}
                  className="input text-sm py-1 w-full text-right"
                  placeholder="—"
                />
              </td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  value={newItem.prixCraft}
                  onChange={e => setNewItem(s => ({ ...s, prixCraft: e.target.value }))}
                  className="input text-sm py-1 w-full text-right"
                  placeholder="—"
                />
              </td>
              <td className="px-4 py-2 text-center">
                <SituationSelect value={newItem.situation} onChange={v => setNewItem(s => ({ ...s, situation: v }))} />
              </td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-1 justify-end">
                  <button onClick={handleAdd} disabled={saving || !newItem.nom.trim()} className="btn-primary text-xs px-2 py-1">✓</button>
                  <button onClick={() => setAdding(false)} className="btn-ghost text-xs px-2 py-1">✕</button>
                </div>
              </td>
            </tr>
          )}

          {filtered.length === 0 && !adding && (
            <tr>
              <td colSpan={isAdmin ? 5 : 4} className="px-4 py-8 text-center text-ink-faint text-sm">
                Aucun équipement {activeTab} enregistré
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Ressources ───────────────────────────────────────────────────────────────

function RessourcesSection({ isAdmin }: { isAdmin: boolean }) {
  const [items, setItems] = useState<Ressource[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editState, setEditState] = useState({ nom: '', prixRachatMax: '', situation: 'Non Besoin' as Situation })
  const [adding, setAdding] = useState(false)
  const [newItem, setNewItem] = useState({ nom: '', prixRachatMax: '', situation: 'Non Besoin' as Situation })
  const [saving, setSaving] = useState(false)

  async function load() {
    const data = await fetch('/api/rachat/ressources').then(r => r.json())
    setItems(Array.isArray(data) ? data : [])
  }

  useEffect(() => { load() }, [])

  function startEdit(item: Ressource) {
    setEditingId(item.id)
    setEditState({
      nom: item.nom,
      prixRachatMax: item.prixRachatMax != null ? String(item.prixRachatMax) : '',
      situation: item.situation,
    })
  }

  async function saveEdit(id: number) {
    setSaving(true)
    await fetch(`/api/rachat/ressources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editState, prixRachatMax: editState.prixRachatMax || null }),
    })
    await load()
    setEditingId(null)
    setSaving(false)
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer cette ligne ?')) return
    await fetch(`/api/rachat/ressources/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function handleAdd() {
    if (!newItem.nom.trim()) return
    setSaving(true)
    await fetch('/api/rachat/ressources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newItem, prixRachatMax: newItem.prixRachatMax || null }),
    })
    await load()
    setNewItem({ nom: '', prixRachatMax: '', situation: 'Non Besoin' })
    setAdding(false)
    setSaving(false)
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Ressources</h2>
        {isAdmin && (
          <button onClick={() => { setAdding(true); setEditingId(null) }} className="btn-primary text-xs px-3 py-1.5">
            + Ajouter
          </button>
        )}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-elevated/20">
            <th className="text-left px-4 py-2.5 text-ink-muted font-medium">Nom</th>
            <th className="text-right px-4 py-2.5 text-ink-muted font-medium">Prix Rachat Max</th>
            <th className="text-center px-4 py-2.5 text-ink-muted font-medium">Situation</th>
            {isAdmin && <th className="px-4 py-2.5 w-20" />}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} className="border-b border-border-subtle last:border-0 hover:bg-bg-elevated/30 transition-colors">
              {editingId === item.id ? (
                <>
                  <td className="px-4 py-2">
                    <input
                      value={editState.nom}
                      onChange={e => setEditState(s => ({ ...s, nom: e.target.value }))}
                      className="input text-sm py-1 w-full"
                      autoFocus
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={editState.prixRachatMax}
                      onChange={e => setEditState(s => ({ ...s, prixRachatMax: e.target.value }))}
                      className="input text-sm py-1 w-full text-right"
                      placeholder="—"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <SituationSelect value={editState.situation} onChange={v => setEditState(s => ({ ...s, situation: v }))} />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => saveEdit(item.id)} disabled={saving} className="btn-primary text-xs px-2 py-1">✓</button>
                      <button onClick={() => setEditingId(null)} className="btn-ghost text-xs px-2 py-1">✕</button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-3 font-medium text-ink">{item.nom}</td>
                  <td className="px-4 py-3 text-right font-mono text-ink-muted">{fmtPrix(item.prixRachatMax)}</td>
                  <td className="px-4 py-3 text-center"><SituationBadge value={item.situation} /></td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => startEdit(item)} className="btn-ghost text-xs px-2 py-1">Éditer</button>
                        <button onClick={() => handleDelete(item.id)} className="btn-danger text-xs px-2 py-1">✕</button>
                      </div>
                    </td>
                  )}
                </>
              )}
            </tr>
          ))}

          {/* Add row */}
          {isAdmin && adding && (
            <tr className="border-b border-border-subtle bg-bg-elevated/20">
              <td className="px-4 py-2">
                <input
                  value={newItem.nom}
                  onChange={e => setNewItem(s => ({ ...s, nom: e.target.value }))}
                  className="input text-sm py-1 w-full"
                  placeholder="Nom de la ressource"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
              </td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  value={newItem.prixRachatMax}
                  onChange={e => setNewItem(s => ({ ...s, prixRachatMax: e.target.value }))}
                  className="input text-sm py-1 w-full text-right"
                  placeholder="—"
                />
              </td>
              <td className="px-4 py-2 text-center">
                <SituationSelect value={newItem.situation} onChange={v => setNewItem(s => ({ ...s, situation: v }))} />
              </td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-1 justify-end">
                  <button onClick={handleAdd} disabled={saving || !newItem.nom.trim()} className="btn-primary text-xs px-2 py-1">✓</button>
                  <button onClick={() => setAdding(false)} className="btn-ghost text-xs px-2 py-1">✕</button>
                </div>
              </td>
            </tr>
          )}

          {items.length === 0 && !adding && (
            <tr>
              <td colSpan={isAdmin ? 4 : 3} className="px-4 py-8 text-center text-ink-faint text-sm">
                Aucune ressource enregistrée
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RachatPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [section, setSection] = useState<'equipements' | 'ressources'>('equipements')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.role && can(d.role, 'rachat:write')) setIsAdmin(true)
    })
  }, [])

  return (
    <>
      <Navbar />
      <div className="ml-64">
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-ink">Rachat</h1>
            <p className="text-ink-muted text-sm mt-1">Prix de rachat et situations des équipements et ressources.</p>
          </div>

          {/* Section tabs */}
          <div className="flex gap-1 p-1 rounded-lg bg-bg-elevated border border-border w-fit">
            {(['equipements', 'ressources'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 ${
                  section === s
                    ? 'bg-bg-card text-gold shadow-sm border border-border'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {s === 'equipements' ? 'Équipements' : 'Ressources'}
              </button>
            ))}
          </div>

          {section === 'equipements'
            ? <EquipementsSection isAdmin={isAdmin} />
            : <RessourcesSection isAdmin={isAdmin} />
          }
        </main>
      </div>
    </>
  )
}
