// DEV-ONLY: deterministic, per-organization mock dashboard data. Pure function
// of the org id, so numbers stay stable across renders/switches without needing
// a reactive store. Not real field data -- replace with real queries once
// outlets/visits/stock_reports are wired to a real backend (Phase 2+).

function hashSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TERRITORIES = ['North Zone', 'South Zone', 'East Zone', 'West Zone', 'Central']
const SKUS = ['Model A5', 'Model G2 Pro', 'Model S1', 'Model Lite', 'Model X Ultra']
const COMPETITOR_BRANDS = ['Samsung', 'Vivo', 'OPPO', 'Xiaomi', 'Realme']
const ISSUE_TYPES = ['Device Issue', 'Software Issue', 'Replacement Required', 'Warranty Issue', 'Customer Complaint']
const PRIORITIES: Array<'Low' | 'Medium' | 'High' | 'Critical'> = ['Low', 'Medium', 'High', 'Critical']

export interface OutletRow {
  name: string
  territory: string
  visitedThisWeek: boolean
  lastVisitDaysAgo: number
}

export interface StockRow {
  sku: string
  territory: string
  status: 'Available' | 'Low Stock' | 'Out of Stock'
  quantity: number
}

export interface CompetitorRow {
  brand: string
  priceChangePct: number
  hasOffer: boolean
  stockPosition: 'High' | 'Normal' | 'Low' | 'Out of Stock'
}

export interface ComplaintRow {
  outlet: string
  type: string
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  daysOpen: number
}

export interface RepActivityRow {
  id: string
  name: string
  visitsToday: number
  targetVisits: number
}

export interface TrendPoint {
  label: string
  value: number
}

export interface DashboardData {
  salesToday: number
  salesTarget: number
  mtdSales: number
  mtdTarget: number
  outlets: OutletRow[]
  stock: StockRow[]
  competitors: CompetitorRow[]
  complaints: ComplaintRow[]
  repActivity: RepActivityRow[]
  visitsTrend: TrendPoint[]
  alerts: string[]
}

export function getDashboardData(orgId: string, repNames: string[]): DashboardData {
  const rand = mulberry32(hashSeed(orgId))
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]
  const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min

  const outlets: OutletRow[] = []
  TERRITORIES.forEach((territory) => {
    const count = int(2, 4)
    for (let i = 1; i <= count; i++) {
      outlets.push({
        name: `${territory.split(' ')[0]} Retail ${i}`,
        territory,
        visitedThisWeek: rand() > 0.3,
        lastVisitDaysAgo: int(0, 9),
      })
    }
  })

  const stock: StockRow[] = []
  SKUS.forEach((sku) => {
    TERRITORIES.forEach((territory) => {
      const roll = rand()
      const status: StockRow['status'] = roll > 0.75 ? 'Out of Stock' : roll > 0.5 ? 'Low Stock' : 'Available'
      stock.push({ sku, territory, status, quantity: status === 'Out of Stock' ? 0 : int(2, 40) })
    })
  })

  const competitors: CompetitorRow[] = COMPETITOR_BRANDS.map((brand) => ({
    brand,
    priceChangePct: Math.round((rand() - 0.5) * 20 * 10) / 10,
    hasOffer: rand() > 0.5,
    stockPosition: pick(['High', 'Normal', 'Low', 'Out of Stock'] as const),
  }))

  const complaintCount = int(3, 7)
  const complaints: ComplaintRow[] = Array.from({ length: complaintCount }, () => ({
    outlet: pick(outlets).name,
    type: pick(ISSUE_TYPES),
    priority: pick(PRIORITIES),
    daysOpen: int(0, 12),
  }))

  const repActivity: RepActivityRow[] = repNames.map((name, i) => ({
    id: `rep-${i}`,
    name,
    visitsToday: int(0, 8),
    targetVisits: int(6, 10),
  }))

  const salesTarget = int(400, 900)
  const salesToday = Math.round(salesTarget * (0.5 + rand() * 0.6))
  const mtdTarget = salesTarget * 22
  const mtdSales = Math.round(mtdTarget * (0.4 + rand() * 0.5))

  const visitsTrend: TrendPoint[] = Array.from({ length: 30 }, (_, i) => ({
    label: `Day ${i + 1}`,
    value: int(2, 14),
  }))

  const alerts: string[] = []
  const oosCount = stock.filter((s) => s.status === 'Out of Stock').length
  if (oosCount > 0) alerts.push(`${oosCount} SKU/territory combinations are Out of Stock`)
  const uncovered = outlets.filter((o) => !o.visitedThisWeek).length
  if (uncovered > 0) alerts.push(`${uncovered} outlets have not been visited this week`)
  const criticalComplaints = complaints.filter((c) => c.priority === 'Critical' || (c.priority === 'High' && c.daysOpen > 3))
  if (criticalComplaints.length > 0) alerts.push(`${criticalComplaints.length} high/critical service issues need escalation`)
  const priceDrops = competitors.filter((c) => c.priceChangePct < -5)
  if (priceDrops.length > 0) alerts.push(`Competitor price drop >5% on ${priceDrops.map((c) => c.brand).join(', ')}`)

  return {
    salesToday,
    salesTarget,
    mtdSales,
    mtdTarget,
    outlets,
    stock,
    competitors,
    complaints,
    repActivity,
    visitsTrend,
    alerts,
  }
}
