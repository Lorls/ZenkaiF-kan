import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'

export async function GET(req: NextRequest) {
  const user = await guard(true)
  if (!user) return unauthorized(true)

  const { searchParams: p } = req.nextUrl
  const search   = p.get('search')   || ''
  const username = p.get('user')     || ''
  const action   = p.get('action')   || ''
  const entity   = p.get('entity')   || ''
  const status   = p.get('status')   || 'all'
  const dateFrom = p.get('dateFrom') || ''
  const dateTo   = p.get('dateTo')   || ''
  const page     = Math.max(1, Number(p.get('page') || 1))
  const limit    = 50

  const where: Record<string, unknown> = {}

  if (search) {
    where.OR = [
      { username:    { contains: search } },
      { entityName:  { contains: search } },
      { description: { contains: search } },
      { diff:        { contains: search } },
    ]
  }
  if (username) where.username = { contains: username }
  if (action)   where.action   = { in: action.split(',') }
  if (entity)   where.entity   = { in: entity.split(',') }
  if (status === 'active')   { where.reverted = false; where.isOrphaned = false; where.isCascade = false }
  if (status === 'reverted') where.reverted = true
  if (status === 'orphaned') where.isOrphaned = true
  if (status === 'cascade')  where.isCascade = true
  if (dateFrom) where.createdAt = { ...((where.createdAt as object) ?? {}), gte: new Date(dateFrom) }
  if (dateTo)   where.createdAt = { ...((where.createdAt as object) ?? {}), lte: new Date(dateTo + 'T23:59:59') }

  const [logs, total] = await db.$transaction([
    db.log.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    db.log.count({ where }),
  ])

  // Stats (unfiltered)
  const [todayCount, totalCount, revertCount, users] = await db.$transaction([
    db.log.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    db.log.count(),
    db.log.count({ where: { action: 'revert' } }),
    db.log.groupBy({ by: ['username'], _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 1 }),
  ])

  return NextResponse.json({
    logs,
    total,
    page,
    pages: Math.ceil(total / limit),
    stats: { today: todayCount, total: totalCount, reverts: revertCount, topUser: users[0]?.username ?? null },
  })
}
