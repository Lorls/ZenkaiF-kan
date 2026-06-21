import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { getWeekStart, getNextWeekStart } from '@/lib/week'

export async function POST() {
  const user = await guard('admin:manage')
  if (!user) return unauthorized()

  const weekStart = getWeekStart()
  const nextWeekStart = getNextWeekStart()
  // Buffer de 3h pour couvrir les enregistrements créés avec un offset timezone (UTC+2/+3)
  const rangeStart = new Date(weekStart.getTime() - 3 * 60 * 60 * 1000)

  const { count } = await db.tax.updateMany({
    where: { paid: true, weekStart: { gte: rangeStart, lt: nextWeekStart } },
    data: { paid: false },
  })

  return NextResponse.json({ ok: true, reset: count })
}
