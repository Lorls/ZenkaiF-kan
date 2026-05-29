import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import bcrypt from 'bcryptjs'

function generatePassword(len = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function GET() {
  const user = await guard(true)
  if (!user) return unauthorized(true)
  const users = await db.user.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, username: true, isAdmin: true, createdAt: true } })
  // Attach action count
  const counts = await db.log.groupBy({ by: ['username'], _count: { id: true } })
  const countMap = Object.fromEntries(counts.map(c => [c.username, c._count.id]))
  return NextResponse.json(users.map(u => ({ ...u, actionCount: countMap[u.username] ?? 0 })))
}

export async function POST(req: NextRequest) {
  const user = await guard(true)
  if (!user) return unauthorized(true)

  const { username } = await req.json()
  if (!username?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

  const existing = await db.user.findUnique({ where: { username: username.trim() } })
  if (existing) return NextResponse.json({ error: 'Ce nom existe déjà' }, { status: 409 })

  const password = generatePassword()
  const newUser = await db.user.create({
    data: { username: username.trim(), passwordHash: await bcrypt.hash(password, 10), isAdmin: false },
    select: { id: true, username: true, isAdmin: true, createdAt: true },
  })
  return NextResponse.json({ ...newUser, password }, { status: 201 })
}
