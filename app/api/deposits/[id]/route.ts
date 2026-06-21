import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { can } from '@/lib/permissions'

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await guard('gestion:manage')
  if (!user) return unauthorized()
  const { id } = await context.params
  const { status } = await req.json()
  if (!['APPROUVE', 'REJETE'].includes(status)) {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
  }
  const deposit = await db.deposit.update({
    where: { id: Number(id) },
    data: { status, reviewedById: user.userId, reviewedAt: new Date() },
  })
  return NextResponse.json(deposit)
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await guard()
  if (!user) return unauthorized()
  const { id } = await context.params
  const deposit = await db.deposit.findUnique({ where: { id: Number(id) } })
  if (!deposit) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  const isOwner = deposit.userId === user.userId && deposit.status === 'EN_ATTENTE'
  const isGestion = can(user.role, 'gestion:manage')
  if (!isOwner && !isGestion) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  await db.deposit.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
