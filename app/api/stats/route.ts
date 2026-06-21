import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { getWeekStart } from '@/lib/week'

export async function GET() {
  const user = await guard('ninjas:read')
  if (!user) return unauthorized()

  const ninjas = await db.ninja.findMany({
    include: { taxes: true },
    orderBy: { points: 'desc' },
  })

  const currentWeekStart = getWeekStart()

  const unpaidCount = (taxes: { weekStart: Date; paid: boolean }[]) => {
    const currentPaid = taxes.some(
      t => t.weekStart.getTime() === currentWeekStart.getTime() && t.paid
    )
    const oldUnpaid = taxes.filter(
      t => !t.paid && t.weekStart.getTime() !== currentWeekStart.getTime()
    ).length
    return oldUnpaid + (currentPaid ? 0 : 1)
  }

  const withUnpaid = ninjas.map(n => ({ ...n, unpaidCount: unpaidCount(n.taxes) }))
  const inDebtNinjas = withUnpaid.filter(n => n.unpaidCount > 0)
  const totalUnpaidWeeks = withUnpaid.reduce((s, n) => s + n.unpaidCount, 0)

  return NextResponse.json({
    ninjas: {
      total: ninjas.length,
      upToDate: ninjas.length - inDebtNinjas.length,
      inDebt: inDebtNinjas.length,
    },
    taxes: {
      totalUnpaid: totalUnpaidWeeks,
      complianceRate: ninjas.length === 0
        ? 100
        : Math.round(((ninjas.length - inDebtNinjas.length) / ninjas.length) * 100),
    },
    points: {
      total: Math.round(ninjas.reduce((s, n) => s + n.points, 0)),
    },
    topDonors: ninjas.slice(0, 5).map(n => ({
      id: n.id,
      name: n.name,
      points: Math.round(n.points),
    })),
    mostInDebt: inDebtNinjas
      .sort((a, b) => b.unpaidCount - a.unpaidCount)
      .slice(0, 5)
      .map(n => ({
        id: n.id,
        name: n.name,
        unpaid: n.unpaidCount,
      })),
  })
}
