import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getIronSession } from 'iron-session'
import { SessionData } from '@/lib/auth'

const sessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'koeki-session',
  cookieOptions: { secure: process.env.NODE_ENV === 'production' },
}

const PUBLIC  = ['/login', '/api/auth']
// Pages réservées aux admins (les routes API gèrent leurs propres permissions)
const ADMIN_ONLY = ['/admin', '/logs', '/settings', '/import', '/api/admin', '/api/logs']

export async function proxy(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  if (PUBLIC.some(p => pathname.startsWith(p))) return res

  const session = await getIronSession<SessionData>(req, res, sessionOptions)

  if (!session.authenticated) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (ADMIN_ONLY.some(p => pathname.startsWith(p)) && session.role !== 'ADMIN') {
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
