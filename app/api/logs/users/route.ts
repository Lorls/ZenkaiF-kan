import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'

// Returns distinct usernames that appear in logs — used for the user filter dropdown
export async function GET() {
  const user = await guard('logs:read')
  if (!user) return unauthorized()
  const users = await db.log.groupBy({ by: ['username'], _count: { id: true }, orderBy: { username: 'asc' } })
  return NextResponse.json(users.map(u => ({ username: u.username, count: u._count.id })))
}
