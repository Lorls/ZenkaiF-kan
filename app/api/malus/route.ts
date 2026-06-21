import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { getWeekStart, parseWeekParam } from '@/lib/week'

export async function GET(req: NextRequest) {
  const user = await guard('gestion:manage')
  if (!user) return unauthorized()

  const week = parseWeekParam(req.nextUrl.searchParams.get('week'))
  const weekEnd = new Date(week); weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)

  const malus = await db.malus.findMany({
    where: { weekStart: { gte: week, lt: weekEnd } },
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(malus)
}

export async function POST(req: NextRequest) {
  const user = await guard('gestion:manage')
  if (!user) return unauthorized()

  const { userId, malusName, points } = await req.json()

  if (!userId || !malusName?.trim() || !points) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  const pts = Math.abs(Number(points))
  if (isNaN(pts) || pts <= 0) {
    return NextResponse.json({ error: 'Points invalides' }, { status: 400 })
  }

  const target = await db.user.findUnique({ where: { id: Number(userId) } })
  if (!target) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

  const malus = await db.malus.create({
    data: {
      userId: Number(userId),
      malusName: malusName.trim(),
      points: -pts,
      assignedById: user.userId,
      weekStart: getWeekStart(),
    },
    include: { user: { select: { username: true } } },
  })

  return NextResponse.json(malus, { status: 201 })
}
