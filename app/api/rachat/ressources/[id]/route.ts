import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'

const SITUATIONS = ['Non Besoin', 'Besoin', 'Besoin primaire'] as const

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await guard('rachat:write')
  if (!user) return unauthorized()
  const { id } = await context.params
  const { nom, prixRachatMax, situation } = await req.json()
  if (nom !== undefined && !nom?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
  if (situation !== undefined && !SITUATIONS.includes(situation)) return NextResponse.json({ error: 'Situation invalide' }, { status: 400 })
  const item = await db.rachatRessource.update({
    where: { id: Number(id) },
    data: {
      ...(nom !== undefined && { nom: nom.trim() }),
      ...(prixRachatMax !== undefined && { prixRachatMax: prixRachatMax !== '' && prixRachatMax != null ? Number(prixRachatMax) : null }),
      ...(situation !== undefined && { situation }),
    },
  })
  return NextResponse.json(item)
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await guard('rachat:write')
  if (!user) return unauthorized()
  const { id } = await context.params
  await db.rachatRessource.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
