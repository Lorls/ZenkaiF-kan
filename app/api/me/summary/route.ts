import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { parseWeekParam } from '@/lib/week'

const DEFAULT_SALARY_PERCENT = 20

export async function GET(req: NextRequest) {
  const user = await guard()
  if (!user) return unauthorized()

  const week = parseWeekParam(req.nextUrl.searchParams.get('week'))
  const weekEnd = new Date(week); weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)

  const [activities, deposits, setting] = await Promise.all([
    db.activity.findMany({
      where: { userId: user.userId, weekStart: { gte: week, lt: weekEnd } },
      orderBy: { createdAt: 'desc' },
    }),
    db.deposit.findMany({
      where: { userId: user.userId, weekStart: { gte: week, lt: weekEnd } },
      orderBy: { createdAt: 'desc' },
    }),
    db.setting.findUnique({ where: { key: 'salaryPercent' } }),
  ])

  const salaryPercent = setting ? Number(setting.value) : DEFAULT_SALARY_PERCENT
  const pointsApprouves = activities.filter(a => a.status === 'APPROUVE').reduce((s, a) => s + a.points, 0)
  const totalDeposeApprouve = deposits.filter(d => d.status === 'APPROUVE').reduce((s, d) => s + d.amount, 0)
  const salaireEstime = totalDeposeApprouve * (salaryPercent / 100)

  return NextResponse.json({
    activities,
    deposits,
    pointsApprouves,
    totalDeposeApprouve,
    salaireEstime,
    salaryPercent,
    week: week.toISOString(),
  })
}
