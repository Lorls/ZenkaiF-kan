import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { logAction } from '@/lib/log'

export async function POST(req: NextRequest) {
  const user = await guard('write')
  if (!user) return unauthorized()

  const { ninjaId, resource, amount } = await req.json()
  if (!ninjaId || !resource || amount == null) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })

  const ninja = await db.ninja.findUnique({ where: { id: Number(ninjaId) } })
  if (!ninja) return NextResponse.json({ error: 'Ninja introuvable' }, { status: 404 })

  const rv = await db.resourceValue.findUnique({ where: { resource } })
  const pointsPerUnit = rv?.pointsPerUnit ?? 1
  const pointsEarned = Number(amount) * pointsPerUnit

  const [donation] = await db.$transaction([
    db.donation.create({ data: { ninjaId: Number(ninjaId), resource, amount: Number(amount), pointsEarned } }),
    db.ninja.update({ where: { id: Number(ninjaId) }, data: { points: { increment: pointsEarned } } }),
  ])

  await logAction({
    user, action: 'create', entity: 'donation', entityId: donation.id, entityName: ninja.name,
    diff: { after: { id: donation.id, ninjaId: Number(ninjaId), resource, amount: Number(amount), pointsEarned } },
  })
  return NextResponse.json(donation, { status: 201 })
}
