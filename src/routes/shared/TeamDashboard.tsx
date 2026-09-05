// Shared rollup dashboard for managers (direct reports) and admins (whole org).
// Row scope is enforced by RLS, not here. Author: Piyush Kapoor.
import { AppShell } from '../../components/AppShell'
import { Badge, Card, EmptyState, SectionTitle, Spinner, Stat } from '../../components/primitives'
import { useDashboard } from '../../lib/queries/useTeam'

export function TeamDashboard({ nav }: { nav: { to: string; label: string }[] }) {
  const { isLoading, summary, skuRollups, recentVisits } = useDashboard()

  return (
    <AppShell nav={nav}>
      <SectionTitle>This week</SectionTitle>

      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Visits" value={summary.visitsThisWeek} />
            <Stat label="Outlets covered" value={summary.outletsCovered} />
            <Stat label="Submitted" value={summary.submitted} hint={`${summary.drafts} in draft`} />
            <Stat label="Open complaints" value={summary.openComplaints} />
          </div>

          <SectionTitle>SKU pricing (all captured visits)</SectionTitle>
          {skuRollups.length === 0 ? (
            <EmptyState>No stock data captured yet.</EmptyState>
          ) : (
            <Card className="mb-8 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-3">SKU</th>
                    <th className="py-2 pr-3">Samples</th>
                    <th className="py-2 pr-3">Avg price</th>
                    <th className="py-2 pr-3">Avg competitor</th>
                    <th className="py-2 pr-3">Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {skuRollups.map((s) => (
                    <tr key={s.sku} className="border-t border-slate-200 dark:border-slate-800">
                      <td className="py-2 pr-3 font-medium text-slate-900 dark:text-white">{s.sku}</td>
                      <td className="py-2 pr-3">{s.samples}</td>
                      <td className="py-2 pr-3">{s.avgPrice != null ? `₹${s.avgPrice.toFixed(2)}` : '—'}</td>
                      <td className="py-2 pr-3">
                        {s.avgCompetitorPrice != null ? `₹${s.avgCompetitorPrice.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2 pr-3">
                        {s.priceGap == null ? (
                          '—'
                        ) : (
                          <Badge tone={s.priceGap > 0 ? 'red' : s.priceGap < 0 ? 'green' : 'slate'}>
                            {s.priceGap > 0 ? '+' : ''}
                            {s.priceGap.toFixed(2)}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          <SectionTitle>Recent visits</SectionTitle>
          {recentVisits.length === 0 ? (
            <EmptyState>No visits recorded yet.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {recentVisits.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <span>
                    <span className="block font-medium text-slate-900 dark:text-white">
                      {v.outlet?.name ?? 'Outlet'}
                    </span>
                    <span className="block text-xs text-slate-400">
                      {v.rep?.full_name || 'Rep'} · {v.visit_date}
                    </span>
                  </span>
                  <Badge tone={v.status === 'submitted' ? 'green' : 'amber'}>
                    {v.status === 'submitted' ? 'Submitted' : 'Draft'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </AppShell>
  )
}
