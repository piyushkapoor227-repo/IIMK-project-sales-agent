import { useMemo } from 'react'
import { AppShell } from '../../components/AppShell'
import { useAuth } from '../../lib/auth/AuthContext'
import { getDashboardData } from '../../lib/mock/mockDashboardData'

const repNav = [{ to: '/rep', label: 'Home' }]

export function RepHome() {
  const { organization, profile } = useAuth()

  const data = useMemo(
    () => (organization ? getDashboardData(organization.id, [profile?.full_name ?? 'You']) : null),
    [organization, profile],
  )

  const myOutlets = data?.outlets.slice(0, 6) ?? []
  const myTarget = data?.repActivity[0]

  return (
    <AppShell nav={repNav}>
      <h2 className="mb-1 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Today's visits</h2>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{organization?.name}</p>

      {!data ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-control border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {myTarget?.visitsToday ?? 0} / {myTarget?.targetVisits ?? 0}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Visits completed today</p>
            </div>
            <div className="rounded-control border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{myOutlets.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Outlets assigned</p>
            </div>
          </div>

          <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">Assigned outlets</h3>
          <ul className="mb-6 divide-y divide-slate-200 rounded-control border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {myOutlets.map((o) => (
              <li key={o.name} className="flex items-center justify-between px-4 py-2 text-sm">
                <div>
                  <p className="text-slate-800 dark:text-slate-200">{o.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{o.territory}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    o.visitedThisWeek
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  }`}
                >
                  {o.visitedThisWeek ? 'Visited this week' : 'Visit due'}
                </span>
              </li>
            ))}
          </ul>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            Smart-form capture (stock, pricing, competitor activity, photos, voice notes) is coming in the next build
            phase &mdash; this list previews the outlets that workflow will cover.
          </p>
        </>
      )}
    </AppShell>
  )
}
