import { getSession } from './auth'
import { ensureAdminExists } from './seed'
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

// guard()         → any authenticated user (VISITEUR, MEMBRE, ADMIN) — for reads
// guard('write')  → MEMBRE or ADMIN — for mutations accessible aux membres
// guard(true)     → ADMIN only
export async function guard(level: true | 'write' | false = false): Promise<AuthUser | null> {
  await init()
  const s = await getSession()
  if (!s.authenticated || !s.userId) return null
  const role = s.role ?? 'MEMBRE'
  if (level === true  && role !== 'ADMIN')    return null
  if (level === 'write' && role === 'VISITEUR') return null
  return { userId: s.userId, username: s.username!, role }
}

export function unauthorized(admin = false) {
  return NextResponse.json(
    { error: admin ? 'Réservé aux administrateurs' : 'Non autorisé' },
    { status: 401 }
  )
}
