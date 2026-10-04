import { useSyncExternalStore, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/auth/AuthContext'
import { getOrgs, subscribeOrgStore } from '../lib/auth/mockOrgStore'
import { DevModeBanner } from './DevModeBanner'
import { ThemeToggle } from './ThemeToggle'

export function AppShell({
  children,
  nav,
  maxWidth = 'max-w-3xl',
  title,
  avatarLabel,
  subtitle,
}: {
  children: ReactNode
  nav: { to: string; label: string }[]
  maxWidth?: string
  title?: string
  avatarLabel?: string
  subtitle?: string
}) {
  const { organization, profile, signOut, mockMode, setMockRole, enterPlatformAdmin, enterOrg } = useAuth()
  const orgs = useSyncExternalStore(subscribeOrgStore, getOrgs)

  const headerTitle = title ?? organization?.name ?? 'AI Field Sales Copilot'
  const headerAvatar = avatarLabel ?? organization?.name?.[0] ?? 'A'
  const headerSubtitle = subtitle ?? (profile ? `Signed in as ${profile.full_name || 'you'} · ${profile.role}` : undefined)

  return (
    <div className="min-h-svh bg-slate-50 dark:bg-slate-950">
      {mockMode && (
        <DevModeBanner
          role={profile?.role}
          onSetRole={setMockRole}
          orgs={orgs}
          currentOrgId={organization?.id}
          onSwitchOrg={enterOrg}
          onEnterPlatformAdmin={enterPlatformAdmin}
        />
      )}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          {organization?.logo_url ? (
            <img
              src={organization.logo_url}
              alt={organization.name}
              className="h-8 w-8 rounded-control object-contain"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-control bg-brand text-xs font-semibold text-white">
              {headerAvatar}
            </div>
          )}
          <span className="text-sm font-semibold text-slate-900 dark:text-white">{headerTitle}</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => signOut()}
            className="rounded-control border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      </header>

      {nav.length > 0 && (
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
      )}

      <main className={`mx-auto ${maxWidth} px-4 pt-6 pb-10`}>
        {headerSubtitle && (
          <p className="mb-4 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{headerSubtitle}</p>
        )}
        {children}
      </main>
    </div>
  )
}
