import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// Bootstrap endpoint: promotes the current session's user to GERANT.
// Requires SITE_PASSWORD as proof of site ownership.
// Remove this file once the correct accounts have GERANT role.
export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({}))

  const sitePassword = process.env.SITE_PASSWORD
  if (!sitePassword || !password || password !== sitePassword) {
    return NextResponse.json({ error: 'Mot de passe invalide' }, { status: 401 })
  }

  const s = await getSession()
  if (!s.authenticated || !s.userId) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }

  const updated = await db.user.update({
    where: { id: s.userId },
    data: { role: 'GERANT' },
    select: { id: true, username: true, role: true },
  })

  return NextResponse.json({ ok: true, user: updated })
}
