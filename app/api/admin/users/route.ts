import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { ROLES } from '@/lib/permissions'
import bcrypt from 'bcryptjs'

function randomPassword(len = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

async function generateUniquePassword(): Promise<{ plain: string; hash: string }> {
  const existing = await db.user.findMany({ select: { passwordHash: true } })
  for (;;) {
    const plain = randomPassword()
    const collides = (await Promise.all(existing.map(u => bcrypt.compare(plain, u.passwordHash)))).some(Boolean)
    if (!collides) {
      return { plain, hash: await bcrypt.hash(plain, 10) }
    }
  }
}

export async function GET() {
  const user = await guard('admin:manage')
  if (!user) return unauthorized()
  const users = await db.user.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, username: true, role: true, createdAt: true } })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const user = await guard('admin:manage')
  if (!user) return unauthorized()

  const { username, role = 'MEMBRE' } = await req.json()
  if (!username?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
  if (!(ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
  }

  const existing = await db.user.findUnique({ where: { username: username.trim() } })
  if (existing) return NextResponse.json({ error: 'Ce nom existe déjà' }, { status: 409 })

  const { plain, hash } = await generateUniquePassword()
  const newUser = await db.user.create({
    data: { username: username.trim(), passwordHash: hash, role },
    select: { id: true, username: true, role: true, createdAt: true },
  })
  return NextResponse.json({ ...newUser, password: plain }, { status: 201 })
}
