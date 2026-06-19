import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { unsealData } from 'iron-session'
import type { SessionData } from '@/lib/auth'

// Routes publiques — pas besoin de session
const PUBLIC = ['/login', '/api/auth']

// Routes réservées aux GÉRANT
const GERANT_ONLY = ['/admin', '/settings', '/import', '/api/admin']

// Routes réservées aux membres (pas aux visiteurs)
const MEMBRE_ONLY = ['/rachat', '/api/rachat']

export async function proxy(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  if (PUBLIC.some(p => pathname.startsWith(p))) return res

  const cookie = req.cookies.get('koeki-session')
  let session: Partial<SessionData> = {}
  if (cookie?.value) {
    try {
      session = await unsealData<SessionData>(cookie.value, { password: process.env.SESSION_SECRET! })
    } catch {
      // Cookie invalide ou expiré
    }
  }

  if (!session.authenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const role: string = session.role ?? 'VISITEUR'

  if (GERANT_ONLY.some(p => pathname.startsWith(p)) && role !== 'GERANT') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if (MEMBRE_ONLY.some(p => pathname.startsWith(p)) && role === 'VISITEUR') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
