import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { logAction } from '@/lib/log'
import { getWeekStart, formatWeekRange } from '@/lib/week'

export async function POST(req: NextRequest) {
  const user = await guard('ninjas:write')
  if (!user) return unauthorized()

  const { ninjaId, weekStarts, paid } = await req.json()
  if (!ninjaId || !Array.isArray(weekStarts) || weekStarts.length === 0) {
    return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
  }

  const ninjaIdNum = Number(ninjaId)
  if (!Number.isInteger(ninjaIdNum) || ninjaIdNum <= 0) {
    return NextResponse.json({ error: 'Ninja invalide' }, { status: 400 })
  }

  const ninja = await db.ninja.findUnique({ where: { id: ninjaIdNum } })
  if (!ninja) return NextResponse.json({ error: 'Ninja introuvable' }, { status: 404 })

  const paidBool = Boolean(paid)
  let updated = 0

  for (const ws of weekStarts) {
    const weekDate = getWeekStart(new Date(ws))
    if (isNaN(weekDate.getTime())) continue

    const existing = await db.tax.findUnique({
      where: { ninjaId_weekStart: { ninjaId: ninjaIdNum, weekStart: weekDate } },
    })
    const prevPaid = existing?.paid ?? false

    const tax = await db.tax.upsert({
      where: { ninjaId_weekStart: { ninjaId: ninjaIdNum, weekStart: weekDate } },
      update: { paid: paidBool },
      create: { ninjaId: ninjaIdNum, weekStart: weekDate, paid: paidBool },
    })

    await logAction({
      user, action: 'update', entity: 'tax', entityId: tax.id, entityName: ninja.name,
      diff: { paid: { from: prevPaid, to: paidBool }, ninjaId: ninjaIdNum, weekStart: weekDate.toISOString(), week: formatWeekRange(weekDate) },
    })
    updated++
  }

  return NextResponse.json({ ok: true, updated })
}
