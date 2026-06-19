import { NextResponse } from 'next/server'
import { guard } from '@/lib/guard'

export async function GET() {
  const user = await guard()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  return NextResponse.json({ userId: user.userId, username: user.username, role: user.role })
}
