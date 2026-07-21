import { AppShell } from '../../components/AppShell'

const repNav = [{ to: '/rep', label: 'Home' }]

export function RepHome() {
  return (
    <AppShell nav={repNav}>
      <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">Today's visits</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Outlet visit capture (voice, photo, smart forms) is coming in the next build phase.
      </p>
    </AppShell>
  )
}
