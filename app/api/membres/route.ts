import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'

const REPORT_POINTS: Record<string, number> = {
  PARTICIPATION: 5,
  ORGANISATION: 15,
  RECRUTEMENT: 15,
}

export async function GET() {
  const user = await guard('ninjas:read')
  if (!user) return unauthorized()

  const [users, logs] = await Promise.all([
    db.user.findMany({
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
      select: { userId: true, entity: true, diff: true },
    }),
  ])

  // Donation count per user
  const donationsByUser = new Map<number, number>()
  // Tax payment count per user (only paid: true, not unpay)
  const taxesByUser = new Map<number, number>()

  for (const log of logs) {
    if (!log.userId) continue
    if (log.entity === 'donation') {
      donationsByUser.set(log.userId, (donationsByUser.get(log.userId) ?? 0) + 1)
    } else if (log.entity === 'tax' && log.diff) {
      try {
        const diff = JSON.parse(log.diff) as { paid?: { from: boolean; to: boolean } }
        if (diff.paid?.to === true) {
          taxesByUser.set(log.userId, (taxesByUser.get(log.userId) ?? 0) + 1)
        }
      } catch { /* diff malformé, on ignore */ }
    }
  }

  const membres = users.map(u => {
    const participation = u.rapports.filter(r => r.type === 'PARTICIPATION').length
    const organisation = u.rapports.filter(r => r.type === 'ORGANISATION').length
    const recrutement = u.rapports.filter(r => r.type === 'RECRUTEMENT').length
    const donations = donationsByUser.get(u.id) ?? 0
    const taxes = taxesByUser.get(u.id) ?? 0

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
