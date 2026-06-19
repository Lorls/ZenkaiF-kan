import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/guard'

export async function POST() {
  const user = await guard('admin:manage')
  if (!user) return unauthorized()

  // Cascade deletes donations + taxes via schema onDelete: Cascade
  await db.$transaction([
    db.log.deleteMany(),
    db.tax.deleteMany(),
    db.donation.deleteMany(),
    db.ninja.deleteMany(),
  ])

  return NextResponse.json({ ok: true })
}
