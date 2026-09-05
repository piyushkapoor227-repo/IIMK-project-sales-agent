// Shared rollup dashboard for managers (direct reports) and admins (whole org).
// A single filter row (date range / zone / rep) re-scopes every chart; bars and
// donut segments drill down. Row scope is enforced by RLS, not here.
// Author: Piyush Kapoor.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, type NavItem } from '../../components/AppShell'
import { Badge, EmptyState, SectionTitle, Spinner, Stat } from '../../components/primitives'
import { ChartCard } from '../../components/ChartCard'
import {
  ColumnChart,
  DonutChart,
  GroupedColumnChart,
  HBarChart,
  PriceCompareChart,
  type Datum,
} from '../../components/charts'
import { DEFAULT_DASHBOARD_FILTERS, useDashboard, type DashboardFilters } from '../../lib/queries/useTeam'

const RANGES: { label: string; days: number | null }[] = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: 'All', days: null },
]

export function TeamDashboard({ nav }: { nav: NavItem[] }) {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_DASHBOARD_FILTERS)
  const { isLoading, windowLabel, summary, charts, recentVisits, zones, reps } = useDashboard(filters)

  const complaintsPath = nav.find((n) => n.label === 'Complaints')?.to ?? `${nav[0].to}/complaints`
  const set = (patch: Partial<DashboardFilters>) => setFilters((f) => ({ ...f, ...patch }))

  return (
    <AppShell nav={nav}>
      {/* filter row */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-slate-800">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => set({ days: r.days })}
              className={`rounded-md px-2.5 py-1 font-medium ${
                filters.days === r.days
                  ? 'bg-white shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <select
          value={filters.zone}
          onChange={(e) => set({ zone: e.target.value, repId: 'all' })}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        >
          <option value="all">All zones</option>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
        <select
          value={filters.repId}
          onChange={(e) => set({ repId: e.target.value })}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        >
          <option value="all">All reps</option>
          {reps.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {(filters.zone !== 'all' || filters.repId !== 'all' || filters.days !== 30) && (
          <button
            onClick={() => setFilters(DEFAULT_DASHBOARD_FILTERS)}
            className="text-xs font-medium text-slate-400 underline hover:text-slate-600"
          >
            Reset
          </button>
        )}
      </div>

      <SectionTitle>{windowLabel}</SectionTitle>

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
            underlying numbers. Click a rep bar or a complaint slice to drill in.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <ChartCard
              title={`Visits — ${windowLabel.toLowerCase()}`}
              description="Outlet visits checked in per day over the selected window, for the current zone/rep scope. Spot coverage gaps and rhythm."
              table={{ columns: ['Day', 'Visits'], rows: charts.visitsByDay.map((d) => [d.label, d.value]) }}
            >
              <ColumnChart data={charts.visitsByDay} unit="visits" />
            </ChartCard>

            <ChartCard
              title="Visits by rep"
              description="Total visits per rep in scope (top 12). Click a bar to filter the whole dashboard to that rep."
              table={{ columns: ['Rep', 'Visits'], rows: charts.visitsByRep.map((d) => [d.label, d.value]) }}
            >
              <HBarChart
                data={charts.visitsByRep}
                unit="visits"
                onSelect={(d: Datum) => {
                  const repId = (d as Datum & { repId?: string }).repId
                  if (repId) set({ repId })
                }}
              />
            </ChartCard>

            <ChartCard
              title="Coverage by territory"
              description="Distinct outlets visited at least once in each territory, in scope. A flat low number flags an under-serviced territory."
              table={{
                columns: ['Territory', 'Outlets visited'],
                rows: charts.coverageByTerritory.map((d) => [d.label, d.value]),
              }}
            >
              <HBarChart data={charts.coverageByTerritory} unit="outlets" />
            </ChartCard>

            <ChartCard
              title="Complaints by status"
              description="Complaints in scope by workflow state — Open, Assigned, Resolved. Click a slice to open that list on the Complaints page."
              table={{
                columns: ['Status', 'Count'],
                rows: charts.complaintsByStatus.map((s) => [s.label, s.value]),
              }}
            >
              <DonutChart
                segments={charts.complaintsByStatus}
                onSelect={(label) => navigate(`${complaintsPath}?status=${label.toLowerCase()}`)}
              />
            </ChartCard>

            <ChartCard
              title="Complaints: opened vs resolved"
              description="Per week for the last six weeks (zone/rep scoped, not limited by the date filter). Resolved bars taller than opened means the backlog is shrinking."
              table={{
                columns: ['Week of', 'Opened', 'Resolved'],
                rows: charts.complaintsByWeek.map((w) => [w.label, w.values[0], w.values[1]]),
              }}
            >
              <GroupedColumnChart groups={charts.complaintsByWeek} series={['Opened', 'Resolved']} />
            </ChartCard>

            <ChartCard
              title="Price vs competitor"
              description="Average recorded shelf price vs average competitor price, for the most-checked SKUs in scope. Our bar longer means we're priced above them."
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
            <EmptyState>No visits in this view.</EmptyState>
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
