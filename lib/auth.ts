import { getIronSession, IronSession } from 'iron-session'
import { cookies } from 'next/headers'

export interface SessionData {
  authenticated: boolean
  userId?: number
  username?: string
  role?: string
  sessionVersion?: number
}

const sessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'fukan-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60,
  },
}

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions)
}

export async function isAuthenticated(): Promise<boolean> {
  const s = await getSession()
  return s.authenticated === true
}

export async function isAdmin(): Promise<boolean> {
  const s = await getSession()
  return s.authenticated === true && s.role === 'GERANT'
}
