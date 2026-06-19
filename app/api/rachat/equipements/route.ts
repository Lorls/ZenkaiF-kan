import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'

const SITUATIONS = ['Non Besoin', 'Besoin', 'Besoin primaire'] as const
const CATEGORIES = ['T1', 'T2', 'T3', 'T4'] as const

export async function GET() {
  const user = await guard('member')
  if (!user) return unauthorized()
  const items = await db.rachatEquipement.findMany({ orderBy: [{ categorie: 'asc' }, { nom: 'asc' }] })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const user = await guard(true)
  if (!user) return unauthorized(true)
  const { nom, categorie, prixPlan, prixCraft, situation } = await req.json()
  if (!nom?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
  if (!CATEGORIES.includes(categorie)) return NextResponse.json({ error: 'Catégorie invalide' }, { status: 400 })
  if (!SITUATIONS.includes(situation)) return NextResponse.json({ error: 'Situation invalide' }, { status: 400 })
  const item = await db.rachatEquipement.create({
    data: {
      nom: nom.trim(),
      categorie,
      prixPlan: prixPlan !== '' && prixPlan != null ? Number(prixPlan) : null,
      prixCraft: prixCraft !== '' && prixCraft != null ? Number(prixCraft) : null,
      situation,
    },
  })
  return NextResponse.json(item, { status: 201 })
}
