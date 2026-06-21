import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { logAction } from '@/lib/log'
import { GRADES, DEFAULT_THRESHOLDS, GradeKey } from '@/lib/grades'
import { getNextWeekStart, formatWeekRange } from '@/lib/week'

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

  // Auto-paiement semaine suivante si exonérations >= taxe du grade
  const updated = await db.ninja.findUnique({ where: { id: Number(ninjaId) } })
  if (updated && updated.exonerations >= GRADES[0].taxRyos) {
    const settings = await db.setting.findMany({
      where: { key: { in: GRADES.map(g => `grade:${g.key}`) } },
    })
    const thMap = Object.fromEntries(settings.map(s => [s.key.replace('grade:', ''), parseFloat(s.value)]))
    const th = (k: string) => thMap[k] ?? DEFAULT_THRESHOLDS[k as GradeKey]
    const grade = [...GRADES].reverse().find(g => updated.points >= th(g.key)) ?? null
    const taxRyos = grade?.taxRyos ?? 0

    if (taxRyos > 0 && updated.exonerations >= taxRyos) {
      const nextWeekStart = getNextWeekStart()
      const existing = await db.tax.findUnique({
        where: { ninjaId_weekStart: { ninjaId: Number(ninjaId), weekStart: nextWeekStart } },
      })
      if (!existing?.paid) {
        const [autoTax] = await db.$transaction([
          db.tax.upsert({
            where: { ninjaId_weekStart: { ninjaId: Number(ninjaId), weekStart: nextWeekStart } },
            update: { paid: true },
            create: { ninjaId: Number(ninjaId), weekStart: nextWeekStart, paid: true },
          }),
          db.ninja.update({
            where: { id: Number(ninjaId) },
            data: { exonerations: { decrement: taxRyos } },
          }),
        ])
        await logAction({
          user, action: 'update', entity: 'tax', entityId: autoTax.id, entityName: ninja.name,
          diff: { paid: { from: false, to: true }, ninjaId: Number(ninjaId), weekStart: nextWeekStart.toISOString(), week: formatWeekRange(nextWeekStart) },
        })
      }
    }
  }

  return NextResponse.json(donation, { status: 201 })
}
