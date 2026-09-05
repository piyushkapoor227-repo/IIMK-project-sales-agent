import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { FlaskConical, LogOut, RefreshCw, WifiOff, type LucideIcon } from 'lucide-react'
import { useAuth } from '../lib/auth/AuthContext'
import { DEMO, resetDemoStore } from '../lib/demo/store'
import { useOnline } from '../lib/useOnline'
import { useOfflineQueueCount } from '../lib/offline/flush'
import { ThemeToggle } from './ThemeToggle'

export interface NavItem {
  to: string
  label: string
  icon?: LucideIcon
  /** When set, the tab shows a red dot and this text on hover. */
  note?: string
}

export function AppShell({ children, nav }: { children: ReactNode; nav: NavItem[] }) {
  const { organization, profile, signOut } = useAuth()
  const online = useOnline()
  const pending = useOfflineQueueCount()

  return (
    <div className="min-h-svh bg-slate-50 dark:bg-slate-950">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[70] focus:rounded-md focus:bg-accent-600 focus:px-3 focus:py-1.5 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>

      {!online && (
        <div className="flex items-center justify-center gap-1.5 bg-slate-800 px-4 py-1.5 text-center text-xs font-medium text-white">
          <WifiOff size={13} />
          You&apos;re offline — visit entries are saved on this device and sync when you reconnect.
        </div>
      )}
      {online && pending > 0 && (
        <div className="flex items-center justify-center gap-1.5 bg-accent-600 px-4 py-1.5 text-center text-xs font-medium text-white">
          <RefreshCw size={13} className="animate-spin" />
          Syncing {pending} offline change{pending === 1 ? '' : 's'}…
        </div>
      )}
      {DEMO && (
        <div className="flex items-center justify-between gap-2 bg-amber-500 px-4 py-1.5 text-xs font-medium text-amber-950">
          <span className="flex items-center gap-1.5">
            <FlaskConical size={13} />
            Demo mode — data is local to this browser and not saved anywhere.
          </span>
          <button
            onClick={() => {
              resetDemoStore()
              window.location.reload()
            }}
            className="rounded bg-amber-950/10 px-2 py-0.5 hover:bg-amber-950/20"
          >
            Reset demo data
          </button>
        </div>
      )}

      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          {organization?.logo_url ? (
            <img src={organization.logo_url} alt={organization.name} className="h-8 w-8 rounded object-contain" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded bg-accent-600 text-xs font-semibold text-white">
              {organization?.name?.[0] ?? 'A'}
            </div>
          )}
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {organization?.name ?? 'AI Field Sales Copilot'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.note}
            className={({ isActive }) =>
              `group relative flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${
                isActive
                  ? 'border-accent-600 text-accent-600 dark:border-accent-400 dark:text-accent-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`
            }
          >
            {item.icon && <item.icon size={15} />}
            {item.label}
            {item.note && (
              <>
                <span
                  className="absolute right-0.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500"
                  aria-hidden
                />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute left-1/2 top-full z-40 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-normal text-white shadow-lg group-hover:block dark:bg-slate-100 dark:text-slate-900"
                >
                  {item.note}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <main id="main" className="mx-auto max-w-3xl px-4 py-6">
        {profile && (
          <p className="mb-4 text-xs uppercase tracking-wide text-slate-400">
            Signed in as {profile.full_name || 'you'} · {profile.role}
          </p>
        )}
        {children}
      </main>
    </div>
  )
}
