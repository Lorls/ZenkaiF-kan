'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

interface Me { username: string; isAdmin: boolean }

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => d && setMe(d))
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const nav = [
    { href: '/dashboard', label: 'Ninjas', always: true },
    { href: '/logs',   label: 'Logs',       always: false },
    { href: '/admin',  label: 'Admin',       always: false },
    { href: '/import', label: 'Import',      always: false },
    { href: '/settings', label: 'Paramètres', always: false },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg-base/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-gold group-hover:text-gold-light transition-colors" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.707.707m12.728 12.728.707.707M1 12h1m20 0h1M4.22 19.78l.707-.707M18.95 5.05l.707-.707M12 6a6 6 0 100 12 6 6 0 000-12z" />
            </svg>
            <span className="font-bold text-ink tracking-tight">Koeki</span>
          </Link>

          <nav className="flex items-center gap-1">
            {nav.filter(n => n.always || me?.isAdmin).map(n => (
              <Link key={n.href} href={n.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  pathname.startsWith(n.href)
                    ? 'bg-bg-elevated text-ink'
                    : 'text-ink-muted hover:text-ink hover:bg-bg-elevated'
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {me && (
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${me.isAdmin ? 'bg-gold/20 text-gold' : 'bg-bg-elevated text-ink-muted'}`}>
                {me.username?.[0]?.toUpperCase() ?? '?'}
              </div>
              <span className="text-sm text-ink-muted hidden sm:block">{me.username}</span>
              {me.isAdmin && <span className="text-[10px] font-mono bg-gold/10 text-gold px-1.5 py-0.5 rounded">ADMIN</span>}
            </div>
          )}
          <button onClick={handleLogout} disabled={loggingOut} className="btn-ghost text-sm flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            <span className="hidden sm:block">Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  )
}
