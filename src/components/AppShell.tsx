import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/auth/AuthContext'
import { DEMO, resetDemoStore } from '../lib/demo/store'
import { useOnline } from '../lib/useOnline'
import { useOfflineQueueCount } from '../lib/offline/flush'

export interface NavItem {
  to: string
  label: string
  /** When set, the tab shows a red dot and this text on hover. */
  note?: string
}

export function AppShell({ children, nav }: { children: ReactNode; nav: NavItem[] }) {
  const { organization, profile, signOut } = useAuth()
  const online = useOnline()
  const pending = useOfflineQueueCount()

  return (
    <div className="min-h-svh bg-slate-50 dark:bg-slate-950">
      {!online && (
        <div className="bg-slate-800 px-4 py-1.5 text-center text-xs font-medium text-white">
          You&apos;re offline — visit entries are saved on this device and will sync when you reconnect.
        </div>
      )}
      {online && pending > 0 && (
        <div className="bg-blue-600 px-4 py-1.5 text-center text-xs font-medium text-white">
          Syncing {pending} offline change{pending === 1 ? '' : 's'}…
        </div>
      )}
      {DEMO && (
        <div className="flex items-center justify-between gap-2 bg-amber-500 px-4 py-1.5 text-xs font-medium text-amber-950">
          <span>Demo mode — data is local to this browser and not saved anywhere.</span>
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
            <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 text-xs font-semibold text-white">
              {organization?.name?.[0] ?? 'A'}
            </div>
          )}
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {organization?.name ?? 'AI Field Sales Copilot'}
          </span>
        </div>
        <button
          onClick={() => signOut()}
          className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          Sign out
        </button>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.note}
            className={({ isActive }) =>
              `group relative whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                isActive
                  ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`
            }
          >
            {item.label}
            {item.note && (
              <>
                <span
                  className="absolute right-1 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500"
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

      <main className="mx-auto max-w-3xl px-4 py-6">
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
