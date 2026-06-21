import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { parseWeekParam } from '@/lib/week'

export async function GET(req: NextRequest) {
  const user = await guard('gestion:manage')
  if (!user) return unauthorized()

  const week = parseWeekParam(req.nextUrl.searchParams.get('week'))
  const weekEnd = new Date(week); weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)

  const users = await db.user.findMany({
    select: {
      id: true, username: true,
      activities: {
        where: { status: 'APPROUVE', weekStart: { gte: week, lt: weekEnd } },
        select: { points: true },
      },
    },
    orderBy: { username: 'asc' },
  })

  const classement = users
    .map(u => ({
      userId: u.id,
      username: u.username,
      nbActivites: u.activities.length,
      points: u.activities.reduce((s, a) => s + a.points, 0),
    }))
    .filter(u => u.nbActivites > 0)
    .sort((a, b) => b.points - a.points || b.nbActivites - a.nbActivites)

  return NextResponse.json({ classement, week: week.toISOString() })
}
