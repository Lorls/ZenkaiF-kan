import { NextResponse } from 'next/server'
import { guard } from '@/lib/guard'

export async function GET() {
  const noPerms = await guard()
  const logsRead = await guard('logs:read')
  const adminManage = await guard('admin:manage')
  return NextResponse.json({
    noPerms: noPerms ? { role: noPerms.role } : null,
    logsRead: logsRead ? { role: logsRead.role } : null,
    adminManage: adminManage ? { role: adminManage.role } : null,
  })
}
