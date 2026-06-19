import { getSession } from './auth'
import { ensureAdminExists } from './seed'
import { db } from './db'
import { NextResponse } from 'next/server'

let initialized = false

async function init() {
  if (initialized) return
  initialized = true
  await ensureAdminExists()
}

export interface AuthUser {
  userId: number
  username: string
  role: string
}

// guard()          → any authenticated user (VISITEUR, MEMBRE, ADMIN) — for reads
// guard('member')  → MEMBRE or ADMIN — for pages/reads inaccessibles aux visiteurs
// guard('write')   → MEMBRE or ADMIN — for mutations
// guard(true)      → ADMIN only
export async function guard(level: true | 'write' | 'member' | false = false): Promise<AuthUser | null> {
  await init()
  const s = await getSession()
  if (!s.authenticated || !s.userId) return null

  const dbUser = await db.user.findUnique({ where: { id: s.userId }, select: { role: true, sessionVersion: true } })
  if (!dbUser) return null
  if (dbUser.sessionVersion !== (s.sessionVersion ?? 0)) return null

  const role = dbUser.role
  if (level === true && role !== 'ADMIN') return null
  if ((level === 'write' || level === 'member') && role === 'VISITEUR') return null
  return { userId: s.userId, username: s.username!, role }
}

export function unauthorized(admin = false) {
  return NextResponse.json(
    { error: admin ? 'Réservé aux administrateurs' : 'Non autorisé' },
    { status: 401 }
  )
}
