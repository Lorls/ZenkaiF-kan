import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import bcrypt from 'bcryptjs'

function generatePassword(len = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await guard(true)
  if (!user) return unauthorized(true)
  const { id } = await context.params
  const { role } = await req.json()
  if (!['ADMIN', 'MEMBRE', 'VISITEUR'].includes(role)) {
    return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
  }
  const target = await db.user.findUnique({ where: { id: Number(id) } })
  if (!target) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  // Prevent removing the last admin
  if (target.role === 'ADMIN' && role !== 'ADMIN') {
    const adminCount = await db.user.count({ where: { role: 'ADMIN' } })
    if (adminCount <= 1) return NextResponse.json({ error: 'Impossible de retirer le dernier administrateur' }, { status: 403 })
  }
  await db.user.update({ where: { id: Number(id) }, data: { role } })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await guard(true)
  if (!user) return unauthorized(true)
  const { id } = await context.params
  const target = await db.user.findUnique({ where: { id: Number(id) } })
  if (!target) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  if (Number(id) === user.userId) return NextResponse.json({ error: 'Impossible de supprimer son propre compte' }, { status: 403 })
  if (target.role === 'ADMIN') {
    const adminCount = await db.user.count({ where: { role: 'ADMIN' } })
    if (adminCount <= 1) return NextResponse.json({ error: 'Impossible de supprimer le dernier administrateur' }, { status: 403 })
  }
  await db.user.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}

export async function POST(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  // Reset password
  const user = await guard(true)
  if (!user) return unauthorized(true)
  const { id } = await context.params
  const password = generatePassword()
  await db.user.update({
    where: { id: Number(id) },
    data: { passwordHash: await bcrypt.hash(password, 10), sessionVersion: { increment: 1 } },
  })
  return NextResponse.json({ password })
}
