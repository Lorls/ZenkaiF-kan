import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { RESOURCES } from '@/lib/resources'

export async function GET() {
  const user = await guard('ninjas:read')
  if (!user) return unauthorized()
  const stored = await db.resourceValue.findMany()
  const storedMap = Object.fromEntries(stored.map(r => [r.resource, r.exonerationPerUnit]))
  return NextResponse.json(Object.fromEntries(RESOURCES.map(r => [r, storedMap[r] ?? 0])))
}

export async function POST(req: NextRequest) {
  const user = await guard('settings:write')
  if (!user) return unauthorized()
  const body: Record<string, number> = await req.json()
  await db.$transaction(Object.entries(body).map(([resource, exonerationPerUnit]) =>
    db.resourceValue.upsert({
      where: { resource },
      update: { exonerationPerUnit: Number(exonerationPerUnit) },
      create: { resource, pointsPerUnit: 1, exonerationPerUnit: Number(exonerationPerUnit) },
    })
  ))
  return NextResponse.json({ ok: true })
}
