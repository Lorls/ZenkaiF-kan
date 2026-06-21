'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { can, ROLE_LABELS, Role } from '@/lib/permissions'

interface Me { username: string; role: string }

function NavItems({
  role,
  pathname,
  onNavigate,
  me,
  loggingOut,
  onLogout,
}: {
  role: string
  pathname: string
  onNavigate?: () => void
  me: Me | null
  loggingOut: boolean
  onLogout: () => void
}) {
  return (
    <>
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-border shrink-0">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-2 group">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-gold group-hover:text-gold-light transition-colors" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.707.707m12.728 12.728.707.707M1 12h1m20 0h1M4.22 19.78l.707-.707M18.95 5.05l.707-.707M12 6a6 6 0 100 12 6 6 0 000-12z" />
          </svg>
          <span className="font-bold text-ink tracking-tight">Gaiko</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-5">
        {can(role, 'admin:manage') && (
          <div>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-faint select-none">
              Gestion
            </p>
            <div className="flex flex-col gap-0.5">
              <Link
                href="/admin"
                onClick={onNavigate}
                className={`flex items-center gap-3 pr-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border-l-2 pl-[10px] ${
                  pathname.startsWith('/admin')
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-transparent text-ink-muted hover:text-ink hover:bg-bg-elevated'
                }`}
              >
                <span className={pathname.startsWith('/admin') ? 'text-gold' : 'text-ink-muted'}>
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </span>
                Comptes
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* User + logout */}
      {me && (
        <div className="shrink-0 border-t border-border px-3 py-4 flex flex-col gap-2">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${me.role === 'GERANT' ? 'bg-gold/20 text-gold' : 'bg-bg-elevated text-ink-muted'}`}>
              {me.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm text-ink font-medium truncate">{me.username}</span>
              <span className={`text-[10px] font-mono truncate ${me.role === 'GERANT' ? 'text-gold' : 'text-ink-muted'}`}>
                {ROLE_LABELS[me.role as Role] ?? me.role}
              </span>
            </div>
          </div>
          <button
            onClick={onLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-muted hover:text-red-400 hover:bg-red-950/40 transition-colors duration-200 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            Déconnexion
          </button>
        </div>
      )}
    </>
  )
}

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => {
      if (r.status === 401) { router.push('/login'); return null }
      return r.ok ? r.json() : null
    }).then(d => d && setMe(d))
  }, [router])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const role = me?.role ?? ''

  return (
    <>
      {/* Mobile topbar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-bg-card border-b border-border flex lg:hidden items-center px-4 z-40 justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-gold" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.707.707m12.728 12.728.707.707M1 12h1m20 0h1M4.22 19.78l.707-.707M18.95 5.05l.707-.707M12 6a6 6 0 100 12 6 6 0 000-12z" />
          </svg>
          <span className="font-bold text-ink tracking-tight">Gaiko</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-bg-elevated transition-colors"
          aria-label="Menu"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-full w-64 bg-bg-card border-r border-border flex-col z-40">
        <NavItems role={role} pathname={pathname} me={me} loggingOut={loggingOut} onLogout={handleLogout} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed top-0 left-0 h-full w-64 bg-bg-card border-r border-border flex flex-col z-50 lg:hidden">
            <NavItems
              role={role}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
              me={me}
              loggingOut={loggingOut}
              onLogout={handleLogout}
            />
          </aside>
        </>
      )}
    </>
  )
}
