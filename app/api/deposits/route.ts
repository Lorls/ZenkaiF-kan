import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { can } from '@/lib/permissions'
import { getWeekStart, parseWeekParam } from '@/lib/week'

export async function GET(req: NextRequest) {
  const user = await guard()
  if (!user) return unauthorized()
  const week = parseWeekParam(req.nextUrl.searchParams.get('week'))
  const weekEnd = new Date(week); weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)

  if (can(user.role, 'gestion:manage')) {
    const status = req.nextUrl.searchParams.get('status')
    const deposits = await db.deposit.findMany({
      where: {
        ...(status ? { status } : {}),
        weekStart: { gte: week, lt: weekEnd },
      },
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(deposits)
  }

  const deposits = await db.deposit.findMany({
    where: { userId: user.userId, weekStart: { gte: week, lt: weekEnd } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(deposits)
}

export async function POST(req: NextRequest) {
  const user = await guard()
  if (!user) return unauthorized()
  const { amount } = await req.json()
  const parsed = Number(amount)
  if (!parsed || parsed <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
  const deposit = await db.deposit.create({
    data: { userId: user.userId, amount: parsed, weekStart: getWeekStart() },
  })
  return NextResponse.json(deposit, { status: 201 })
}
