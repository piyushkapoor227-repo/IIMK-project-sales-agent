import { MOCK_ORGS, MOCK_USERS } from '../auth/mockOrgData'

// DEV-ONLY seed data: outlets and complaints for every demo organization, so
// Outlets/Complaints pages have real (simulated) data for all 7 orgs, not just
// the first one. Not real field data.

export interface Outlet {
  id: string
  org_id: string
  name: string
  territory: string
  distributor: string
  address: string
  photo_url: string | null
  last_visited_by: string | null
  last_visited_at: string | null
  visited_this_week: boolean
}

export type ComplaintStatus = 'open' | 'assigned' | 'resolved'
export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Critical'

export interface Complaint {
  id: string
  org_id: string
  outlet_name: string
  type: string
  priority: ComplaintPriority
  status: ComplaintStatus
  description: string
  assigned_to: string | null
  created_at: string
}

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
const CHAINS = ['Big Bazaar', 'DMart', 'Reliance Fresh', 'Local Kirana', 'Vijay Sales', 'Croma', 'More Supermarket']
const CITIES = ['Ahmedabad', 'Chandigarh', 'Nagpur', 'Kolkata', 'Mumbai', 'Pune', 'Chennai', 'Patna', 'Delhi', 'Jaipur']
const DISTRIBUTORS = ['Greenline Agencies', 'Sunrise Distributors', 'Apex Trading', 'Metro Supply Co', 'Horizon Traders']
const COMPLAINT_TYPES = ['Damaged stock', 'Supply delay', 'Scheme dispute', 'Pricing issue', 'Shelf space dispute', 'Billing discrepancy']
const PRIORITIES: ComplaintPriority[] = ['Low', 'Medium', 'High', 'Critical']
const COMPLAINT_DESCRIPTIONS: Record<string, string> = {
  'Damaged stock': 'Units received with torn/damaged packaging and are unsellable. Retailer wants a damage claim raised.',
  'Supply delay': "Van sales rep hasn't visited in over a week. Owner is threatening to give the shelf space to a competitor.",
  'Scheme dispute': 'Trade discount applied does not match the agreed scheme. Retailer is holding payment until corrected.',
  'Pricing issue': 'MRP printed does not match the price list shared with the distributor.',
  'Shelf space dispute': 'Competitor has taken over agreed shelf space at this outlet.',
  'Billing discrepancy': 'Invoice quantity does not match what was physically delivered.',
}

let outletSeq = 0
let complaintSeq = 0
const outlets: Outlet[] = []
const complaints: Complaint[] = []

MOCK_ORGS.forEach((org) => {
  const rand = mulberry32(hashSeed(org.id + '-outlets'))
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]
  const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min

  const orgReps = MOCK_USERS.filter((u) => u.org_id === org.id && (u.role === 'rep' || u.role === 'manager'))
  const orgOutlets: Outlet[] = []

  const outletCount = int(10, 14)
  for (let i = 0; i < outletCount; i++) {
    outletSeq += 1
    const chain = pick(CHAINS)
    const city = pick(CITIES)
    const territory = pick(TERRITORIES)
    const visitedThisWeek = rand() > 0.35
    const visitor = orgReps.length > 0 ? pick(orgReps) : null
    const outlet: Outlet = {
      id: `outlet-${outletSeq}`,
      org_id: org.id,
      name: `${chain} — ${city}`,
      territory,
      distributor: pick(DISTRIBUTORS),
      address: `${int(1, 200)} ${pick(['MG Road', 'Station Road', 'Market Street', 'Ring Road', 'Main Bazaar'])}, ${city}`,
      photo_url: null,
      last_visited_by: visitedThisWeek && visitor ? (visitor.full_name ?? visitor.employee_code) : null,
      last_visited_at: visitedThisWeek ? new Date(Date.now() - int(0, 6) * 86400000).toISOString() : null,
      visited_this_week: visitedThisWeek,
    }
    orgOutlets.push(outlet)
    outlets.push(outlet)
  }

  const complaintCount = int(4, 8)
  for (let i = 0; i < complaintCount; i++) {
    complaintSeq += 1
    const type = pick(COMPLAINT_TYPES)
    const status: ComplaintStatus = pick(['open', 'assigned', 'assigned', 'resolved'] as const)
    const assignee = orgReps.length > 0 ? pick(orgReps) : null
    complaints.push({
      id: `complaint-${complaintSeq}`,
      org_id: org.id,
      outlet_name: pick(orgOutlets)?.name ?? 'Unknown outlet',
      type,
      priority: pick(PRIORITIES),
      status,
      description: COMPLAINT_DESCRIPTIONS[type] ?? '',
      assigned_to: status === 'open' ? null : assignee ? (assignee.full_name ?? assignee.employee_code) : null,
      created_at: new Date(Date.now() - int(0, 20) * 86400000).toISOString(),
    })
  }
})

export const SEED_OUTLETS = outlets
export const SEED_COMPLAINTS = complaints
