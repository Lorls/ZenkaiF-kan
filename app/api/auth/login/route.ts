import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { ensureAdminExists } from '@/lib/seed'
import bcrypt from 'bcryptjs'

const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10
const WINDOW_MS = 60_000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? req.headers.get('x-real-ip') ?? '127.0.0.1'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans une minute.' }, { status: 429 })
  }

  await ensureAdminExists()
  const { password } = await req.json()

  if (!password) return NextResponse.json({ error: 'Mot de passe manquant' }, { status: 400 })

  // Scan in stable order (id ASC) so the same password always resolves to the same account
  const users = await db.user.findMany({ orderBy: { id: 'asc' } })
  let matched = null
  for (const user of users) {
    if (await bcrypt.compare(password, user.passwordHash)) { matched = user; break }
  }

  if (!matched) return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })

  const session = await getSession()
  session.authenticated  = true
  session.userId         = matched.id
  session.username       = matched.username
  session.role           = matched.role
  session.sessionVersion = matched.sessionVersion
  await session.save()

  return NextResponse.json({ ok: true, role: matched.role })
}
