import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { logAction } from '@/lib/log'
import { getNextWeekStart } from '@/lib/week'

export async function POST(req: NextRequest) {
  const user = await guard('ninjas:write')
  if (!user) return unauthorized()

  const { ninjaId, resource, amount } = await req.json()
  if (!ninjaId || !resource || amount == null) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })

  const ninja = await db.ninja.findUnique({ where: { id: Number(ninjaId) } })
  if (!ninja) return NextResponse.json({ error: 'Ninja introuvable' }, { status: 404 })

  const rv = await db.resourceValue.findUnique({ where: { resource } })
  const pointsPerUnit = rv?.pointsPerUnit ?? 1
  const exonerationPerUnit = rv?.exonerationPerUnit ?? 0

  const pointsEarned = Number(amount) * pointsPerUnit
  const exonerationEarned = Number(amount) * exonerationPerUnit

  const newExonerations = ninja.exonerations + exonerationEarned
  const weeksToExonerate = Math.floor(newExonerations)
  const remainingExonerations = newExonerations - weeksToExonerate

  // Auto-pay next N weeks of taxes if enough exoneration accumulated
  const nextWeekStart = getNextWeekStart()
  const taxOps = Array.from({ length: weeksToExonerate }, (_, i) => {
    const weekStart = new Date(nextWeekStart)
    weekStart.setUTCDate(weekStart.getUTCDate() + i * 7)
    return db.tax.upsert({
      where: { ninjaId_weekStart: { ninjaId: Number(ninjaId), weekStart } },
      update: { paid: true },
      create: { ninjaId: Number(ninjaId), weekStart, paid: true },
    })
  })

  const [donation] = await db.$transaction([
    db.donation.create({ data: { ninjaId: Number(ninjaId), resource, amount: Number(amount), pointsEarned, exonerationEarned } }),
    db.ninja.update({ where: { id: Number(ninjaId) }, data: { points: { increment: pointsEarned }, exonerations: remainingExonerations } }),
    ...taxOps,
  ])

  await logAction({
    user, action: 'create', entity: 'donation', entityId: donation.id, entityName: ninja.name,
    diff: { after: { id: donation.id, ninjaId: Number(ninjaId), resource, amount: Number(amount), pointsEarned, exonerationEarned } },
  })
  return NextResponse.json(donation, { status: 201 })
}
