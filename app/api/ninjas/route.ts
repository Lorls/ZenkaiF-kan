import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { logAction } from '@/lib/log'

export async function GET() {
  const user = await guard('ninjas:read')
  if (!user) return unauthorized()
  const ninjas = await db.ninja.findMany({ orderBy: { name: 'asc' }, include: { taxes: true } })
  return NextResponse.json(ninjas)
}

export async function POST(req: NextRequest) {
  const user = await guard('ninjas:write')
  if (!user) return unauthorized()

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

  const ninja = await db.ninja.create({ data: { name: name.trim() } })
  await logAction({ user, action: 'create', entity: 'ninja', entityId: ninja.id, entityName: ninja.name, diff: { after: { id: ninja.id, name: ninja.name, points: 0 } } })
  return NextResponse.json(ninja, { status: 201 })
}
