import { AppShell } from '../../components/AppShell'

const managerNav = [{ to: '/manager', label: 'Dashboard' }]

export function ManagerDashboard() {
  return (
    <AppShell nav={managerNav}>
      <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">Team dashboard</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Outlet, territory and SKU rollups with escalation alerts are coming in a later build phase.
      </p>
    </AppShell>
  )
}
