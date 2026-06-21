import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { logAction } from '@/lib/log'
import { getWeekStart, getNextWeekStart, formatWeekRange } from '@/lib/week'

export async function POST(req: NextRequest) {
  const user = await guard('ninjas:write')
  if (!user) return unauthorized()

  const { ninjaId, resource, amount } = await req.json()
  if (!ninjaId || !resource || amount == null) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
  const amountNum = Number(amount)
  if (!Number.isFinite(amountNum) || amountNum <= 0) return NextResponse.json({ error: 'Quantité invalide' }, { status: 400 })

  const ninja = await db.ninja.findUnique({ where: { id: Number(ninjaId) } })
  if (!ninja) return NextResponse.json({ error: 'Ninja introuvable' }, { status: 404 })

  const rv = await db.resourceValue.findUnique({ where: { resource } })
  const pointsPerUnit = rv?.pointsPerUnit ?? 1
  const exonerationPerUnit = rv?.exonerationPerUnit ?? 0

  const pointsEarned = Number(amount) * pointsPerUnit
  const exonerationEarned = Number(amount) * exonerationPerUnit

  const [donation] = await db.$transaction([
    db.donation.create({ data: { ninjaId: Number(ninjaId), resource, amount: Number(amount), pointsEarned, exonerationEarned } }),
    db.ninja.update({ where: { id: Number(ninjaId) }, data: { points: { increment: pointsEarned }, exonerations: { increment: exonerationEarned } } }),
  ])

  await logAction({
    user, action: 'create', entity: 'donation', entityId: donation.id, entityName: ninja.name,
    diff: { after: { id: donation.id, ninjaId: Number(ninjaId), resource, amount: Number(amount), pointsEarned, exonerationEarned } },
  })

  // Auto-paiement si exonérations >= 25 000 ¥ (seuil fixe)
  const updated = await db.ninja.findUnique({ where: { id: Number(ninjaId) } })
  if (updated && updated.exonerations >= 25000) {
    // Cible = semaine courante si non payée, sinon semaine suivante (identique au panel d'exonération)
    const currentWeekStart = getWeekStart()
    const currentWeekTax = await db.tax.findUnique({
      where: { ninjaId_weekStart: { ninjaId: Number(ninjaId), weekStart: currentWeekStart } },
    })
    const targetWeekStart = currentWeekTax?.paid ? getNextWeekStart() : currentWeekStart

    const existing = targetWeekStart === currentWeekStart ? currentWeekTax : await db.tax.findUnique({
      where: { ninjaId_weekStart: { ninjaId: Number(ninjaId), weekStart: targetWeekStart } },
    })
    if (!existing?.paid) {
      const [autoTax] = await db.$transaction([
        db.tax.upsert({
          where: { ninjaId_weekStart: { ninjaId: Number(ninjaId), weekStart: targetWeekStart } },
          update: { paid: true },
          create: { ninjaId: Number(ninjaId), weekStart: targetWeekStart, paid: true },
        }),
        db.ninja.update({
          where: { id: Number(ninjaId) },
          data: { exonerations: { decrement: 25000 } },
        }),
      ])
      await logAction({
        user, action: 'update', entity: 'tax', entityId: autoTax.id, entityName: ninja.name,
        diff: { paid: { from: false, to: true }, ninjaId: Number(ninjaId), weekStart: targetWeekStart.toISOString(), week: formatWeekRange(targetWeekStart) },
      })
    }
  }

  return NextResponse.json(donation, { status: 201 })
}
