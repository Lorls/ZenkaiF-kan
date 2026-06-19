import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'

const SITUATIONS = ['Non Besoin', 'Besoin', 'Besoin primaire'] as const
const CATEGORIES = ['T1', 'T2', 'T3', 'T4'] as const

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await guard(true)
  if (!user) return unauthorized(true)
  const { id } = await context.params
  const { nom, categorie, prixPlan, prixCraft, situation } = await req.json()
  if (nom !== undefined && !nom?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
  if (categorie !== undefined && !CATEGORIES.includes(categorie)) return NextResponse.json({ error: 'Catégorie invalide' }, { status: 400 })
  if (situation !== undefined && !SITUATIONS.includes(situation)) return NextResponse.json({ error: 'Situation invalide' }, { status: 400 })
  const item = await db.rachatEquipement.update({
    where: { id: Number(id) },
    data: {
      ...(nom !== undefined && { nom: nom.trim() }),
      ...(categorie !== undefined && { categorie }),
      ...(prixPlan !== undefined && { prixPlan: prixPlan !== '' && prixPlan != null ? Number(prixPlan) : null }),
      ...(prixCraft !== undefined && { prixCraft: prixCraft !== '' && prixCraft != null ? Number(prixCraft) : null }),
      ...(situation !== undefined && { situation }),
    },
  })
  return NextResponse.json(item)
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await guard(true)
  if (!user) return unauthorized(true)
  const { id } = await context.params
  await db.rachatEquipement.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
