import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'

const REPORT_POINTS: Record<string, number> = {
  PARTICIPATION: 5,
  ORGANISATION: 15,
  RECRUTEMENT: 15,
}

export async function GET() {
  const user = await guard('rapports:review')
  if (!user) return unauthorized()

  const [users, logs, existingDonations, paidTaxes] = await Promise.all([
    db.user.findMany({
      where: { username: { not: 'admin' } },
      include: { rapports: { where: { status: 'APPROUVE' } } },
      orderBy: { username: 'asc' },
    }),
    db.log.findMany({
      where: {
        reverted: false,
        isCascade: false,
        OR: [
          { entity: 'donation', action: 'create' },
          { entity: 'tax', action: 'update' },
        ],
      },
      select: { userId: true, entity: true, entityId: true, diff: true },
    }),
    // Donations réellement existantes en base (pas supprimées), hors Ryo
    db.donation.findMany({ where: { resource: { not: 'Ryo' } }, select: { id: true, amount: true } }),
    // Taxes actuellement marquées comme payées
    db.tax.findMany({ where: { paid: true }, select: { id: true } }),
  ])

  const donationAmounts = new Map(existingDonations.map(d => [d.id, d.amount]))
  const paidTaxIds = new Set(paidTaxes.map(t => t.id))

  // userId → nb donations existantes
  const donationsByUser = new Map<number, number>()
  // userId → Set de taxId pour dédupliquer (mark/unmark/remark = 1 point max)
  const taxesByUser = new Map<number, Set<number>>()

  for (const log of logs) {
    if (!log.userId || !log.entityId) continue

    if (log.entity === 'donation') {
      // Ne compter que si la donation existe encore, et sommer les amounts
      const amount = donationAmounts.get(log.entityId)
      if (amount !== undefined) {
        donationsByUser.set(log.userId, (donationsByUser.get(log.userId) ?? 0) + amount)
      }
    } else if (log.entity === 'tax' && log.diff) {
      // Ne compter que si la taxe est actuellement payée + dédupliquer par taxId
      if (!paidTaxIds.has(log.entityId)) continue
      try {
        const diff = JSON.parse(log.diff) as { paid?: { from: boolean; to: boolean } }
        if (diff.paid?.to === true) {
          if (!taxesByUser.has(log.userId)) taxesByUser.set(log.userId, new Set())
          taxesByUser.get(log.userId)!.add(log.entityId)
        }
      } catch { /* diff malformé, on ignore */ }
    }
  }

  const membres = users.map(u => {
    const participation = u.rapports.filter(r => r.type === 'PARTICIPATION').length
    const organisation = u.rapports.filter(r => r.type === 'ORGANISATION').length
    const recrutement = u.rapports.filter(r => r.type === 'RECRUTEMENT').length
    const donations = donationsByUser.get(u.id) ?? 0
    const taxes = taxesByUser.get(u.id)?.size ?? 0

    const total =
      donations * 1 +
      taxes * 3 +
      participation * REPORT_POINTS.PARTICIPATION +
      organisation * REPORT_POINTS.ORGANISATION +
      recrutement * REPORT_POINTS.RECRUTEMENT

    return { id: u.id, username: u.username, role: u.role, donations, taxes, participation, organisation, recrutement, total }
  })

  membres.sort((a, b) => b.total - a.total)

  return NextResponse.json(membres)
}
