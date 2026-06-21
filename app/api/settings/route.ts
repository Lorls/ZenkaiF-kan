import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'

const DEFAULT_SALARY_PERCENT = 20

async function getSalaryPercent(): Promise<number> {
  const s = await db.setting.findUnique({ where: { key: 'salaryPercent' } })
  return s ? Number(s.value) : DEFAULT_SALARY_PERCENT
}

export async function GET() {
  const user = await guard('gestion:manage')
  if (!user) return unauthorized()
  return NextResponse.json({ salaryPercent: await getSalaryPercent() })
}

export async function PATCH(req: NextRequest) {
  const user = await guard('gestion:manage')
  if (!user) return unauthorized()
  const { salaryPercent } = await req.json()
  const val = Number(salaryPercent)
  if (isNaN(val) || val < 0 || val > 100) {
    return NextResponse.json({ error: 'Pourcentage invalide (0–100)' }, { status: 400 })
  }
  await db.setting.upsert({
    where: { key: 'salaryPercent' },
    update: { value: String(val) },
    create: { key: 'salaryPercent', value: String(val) },
  })
  return NextResponse.json({ salaryPercent: val })
}
