import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { logAction } from '@/lib/log'

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await guard('ninjas:write')
  if (!user) return unauthorized()
  const { id: paramId } = await context.params

  const donation = await db.donation.findUnique({ where: { id: Number(paramId) }, include: { ninja: true } })
  if (!donation) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  await logAction({
    user, action: 'delete', entity: 'donation', entityId: donation.id, entityName: donation.ninja.name,
    diff: { before: { id: donation.id, ninjaId: donation.ninjaId, resource: donation.resource, amount: donation.amount, pointsEarned: donation.pointsEarned, exonerationEarned: donation.exonerationEarned } },
  })

  await db.$transaction([
    db.donation.delete({ where: { id: Number(paramId) } }),
    db.ninja.update({
      where: { id: donation.ninjaId },
      data: {
        points: { decrement: donation.pointsEarned },
        exonerations: { decrement: donation.exonerationEarned },
      },
    }),
  ])
  return NextResponse.json({ ok: true })
}
