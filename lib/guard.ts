import { getSession } from './auth'
import { ensureAdminExists } from './seed'
import { db } from './db'
import { can, Permission } from './permissions'
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

export async function guard(permission: Permission | null = null): Promise<AuthUser | null> {
  await init()
  const s = await getSession()
  if (!s.authenticated || !s.userId) return null

  const dbUser = await db.user.findUnique({ where: { id: s.userId }, select: { role: true, sessionVersion: true } })
  if (!dbUser) return null
  if (dbUser.sessionVersion !== (s.sessionVersion ?? 0)) return null

  if (permission !== null && !can(dbUser.role, permission)) return null
  return { userId: s.userId, username: s.username!, role: dbUser.role }
}

export function unauthorized() {
  return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
}
