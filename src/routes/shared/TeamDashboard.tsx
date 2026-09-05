// Shared rollup dashboard for managers (direct reports) and admins (whole org).
// Row scope is enforced by RLS, not here. Author: Piyush Kapoor.
import { AppShell } from '../../components/AppShell'
import { Badge, EmptyState, SectionTitle, Spinner, Stat } from '../../components/primitives'
import { ChartCard } from '../../components/ChartCard'
import {
  ColumnChart,
  DonutChart,
  GroupedColumnChart,
  HBarChart,
  PriceCompareChart,
} from '../../components/charts'
import { useDashboard } from '../../lib/queries/useTeam'

export function TeamDashboard({ nav }: { nav: { to: string; label: string }[] }) {
  const { isLoading, summary, charts, recentVisits } = useDashboard()

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

          <SectionTitle>Trends</SectionTitle>
          <p className="mb-3 -mt-1 text-xs text-slate-400">
            Tap the <span className="font-semibold">ⓘ</span> on any chart for what it measures and the
            underlying numbers.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <ChartCard
              title="Visits — last 14 days"
              description="Number of outlet visits checked in each day over the last two weeks, across everyone in scope. Use it to spot coverage gaps and week-on-week rhythm."
              table={{
                columns: ['Day', 'Visits'],
                rows: charts.visitsByDay.map((d) => [d.label, d.value]),
              }}
            >
              <ColumnChart data={charts.visitsByDay} unit="visits" />
            </ChartCard>

            <ChartCard
              title="Visits by rep"
              description="Total visits recorded per rep (all dates in the current data window, newest 200 visits). A quick read on workload balance and who is in the field."
              table={{
                columns: ['Rep', 'Visits'],
                rows: charts.visitsByRep.map((d) => [d.label, d.value]),
              }}
            >
              <HBarChart data={charts.visitsByRep} unit="visits" />
            </ChartCard>

            <ChartCard
              title="Coverage by territory"
              description="Distinct outlets visited at least once in each territory. Rising numbers mean wider coverage; a flat low number flags a territory being under-serviced."
              table={{
                columns: ['Territory', 'Outlets visited'],
                rows: charts.coverageByTerritory.map((d) => [d.label, d.value]),
              }}
            >
              <HBarChart data={charts.coverageByTerritory} unit="outlets" />
            </ChartCard>

            <ChartCard
              title="Complaints by status"
              description="Every complaint in scope, split by workflow state — Open (unassigned), Assigned (being worked), Resolved. The centre number is the total. Watch the Open slice."
              table={{
                columns: ['Status', 'Count'],
                rows: charts.complaintsByStatus.map((s) => [s.label, s.value]),
              }}
            >
              <DonutChart segments={charts.complaintsByStatus} />
            </ChartCard>

            <ChartCard
              title="Complaints: opened vs resolved"
              description="Per week for the last six weeks — new complaints logged (by created date) against complaints marked resolved (by resolved date). Resolved bars taller than opened means the backlog is shrinking."
              table={{
                columns: ['Week of', 'Opened', 'Resolved'],
                rows: charts.complaintsByWeek.map((w) => [w.label, w.values[0], w.values[1]]),
              }}
            >
              <GroupedColumnChart groups={charts.complaintsByWeek} series={['Opened', 'Resolved']} />
            </ChartCard>

            <ChartCard
              title="Price vs competitor"
              description="Average shelf price we recorded against the average competitor price, for the SKUs with the most price checks. Our bar longer than the competitor's means we're priced above them on that SKU."
              table={{
                columns: ['SKU', 'Ours', 'Competitor'],
                rows: charts.priceCompare.map((r) => [
                  r.label,
                  r.ours == null ? '—' : `₹${r.ours.toFixed(2)}`,
                  r.competitor == null ? '—' : `₹${r.competitor.toFixed(2)}`,
                ]),
              }}
            >
              <PriceCompareChart rows={charts.priceCompare} series={['Our price', 'Competitor']} />
            </ChartCard>
          </div>

          <div className="mt-8">
            <SectionTitle>Recent visits</SectionTitle>
          </div>
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
