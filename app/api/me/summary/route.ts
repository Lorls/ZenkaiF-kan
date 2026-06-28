import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { parseWeekParam } from '@/lib/week'

export async function GET(req: NextRequest) {
  const user = await guard()
  if (!user) return unauthorized()

  const week = parseWeekParam(req.nextUrl.searchParams.get('week'))
  const weekEnd = new Date(week); weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)

  const [activities, malus] = await Promise.all([
    db.activity.findMany({
      where: { userId: user.userId, weekStart: { gte: week, lt: weekEnd } },
      orderBy: { createdAt: 'desc' },
    }),
    db.malus.findMany({
      where: { userId: user.userId, weekStart: { gte: week, lt: weekEnd } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const pointsApprouves = activities.filter(a => a.status === 'APPROUVE').reduce((s, a) => s + a.points, 0)
  const pointsMalus = malus.reduce((s, m) => s + m.points, 0)

  return NextResponse.json({
    activities,
    malus,
    pointsApprouves,
    pointsMalus,
    week: week.toISOString(),
  })
}
