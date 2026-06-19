import { NextRequest, NextResponse } from 'next/server'
import { guard, unauthorized } from '@/lib/guard'
import { revertLog } from '@/lib/log'

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await guard('logs:revert')
  if (!user) return unauthorized()
  const { id } = await context.params
  const { reason } = await req.json().catch(() => ({ reason: undefined }))
  const result = await revertLog(Number(id), user, reason)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
