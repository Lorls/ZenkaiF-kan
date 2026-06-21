import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { parseWeekParam } from '@/lib/week'

const DEFAULT_SALARY_PERCENT = 20

export async function GET(req: NextRequest) {
  const user = await guard('gestion:manage')
  if (!user) return unauthorized()

  const week = parseWeekParam(req.nextUrl.searchParams.get('week'))
  const weekEnd = new Date(week); weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)

  const [users, setting] = await Promise.all([
    db.user.findMany({
      select: {
        id: true, username: true,
        deposits: {
          where: { status: 'APPROUVE', weekStart: { gte: week, lt: weekEnd } },
          select: { amount: true },
        },
      },
      orderBy: { username: 'asc' },
    }),
    db.setting.findUnique({ where: { key: 'salaryPercent' } }),
  ])

  const salaryPercent = setting ? Number(setting.value) : DEFAULT_SALARY_PERCENT

  const salaires = users
    .map(u => {
      const totalDepose = u.deposits.reduce((s, d) => s + d.amount, 0)
      return { userId: u.id, username: u.username, totalDepose, salaire: totalDepose * (salaryPercent / 100) }
    })
    .filter(u => u.totalDepose > 0)

  const totalGeneral = salaires.reduce((s, u) => s + u.totalDepose, 0)
  const salaireTotal = salaires.reduce((s, u) => s + u.salaire, 0)

  return NextResponse.json({ salaires, totalGeneral, salaireTotal, salaryPercent, week: week.toISOString() })
}
