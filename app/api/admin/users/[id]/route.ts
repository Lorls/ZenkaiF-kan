import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import bcrypt from 'bcryptjs'

function generatePassword(len = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await guard(true)
  if (!user) return unauthorized(true)
  const { id } = await context.params
  const target = await db.user.findUnique({ where: { id: Number(id) } })
  if (!target) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  if (target.isAdmin) return NextResponse.json({ error: 'Impossible de supprimer un admin' }, { status: 403 })
  await db.user.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}

export async function POST(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  // Reset password
  const user = await guard(true)
  if (!user) return unauthorized(true)
  const { id } = await context.params
  const password = generatePassword()
  await db.user.update({ where: { id: Number(id) }, data: { passwordHash: await bcrypt.hash(password, 10) } })
  return NextResponse.json({ password })
}
