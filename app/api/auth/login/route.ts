import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { ensureAdminExists } from '@/lib/seed'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  await ensureAdminExists()
  const { password } = await req.json()

  if (!password) return NextResponse.json({ error: 'Mot de passe manquant' }, { status: 400 })

  // Try every user — passwords are unique, bcrypt compare stops at first match
  const users = await db.user.findMany()
  let matched = null
  for (const user of users) {
    if (await bcrypt.compare(password, user.passwordHash)) { matched = user; break }
  }

  if (!matched) return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })

  const session = await getSession()
  session.authenticated = true
  session.userId   = matched.id
  session.username = matched.username
  session.role     = matched.role
  await session.save()

  return NextResponse.json({ ok: true, role: matched.role })
}
