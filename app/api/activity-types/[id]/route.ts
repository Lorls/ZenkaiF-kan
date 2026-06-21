import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await guard('gestion:manage')
  if (!user) return unauthorized()
  const { id } = await context.params
  const { name, points, active } = await req.json()
  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name.trim()
  if (points !== undefined) data.points = Number(points)
  if (active !== undefined) data.active = Boolean(active)
  const type = await db.activityType.update({ where: { id: Number(id) }, data })
  return NextResponse.json(type)
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await guard('gestion:manage')
  if (!user) return unauthorized()
  const { id } = await context.params
  await db.activityType.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
