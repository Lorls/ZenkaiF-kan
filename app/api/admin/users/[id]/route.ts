import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { ROLES } from '@/lib/permissions'
import bcrypt from 'bcryptjs'

function randomPassword(len = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// Generate a password that doesn't collide with any existing user's password.
// Collision probability with random generation is negligible, but this guards
// against edge cases (e.g. SITE_PASSWORD reused as a personal password).
async function generateUniquePassword(excludeUserId: number): Promise<{ plain: string; hash: string }> {
  const others = await db.user.findMany({
    where: { id: { not: excludeUserId } },
    select: { passwordHash: true },
  })
  for (;;) {
    const plain = randomPassword()
    const collides = (await Promise.all(others.map(u => bcrypt.compare(plain, u.passwordHash)))).some(Boolean)
    if (!collides) {
      return { plain, hash: await bcrypt.hash(plain, 10) }
    }
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await guard('admin:manage')
  if (!user) return unauthorized()
  const { id } = await context.params
  const { role } = await req.json()
  if (!(ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
  }
  const target = await db.user.findUnique({ where: { id: Number(id) } })
  if (!target) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  if (target.role === 'GERANT' && role !== 'GERANT') {
    const gerantCount = await db.user.count({ where: { role: 'GERANT' } })
    if (gerantCount <= 1) return NextResponse.json({ error: 'Impossible de retirer le dernier Gérant' }, { status: 403 })
  }
  await db.user.update({ where: { id: Number(id) }, data: { role } })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await guard('admin:manage')
  if (!user) return unauthorized()
  const { id } = await context.params
  const target = await db.user.findUnique({ where: { id: Number(id) } })
  if (!target) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  if (Number(id) === user.userId) return NextResponse.json({ error: 'Impossible de supprimer son propre compte' }, { status: 403 })
  if (target.role === 'GERANT') {
    const gerantCount = await db.user.count({ where: { role: 'GERANT' } })
    if (gerantCount <= 1) return NextResponse.json({ error: 'Impossible de supprimer le dernier Gérant' }, { status: 403 })
  }
  await db.user.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}

export async function POST(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  // Reset password — generates a password guaranteed not to match any other account
  const user = await guard('admin:manage')
  if (!user) return unauthorized()
  const { id } = await context.params
  const { plain, hash } = await generateUniquePassword(Number(id))
  await db.user.update({
    where: { id: Number(id) },
    data: { passwordHash: hash, sessionVersion: { increment: 1 } },
  })
  return NextResponse.json({ password: plain })
}
