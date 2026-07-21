import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/auth/AuthContext'

export function AppShell({ children, nav }: { children: ReactNode; nav: { to: string; label: string }[] }) {
  const { organization, profile, signOut } = useAuth()

  return (
    <div className="min-h-svh bg-slate-50 dark:bg-slate-950">
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
            className={({ isActive }) =>
              `whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                isActive
                  ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`
            }
          >
            {item.label}
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
