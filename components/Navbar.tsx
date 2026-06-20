'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { can, Permission } from '@/lib/permissions'

interface Me { username: string; role: string }

interface NavItem {
  href: string
  label: string
  permission: Permission
  icon: React.ReactNode
}

interface NavCategory {
  label: string
  permission?: Permission
  items: NavItem[]
}

const CATEGORIES: NavCategory[] = [
  {
    label: 'Shomu',
    items: [
      {
        href: '/dashboard',
        label: 'Ninjas',
        permission: 'ninjas:read',
        icon: (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        href: '/stats',
        label: 'Statistiques',
        permission: 'ninjas:read',
        icon: (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        ),
      },
      {
        href: '/rachat',
        label: 'Rachat',
        permission: 'rachat:read',
        icon: (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
        ),
      },
      {
        href: '/settings',
        label: 'Gestion Points',
        permission: 'settings:write',
        icon: (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Kobo',
    permission: 'kobo:read',
    items: [],
  },
  {
    label: 'Gestion',
    items: [
      {
        href: '/logs',
        label: 'Logs',
        permission: 'logs:read',
        icon: (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
          </svg>
        ),
      },
      {
        href: '/import',
        label: 'Import',
        permission: 'ninjas:write',
        icon: (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        ),
      },
      {
        href: '/admin',
        label: 'Admin',
        permission: 'admin:manage',
        icon: (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        ),
      },
    ],
  },
]

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
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2 group">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-gold group-hover:text-gold-light transition-colors" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.707.707m12.728 12.728.707.707M1 12h1m20 0h1M4.22 19.78l.707-.707M18.95 5.05l.707-.707M12 6a6 6 0 100 12 6 6 0 000-12z" />
          </svg>
          <span className="font-bold text-ink tracking-tight">Koeki</span>
        </Link>
      </div>

      {/* Nav categories */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-5">
        {CATEGORIES.map(cat => {
          if (cat.permission && !can(role, cat.permission)) return null
          const visible = cat.items.filter(n => can(role, n.permission))
          if (cat.items.length > 0 && visible.length === 0) return null

          return (
            <div key={cat.label}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-faint select-none">
                {cat.label}
              </p>
              {visible.length === 0 ? (
                <p className="px-3 py-2 text-xs text-ink-faint italic">Bientôt disponible</p>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {visible.map(n => (
                    <Link
                      key={n.href}
                      href={n.href}
                      onClick={onNavigate}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                        pathname.startsWith(n.href)
                          ? 'bg-gold/10 text-gold'
                          : 'text-ink-muted hover:text-ink hover:bg-bg-elevated'
                      }`}
                    >
                      <span className={pathname.startsWith(n.href) ? 'text-gold' : 'text-ink-muted'}>{n.icon}</span>
                      {n.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
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
                {me.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
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
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-gold" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.707.707m12.728 12.728.707.707M1 12h1m20 0h1M4.22 19.78l.707-.707M18.95 5.05l.707-.707M12 6a6 6 0 100 12 6 6 0 000-12z" />
          </svg>
          <span className="font-bold text-ink tracking-tight">Koeki</span>
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
