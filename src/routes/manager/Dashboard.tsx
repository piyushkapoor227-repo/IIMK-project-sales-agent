import { useMemo, type ReactNode } from 'react'
import { AppShell } from '../../components/AppShell'
import { DataTable, type DataTableColumn } from '../../components/DataTable'
import { BarChart } from '../../components/charts/BarChart'
import { HorizontalBarChart } from '../../components/charts/HorizontalBarChart'
import { DonutChart, type DonutSegment } from '../../components/charts/DonutChart'
import { useAuth } from '../../lib/auth/AuthContext'
import { useOrgMembers } from '../../lib/queries/useOrgMembers'
import {
  getDashboardData,
  type CompetitorRow,
  type ComplaintRow,
  type OutletRow,
  type RepActivityRow,
  type StockRow,
} from '../../lib/mock/mockDashboardData'

const managerNav = [{ to: '/manager', label: 'Dashboard' }]

const outletColumns: DataTableColumn<OutletRow>[] = [
  { key: 'name', label: 'Outlet' },
  { key: 'territory', label: 'Territory' },
  {
    key: 'visitedThisWeek',
    label: 'Visited this week',
    render: (o) => (o.visitedThisWeek ? 'Yes' : 'No'),
    highlight: (o) => !o.visitedThisWeek,
  },
  { key: 'lastVisitDaysAgo', label: 'Last visit', render: (o) => (o.lastVisitDaysAgo === 0 ? 'Today' : `${o.lastVisitDaysAgo}d ago`) },
]

const stockColumns: DataTableColumn<StockRow>[] = [
  { key: 'sku', label: 'SKU' },
  { key: 'territory', label: 'Territory' },
  { key: 'status', label: 'Status', highlight: (s) => s.status === 'Out of Stock' },
  { key: 'quantity', label: 'Qty' },
]

const competitorColumns: DataTableColumn<CompetitorRow>[] = [
  { key: 'brand', label: 'Brand' },
  {
    key: 'priceChangePct',
    label: 'Price change',
    render: (c) => `${c.priceChangePct > 0 ? '+' : ''}${c.priceChangePct}%`,
    highlight: (c) => c.priceChangePct < 0,
  },
  { key: 'hasOffer', label: 'Offer running', render: (c) => (c.hasOffer ? 'Yes' : 'No') },
  { key: 'stockPosition', label: 'Stock position' },
]

const complaintColumns: DataTableColumn<ComplaintRow>[] = [
  { key: 'outlet', label: 'Outlet' },
  { key: 'type', label: 'Issue type' },
  { key: 'priority', label: 'Priority', highlight: (c) => c.priority === 'Critical' || c.priority === 'High' },
  { key: 'daysOpen', label: 'Days open' },
]

const repActivityColumns: DataTableColumn<RepActivityRow>[] = [
  { key: 'name', label: 'Rep' },
  { key: 'visitsToday', label: "Today's visits" },
  { key: 'targetVisits', label: 'Target' },
]

export function ManagerDashboard() {
  const { organization } = useAuth()
  const { data: members } = useOrgMembers()

  const repNames = useMemo(
    () => (members ?? []).filter((m) => m.role === 'rep').map((m) => m.full_name ?? m.employee_code ?? 'Rep'),
    [members],
  )

  const data = useMemo(
    () => (organization ? getDashboardData(organization.id, repNames) : null),
    [organization, repNames],
  )

  const repChartItems = useMemo(
    () =>
      (data?.repActivity ?? [])
        .slice()
        .sort((a, b) => b.visitsToday - a.visitsToday)
        .slice(0, 10)
        .map((r) => ({ label: r.name, value: r.visitsToday })),
    [data],
  )

  const stockSegments: DonutSegment[] = useMemo(() => {
    if (!data) return []
    const counts = { Available: 0, 'Low Stock': 0, 'Out of Stock': 0 }
    data.stock.forEach((s) => counts[s.status]++)
    return [
      { label: 'Available', value: counts.Available, colorClass: 'stroke-emerald-500', dotClass: 'bg-emerald-500' },
      { label: 'Low Stock', value: counts['Low Stock'], colorClass: 'stroke-amber-500', dotClass: 'bg-amber-500' },
      { label: 'Out of Stock', value: counts['Out of Stock'], colorClass: 'stroke-red-500', dotClass: 'bg-red-500' },
    ]
  }, [data])

  const complaintSegments: DonutSegment[] = useMemo(() => {
    if (!data) return []
    const counts = { Low: 0, Medium: 0, High: 0, Critical: 0 }
    data.complaints.forEach((c) => counts[c.priority]++)
    return [
      { label: 'Low', value: counts.Low, colorClass: 'stroke-slate-400', dotClass: 'bg-slate-400' },
      { label: 'Medium', value: counts.Medium, colorClass: 'stroke-amber-500', dotClass: 'bg-amber-500' },
      { label: 'High', value: counts.High, colorClass: 'stroke-red-400', dotClass: 'bg-red-400' },
      { label: 'Critical', value: counts.Critical, colorClass: 'stroke-red-600', dotClass: 'bg-red-600' },
    ]
  }, [data])

  return (
    <AppShell nav={managerNav}>
      <h2 className="mb-1 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Team dashboard</h2>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{organization?.name}</p>

      {!data ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Today's sales" value={`${data.salesToday} / ${data.salesTarget}`} />
            <StatCard label="MTD sales" value={`${data.mtdSales} / ${data.mtdTarget}`} />
            <StatCard label="Outlets tracked" value={String(data.outlets.length)} />
            <StatCard label="Open service issues" value={String(data.complaints.length)} />
          </div>

          {data.alerts.length > 0 && (
            <div className="mb-6 rounded-panel border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
              <h3 className="mb-1 text-sm font-semibold text-amber-900 dark:text-amber-300">Critical alerts</h3>
              <ul className="list-inside list-disc text-sm text-amber-800 dark:text-amber-300">
                {data.alerts.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">Trends</h3>
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Visits -- last 30 days">
              <BarChart data={data.visitsTrend} />
            </ChartCard>
            <ChartCard title="Visits by rep">
              <HorizontalBarChart items={repChartItems} />
            </ChartCard>
            <ChartCard title="Stock status">
              <DonutChart segments={stockSegments} />
            </ChartCard>
            <ChartCard title="Complaints by priority">
              <DonutChart segments={complaintSegments} />
            </ChartCard>
          </div>

          <Section title={`Store / territory coverage (${data.outlets.length})`}>
            <DataTable columns={outletColumns} rows={data.outlets} getRowKey={(o) => o.name} />
          </Section>

          <Section title="Stock exceptions (Low Stock / Out of Stock)">
            <DataTable
              columns={stockColumns}
              rows={data.stock.filter((s) => s.status !== 'Available')}
              getRowKey={(s) => `${s.sku}-${s.territory}`}
            />
          </Section>

          <Section title="Competitor price / offer movement">
            <DataTable columns={competitorColumns} rows={data.competitors} getRowKey={(c) => c.brand} />
          </Section>

          <Section title="Open retailer / service issues">
            <DataTable
              columns={complaintColumns}
              rows={data.complaints}
              getRowKey={(c) => `${c.outlet}-${c.type}-${c.priority}-${c.daysOpen}`}
            />
          </Section>

          <Section title="Rep activity completion">
            <DataTable columns={repActivityColumns} rows={data.repActivity} getRowKey={(r) => r.id} />
          </Section>
        </>
      )}
    </AppShell>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-control border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
      {children}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-control border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h4 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">{title}</h4>
      {children}
    </div>
  )
}
