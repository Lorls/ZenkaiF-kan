import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'

export async function GET(req: NextRequest) {
  const user = await guard()
  if (!user) return unauthorized()
  const activeOnly = req.nextUrl.searchParams.get('active') === '1'
  const types = await db.activityType.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(types)
}

export async function POST(req: NextRequest) {
  const user = await guard('gestion:manage')
  if (!user) return unauthorized()
  const { name, points } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
  const type = await db.activityType.create({
    data: { name: name.trim(), points: Number(points) || 0 },
  })
  return NextResponse.json(type, { status: 201 })
}
