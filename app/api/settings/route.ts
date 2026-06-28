import { NextResponse } from 'next/server'
import { guard, unauthorized } from '@/lib/guard'

export async function GET() {
  const user = await guard('gestion:manage')
  if (!user) return unauthorized()
  return NextResponse.json({})
}
