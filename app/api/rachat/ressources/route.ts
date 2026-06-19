import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'

const SITUATIONS = ['Non Besoin', 'Besoin', 'Besoin primaire'] as const

export async function GET() {
  const user = await guard('member')
  if (!user) return unauthorized()
  const items = await db.rachatRessource.findMany({ orderBy: { nom: 'asc' } })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const user = await guard(true)
  if (!user) return unauthorized(true)
  const { nom, prixRachatMax, situation } = await req.json()
  if (!nom?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
  if (!SITUATIONS.includes(situation)) return NextResponse.json({ error: 'Situation invalide' }, { status: 400 })
  const item = await db.rachatRessource.create({
    data: {
      nom: nom.trim(),
      prixRachatMax: prixRachatMax !== '' && prixRachatMax != null ? Number(prixRachatMax) : null,
      situation,
    },
  })
  return NextResponse.json(item, { status: 201 })
}
