import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { logAction } from '@/lib/log'
import { getWeekStart, formatWeekRange } from '@/lib/week'

export async function POST(req: NextRequest) {
  const user = await guard('write')
  if (!user) return unauthorized()

  const { ninjaId, weekStart, paid } = await req.json()
  if (!ninjaId || !weekStart) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })

  const ninja = await db.ninja.findUnique({ where: { id: Number(ninjaId) } })
  if (!ninja) return NextResponse.json({ error: 'Ninja introuvable' }, { status: 404 })

  const weekDate = getWeekStart(new Date(weekStart))
  const existing = await db.tax.findUnique({ where: { ninjaId_weekStart: { ninjaId: Number(ninjaId), weekStart: weekDate } } })
  const prevPaid = existing?.paid ?? false

  const tax = await db.tax.upsert({
    where: { ninjaId_weekStart: { ninjaId: Number(ninjaId), weekStart: weekDate } },
    update: { paid: Boolean(paid) },
    create: { ninjaId: Number(ninjaId), weekStart: weekDate, paid: Boolean(paid) },
  })

  await logAction({
    user, action: 'update', entity: 'tax', entityId: tax.id, entityName: ninja.name,
    diff: { paid: { from: prevPaid, to: Boolean(paid) }, ninjaId: Number(ninjaId), weekStart: weekDate.toISOString(), week: formatWeekRange(weekDate) },
  })
  return NextResponse.json(tax)
}
