import { getSession } from './auth'
import { ensureAdminExists } from './seed'
import { db } from './db'
import { can, Permission } from './permissions'
import { NextResponse } from 'next/server'

let initialized = false

async function init() {
  if (initialized) return
  initialized = true
  try {
    await ensureAdminExists()
  } catch {
    // Don't block requests if seed fails
  }
}

export interface AuthUser {
  userId: number
  username: string
  role: string
}

export async function guard(permission: Permission | null = null): Promise<AuthUser | null> {
  await init()

  try {
    const s = await getSession()
    if (!s.authenticated || !s.userId) return null

    // Try to query with sessionVersion; fall back without it if column doesn't exist yet
    let role: string
    let versionOk = true

    try {
      const dbUser = await db.user.findUnique({
        where: { id: s.userId },
        select: { role: true, sessionVersion: true },
      })
      if (!dbUser) return null
      role = dbUser.role
      versionOk = dbUser.sessionVersion === (s.sessionVersion ?? 0)
    } catch {
      // sessionVersion column not yet applied — fall back to role-only query
      const dbUser = await db.user.findUnique({
        where: { id: s.userId },
        select: { role: true },
      })
      if (!dbUser) return null
      role = dbUser.role
    }

    if (!versionOk) return null
    if (permission !== null && !can(role, permission)) return null
    return { userId: s.userId, username: s.username!, role }
  } catch {
    return null
  }
}

export function unauthorized() {
  return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
}
