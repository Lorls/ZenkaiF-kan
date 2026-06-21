import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { can } from '@/lib/permissions'
import { getFridayWeekStart } from '@/lib/week'

const TYPES = ['PARTICIPATION', 'ORGANISATION', 'RECRUTEMENT'] as const

export async function GET(req: NextRequest) {
  const user = await guard()
  if (!user) return unauthorized()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const mine = searchParams.get('mine') === 'true'
  const isReviewer = can(user.role, 'rapports:review')

  const where = isReviewer && !mine
    ? status ? { status } : {}
    : { userId: user.userId }

  const rapports = await db.rapport.findMany({
    where,
    include: { user: { select: { id: true, username: true, role: true } }, reviewedBy: { select: { id: true, username: true } } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(rapports)
}

export async function POST(req: NextRequest) {
  const user = await guard()
  if (!user) return unauthorized()

  const body = await req.json()
  const { type, description } = body

  if (!TYPES.includes(type)) return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
  if (!description?.trim()) return NextResponse.json({ error: 'Description requise' }, { status: 400 })

  const weekStart = getFridayWeekStart()

  const rapport = await db.rapport.create({
    data: { userId: user.userId, type, weekStart, description: description.trim(), status: 'EN_ATTENTE' },
  })

  return NextResponse.json(rapport, { status: 201 })
}
