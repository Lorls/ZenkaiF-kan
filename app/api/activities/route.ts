import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { can } from '@/lib/permissions'
import { getWeekStart, parseWeekParam } from '@/lib/week'

export async function GET(req: NextRequest) {
  const user = await guard()
  if (!user) return unauthorized()
  const week = parseWeekParam(req.nextUrl.searchParams.get('week'))
  const weekEnd = new Date(week); weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)

  if (can(user.role, 'gestion:manage')) {
    const status = req.nextUrl.searchParams.get('status')
    const activities = await db.activity.findMany({
      where: {
        ...(status ? { status } : {}),
        weekStart: { gte: week, lt: weekEnd },
      },
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(activities)
  }

  const activities = await db.activity.findMany({
    where: { userId: user.userId, weekStart: { gte: week, lt: weekEnd } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(activities)
}

export async function POST(req: NextRequest) {
  const user = await guard()
  if (!user) return unauthorized()
  const { activityTypeId, discordLink } = await req.json()
  if (!activityTypeId) return NextResponse.json({ error: 'Type d\'activité requis' }, { status: 400 })
  if (!discordLink?.trim()) return NextResponse.json({ error: 'Lien Discord requis' }, { status: 400 })
  if (!discordLink.includes('discord')) return NextResponse.json({ error: 'Le lien doit être un lien Discord' }, { status: 400 })

  const type = await db.activityType.findUnique({ where: { id: Number(activityTypeId) } })
  if (!type || !type.active) return NextResponse.json({ error: 'Type d\'activité introuvable' }, { status: 404 })

  const activity = await db.activity.create({
    data: {
      userId: user.userId,
      activityTypeId: type.id,
      activityName: type.name,
      points: type.points,
      discordLink: discordLink.trim(),
      weekStart: getWeekStart(),
    },
  })
  return NextResponse.json(activity, { status: 201 })
}
