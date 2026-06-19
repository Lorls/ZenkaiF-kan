import { NextResponse } from 'next/server'
import { guard } from '@/lib/guard'

const BUILD_TIME = new Date().toISOString()

export async function GET() {
  const user = await guard()
  if (!user) return NextResponse.json({ buildTime: BUILD_TIME }, { status: 401 })
  return NextResponse.json({ userId: user.userId, username: user.username, role: user.role, buildTime: BUILD_TIME })
}
