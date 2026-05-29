import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { logAction } from '@/lib/log'

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await guard()
  if (!user) return unauthorized()
  const { id } = await context.params
  const ninja = await db.ninja.findUnique({
    where: { id: Number(id) },
    include: { donations: { orderBy: { createdAt: 'desc' } }, taxes: { orderBy: { weekStart: 'desc' } } },
  })
  if (!ninja) return NextResponse.json({ error: 'Ninja introuvable' }, { status: 404 })
  return NextResponse.json(ninja)
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await guard()
  if (!user) return unauthorized()
  const { id } = await context.params

  const before = await db.ninja.findUnique({ where: { id: Number(id) } })
  if (!before) return NextResponse.json({ error: 'Ninja introuvable' }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.name   !== undefined) data.name   = body.name.trim()
  if (body.points !== undefined) data.points = Number(body.points)

  const ninja = await db.ninja.update({ where: { id: Number(id) }, data })

  const diff: Record<string, { from: unknown; to: unknown }> = {}
  if (body.name   !== undefined && before.name   !== ninja.name)   diff.name   = { from: before.name,   to: ninja.name }
  if (body.points !== undefined && before.points  !== ninja.points) diff.points = { from: before.points, to: ninja.points }

  if (Object.keys(diff).length) {
    await logAction({ user, action: 'update', entity: 'ninja', entityId: ninja.id, entityName: ninja.name, diff })
  }
  return NextResponse.json(ninja)
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await guard()
  if (!user) return unauthorized()
  const { id } = await context.params

  const ninja = await db.ninja.findUnique({
    where: { id: Number(id) },
    include: { donations: true, taxes: true },
  })
  if (!ninja) return NextResponse.json({ error: 'Ninja introuvable' }, { status: 404 })

  await logAction({
    user, action: 'delete', entity: 'ninja', entityId: ninja.id, entityName: ninja.name,
    diff: { before: { id: ninja.id, name: ninja.name, points: ninja.points, donations: ninja.donations, taxes: ninja.taxes } },
  })
  await db.ninja.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
