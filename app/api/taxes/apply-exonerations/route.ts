import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { logAction } from '@/lib/log'
import { getWeekStart, getNextWeekStart, formatWeekRange } from '@/lib/week'

export async function POST() {
  const user = await guard('admin:manage')
  if (!user) return unauthorized()

  const currentWeekStart = getWeekStart()
  const nextWeekStart = getNextWeekStart()

  const ninjas = await db.ninja.findMany({
    where: { exonerations: { gte: 25000 } },
    include: { taxes: { where: { weekStart: { in: [currentWeekStart, nextWeekStart] } } } },
  })

  let applied = 0

  for (const ninja of ninjas) {
    const currentWeekTax = ninja.taxes.find(t => t.weekStart.getTime() === currentWeekStart.getTime())
    const targetWeekStart = currentWeekTax?.paid ? nextWeekStart : currentWeekStart

    const targetTax = ninja.taxes.find(t => t.weekStart.getTime() === targetWeekStart.getTime())
    if (targetTax?.paid) continue

    const [autoTax] = await db.$transaction([
      db.tax.upsert({
        where: { ninjaId_weekStart: { ninjaId: ninja.id, weekStart: targetWeekStart } },
        update: { paid: true },
        create: { ninjaId: ninja.id, weekStart: targetWeekStart, paid: true },
      }),
      db.ninja.update({
        where: { id: ninja.id },
        data: { exonerations: { decrement: 25000 } },
      }),
    ])

    await logAction({
      user, action: 'update', entity: 'tax', entityId: autoTax.id, entityName: ninja.name,
      diff: { paid: { from: false, to: true }, ninjaId: ninja.id, weekStart: targetWeekStart.toISOString(), week: formatWeekRange(targetWeekStart) },
    })

    applied++
  }

  return NextResponse.json({ ok: true, applied })
}
