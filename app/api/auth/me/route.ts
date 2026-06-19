import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  const s = await getSession()
  if (!s.authenticated) return NextResponse.json(null, { status: 401 })
  return NextResponse.json({ userId: s.userId, username: s.username, role: s.role ?? 'MEMBRE' })
}
