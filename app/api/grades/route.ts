import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'
import { logAction } from '@/lib/log'
import { GRADES, DEFAULT_THRESHOLDS, GradeThresholds } from '@/lib/grades'

export async function GET() {
  const user = await guard()
  if (!user) return unauthorized()
  const stored = await db.setting.findMany({ where: { key: { in: GRADES.map(g => `grade:${g.key}`) } } })
  const m = Object.fromEntries(stored.map(s => [s.key.replace('grade:', ''), parseFloat(s.value)]))
  return NextResponse.json({ GC: m.GC ?? DEFAULT_THRESHOLDS.GC, Chunin: m.Chunin ?? DEFAULT_THRESHOLDS.Chunin, Konin: m.Konin ?? DEFAULT_THRESHOLDS.Konin, TKJ: m.TKJ ?? DEFAULT_THRESHOLDS.TKJ })
}

export async function POST(req: NextRequest) {
  const user = await guard(true)
  if (!user) return unauthorized(true)

  const body: Partial<GradeThresholds> = await req.json()
  const stored = await db.setting.findMany({ where: { key: { in: GRADES.map(g => `grade:${g.key}`) } } })
  const m = Object.fromEntries(stored.map(s => [s.key.replace('grade:', ''), parseFloat(s.value)]))

  const diff: Record<string, { from: number; to: number }> = {}
  for (const g of GRADES) {
    if (body[g.key] !== undefined) {
      const prev = m[g.key] ?? DEFAULT_THRESHOLDS[g.key]
      if (prev !== Number(body[g.key])) diff[g.key] = { from: prev, to: Number(body[g.key]) }
    }
  }

  await db.$transaction(GRADES.filter(g => body[g.key] !== undefined).map(g =>
    db.setting.upsert({ where: { key: `grade:${g.key}` }, update: { value: String(Number(body[g.key])) }, create: { key: `grade:${g.key}`, value: String(Number(body[g.key])) } })
  ))

  if (Object.keys(diff).length) {
    await logAction({ user, action: 'update', entity: 'grades', entityName: 'Grades', diff })
  }
  return NextResponse.json({ ok: true })
}
