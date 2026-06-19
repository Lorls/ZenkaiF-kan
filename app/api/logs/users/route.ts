import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'

// Returns distinct usernames that appear in logs — used for the user filter dropdown
export async function GET() {
  console.log('[diag] /api/logs/users called')
  try {
    const user = await guard('logs:read')
    console.log('[diag] guard result:', JSON.stringify(user))
    if (!user) return unauthorized()
    const users = await db.log.groupBy({ by: ['username'], _count: { id: true }, orderBy: { username: 'asc' } })
    console.log('[diag] db result count:', users.length)
    return NextResponse.json(users.map(u => ({ username: u.username, count: u._count.id })))
  } catch (e) {
    console.error('[diag] CAUGHT ERROR:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
