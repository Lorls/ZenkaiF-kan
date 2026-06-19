import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { logAction } from '@/lib/log'
import { RESOURCES, DEFAULT_VALUES } from '@/lib/resources'

export async function GET() {
  const user = await guard('ninjas:read')
  if (!user) return unauthorized()
  const stored = await db.resourceValue.findMany()
  const storedMap = Object.fromEntries(stored.map(r => [r.resource, r.pointsPerUnit]))
  return NextResponse.json(Object.fromEntries(RESOURCES.map(r => [r, storedMap[r] ?? DEFAULT_VALUES[r]])))
}

export async function POST(req: NextRequest) {
  const user = await guard('settings:write')
  if (!user) return unauthorized()

  const body: Record<string, number> = await req.json()
  const stored = await db.resourceValue.findMany()
  const storedMap = Object.fromEntries(stored.map(r => [r.resource, r.pointsPerUnit]))

  const diff: Record<string, { from: number; to: number }> = {}
  for (const [k, v] of Object.entries(body)) {
    const prev = storedMap[k] ?? DEFAULT_VALUES[k as keyof typeof DEFAULT_VALUES] ?? 1
    if (prev !== Number(v)) diff[k] = { from: prev, to: Number(v) }
  }

  await db.$transaction(Object.entries(body).map(([resource, pointsPerUnit]) =>
    db.resourceValue.upsert({ where: { resource }, update: { pointsPerUnit: Number(pointsPerUnit) }, create: { resource, pointsPerUnit: Number(pointsPerUnit) } })
  ))

  if (Object.keys(diff).length) {
    await logAction({ user, action: 'update', entity: 'settings', entityName: 'Ressources', diff })
  }
  return NextResponse.json({ ok: true })
}
