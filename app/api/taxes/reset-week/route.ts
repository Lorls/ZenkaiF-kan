import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { getWeekStart } from '@/lib/week'

export async function POST() {
  const user = await guard('admin:manage')
  if (!user) return unauthorized()

  const currentWeekStart = getWeekStart()

  const { count } = await db.tax.updateMany({
    where: { weekStart: currentWeekStart, paid: true },
    data: { paid: false },
  })

  return NextResponse.json({ ok: true, reset: count })
}
