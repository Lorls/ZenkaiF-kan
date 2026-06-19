import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { logAction } from '@/lib/log'
import { RESOURCES } from '@/lib/resources'

interface ImportRow {
  name: string
  weekStart: string
  taxe: string
  resources: Record<string, number>
}

export async function POST(req: NextRequest) {
  const user = await guard('admin:manage')
  if (!user) return unauthorized()

  const { rows }: { rows: ImportRow[] } = await req.json()
  if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json({ error: 'Aucune donnée' }, { status: 400 })

  const stored = await db.resourceValue.findMany()
  const valueMap: Record<string, number> = Object.fromEntries(stored.map(r => [r.resource, r.pointsPerUnit]))
  const defaults: Record<string, number> = { Bois: 1, Laine: 1, Plastique: 1, Cuivre: 1, Cuir: 1, Fer: 2, Titane: 3, 'Chakra Métal': 5, T1: 10, T2: 20, T3: 30, T4: 50, Ryo: 0.01 }
  for (const r of RESOURCES) if (valueMap[r] === undefined) valueMap[r] = defaults[r]

  const sessionId = crypto.randomUUID()
  let ninjasCreated = 0, ninjasUpdated = 0, donationsCreated = 0, taxesSet = 0

  for (const row of rows) {
    const name = row.name?.trim()
    if (!name) continue
    const weekDate = new Date(row.weekStart)

    let ninja = await db.ninja.findFirst({ where: { name: { equals: name } } })
    if (!ninja) { ninja = await db.ninja.create({ data: { name } }); ninjasCreated++ } else { ninjasUpdated++ }

    for (const resource of RESOURCES) {
      const amount = row.resources[resource] ?? 0
      if (amount <= 0) continue
      const pointsEarned = amount * (valueMap[resource] ?? 1)
      const donation = await db.donation.create({ data: { ninjaId: ninja.id, resource, amount, pointsEarned } })
      await db.ninja.update({ where: { id: ninja.id }, data: { points: { increment: pointsEarned } } })
      await logAction({ user, action: 'create', entity: 'donation', entityId: donation.id, entityName: ninja.name, sessionId, diff: { after: { id: donation.id, ninjaId: ninja.id, resource, amount, pointsEarned } } })
      donationsCreated++
    }

    const taxPaid = row.taxe !== undefined && row.taxe.trim() !== '' && row.taxe.trim().toLowerCase() !== 'rembourser'
    const tax = await db.tax.upsert({
      where: { ninjaId_weekStart: { ninjaId: ninja.id, weekStart: weekDate } },
      update: { paid: taxPaid },
      create: { ninjaId: ninja.id, weekStart: weekDate, paid: taxPaid },
    })
    await logAction({ user, action: 'update', entity: 'tax', entityId: tax.id, entityName: ninja.name, sessionId, diff: { paid: { from: !taxPaid, to: taxPaid }, ninjaId: ninja.id, weekStart: weekDate.toISOString() } })
    if (taxPaid) taxesSet++
  }

  await logAction({ user, action: 'create', entity: 'import', entityName: 'Import CSV', sessionId, diff: { rows: rows.length, ninjas: ninjasCreated, donations: donationsCreated, taxes: taxesSet } })

  return NextResponse.json({ ninjasCreated, ninjasUpdated, donationsCreated, taxesSet })
}
