import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await guard('admin:manage')
  if (!user) return unauthorized()

  const { id } = await context.params
  const body = await req.json()
  const { status, reviewNote } = body

  if (!['APPROUVE', 'REJETE', 'EN_ATTENTE'].includes(status)) {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
  }

  const rapport = await db.rapport.findUnique({ where: { id: Number(id) } })
  if (!rapport) return NextResponse.json({ error: 'Rapport introuvable' }, { status: 404 })

  const isReset = status === 'EN_ATTENTE'

  const updated = await db.rapport.update({
    where: { id: Number(id) },
    data: isReset
      ? { status, reviewNote: null, reviewedById: null, reviewedAt: null }
      : { status, reviewNote: reviewNote?.trim() || null, reviewedById: user.userId, reviewedAt: new Date() },
    include: { user: { select: { id: true, username: true } } },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await guard('admin:manage')
  if (!user) return unauthorized()

  const { id } = await context.params
  const rapport = await db.rapport.findUnique({ where: { id: Number(id) } })
  if (!rapport) return NextResponse.json({ error: 'Rapport introuvable' }, { status: 404 })

  // Seul l'auteur ou un admin peut supprimer, et seulement si EN_ATTENTE
  if (rapport.status !== 'EN_ATTENTE') {
    return NextResponse.json({ error: 'Impossible de supprimer un rapport déjà traité' }, { status: 400 })
  }

  await db.rapport.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
