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
  isAdmin: boolean
}

export async function guard(requireAdmin = false): Promise<AuthUser | null> {
  await init()
  const s = await getSession()
  if (!s.authenticated || !s.userId) return null
  if (requireAdmin && !s.isAdmin) return null
  return { userId: s.userId, username: s.username!, isAdmin: !!s.isAdmin }
}

export function unauthorized(admin = false) {
  return NextResponse.json(
    { error: admin ? 'Réservé aux administrateurs' : 'Non autorisé' },
    { status: 401 }
  )
}
