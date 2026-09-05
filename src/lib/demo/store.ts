// In-memory demo backend. Enabled with VITE_DEMO_MODE=true so the app can be
// explored end-to-end without a Supabase project. Data is generated once from a
// fixed seed and then persisted to localStorage (this browser only).
// Author: Piyush Kapoor.

export const DEMO = import.meta.env?.VITE_DEMO_MODE === 'true'

const STORAGE_KEY = 'demo:db:v3'
const SESSION_KEY = 'demo:session:v1'

export interface DemoRow {
  [key: string]: unknown
  id: string
}

interface DemoDB {
  organizations: DemoRow[]
  profiles: DemoRow[]
  invites: DemoRow[]
  outlets: DemoRow[]
  visits: DemoRow[]
  stock_reports: DemoRow[]
  merchandising_photos: DemoRow[]
  voice_notes: DemoRow[]
  complaints: DemoRow[]
}

export const DEMO_CREDENTIALS: Record<string, { password: string; userId: string }> = {
  admin: { password: 'admin', userId: 'u-admin' },
  manager: { password: 'manager', userId: 'u-mgr-nat' },
  national: { password: 'national', userId: 'u-mgr-nat' },
  south: { password: 'south', userId: 'u-mgr-south' },
  east: { password: 'east', userId: 'u-mgr-east' },
  west: { password: 'west', userId: 'u-mgr-west' },
  north: { password: 'north', userId: 'u-mgr-north' },
  rep: { password: 'rep', userId: 'u-rep-south-1' },
}

// ---- deterministic RNG -------------------------------------------------------

function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

// ---- name pools -----------------------------------------------------------

const FIRST = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Krishna', 'Ishaan', 'Rohan',
  'Ananya', 'Diya', 'Aadhya', 'Meera', 'Ira', 'Prisha', 'Sara', 'Riya', 'Aditi', 'Kavya',
  'Rahul', 'Nikhil', 'Karan', 'Vikram', 'Sana', 'Neha', 'Pooja', 'Sneha', 'Anjali', 'Deepak',
  'Manish', 'Suresh', 'Ravi', 'Amit', 'Priya', 'Divya', 'Farhan', 'Zoya', 'Imran', 'Nisha',
]
const LAST = [
  'Sharma', 'Verma', 'Rao', 'Nair', 'Iyer', 'Menon', 'Kumar', 'Singh', 'Gupta', 'Reddy',
  'Patel', 'Shah', 'Desai', 'Joshi', 'Kulkarni', 'Bose', 'Das', 'Ghosh', 'Khan', 'Shaikh',
  'Chopra', 'Malhotra', 'Bhat', 'Pillai', 'Naidu',
]

const ZONES = [
  { name: 'South', code: 'S', territories: ['Bengaluru', 'Chennai', 'Hyderabad', 'Kochi'] },
  { name: 'East', code: 'E', territories: ['Kolkata', 'Bhubaneswar', 'Patna', 'Guwahati'] },
  { name: 'West', code: 'W', territories: ['Mumbai', 'Pune', 'Ahmedabad', 'Nagpur'] },
  { name: 'North', code: 'N', territories: ['Delhi NCR', 'Jaipur', 'Lucknow', 'Chandigarh'] },
]
const CHAINS = ['MoreRetail', 'DMart', 'Reliance Fresh', "Spencer's", 'Star Bazaar', 'Local Kirana', 'Big Bazaar']
const DISTRIBUTORS = ['Sunrise Distributors', 'Metro Supply Co', 'Apex Trading', 'Greenline Agencies']
const SKUS = [
  'Acme Cola 500ml', 'Acme Cola 1L', 'Acme Chips 50g', 'Acme Chips 150g', 'Acme Juice 200ml',
  'Acme Juice 1L', 'Acme Water 1L', 'Acme Energy 250ml', 'Acme Biscuits 100g',
]
const COMPLAINT_ISSUES: Record<string, string[]> = {
  'Supply delay': [
    'Distributor missed the Tuesday delivery slot; store out of Acme Cola 1L for four days and losing walk-in sales.',
    "Van sales rep hasn't visited in two weeks. Owner is threatening to give the shelf space to a competitor.",
    'Order placed on the 3rd still not delivered. Retailer wants a firm ETA or a credit note for lost sales.',
    'Partial delivery — juice and water came, chips and biscuits did not, with no communication from the distributor.',
  ],
  'Damaged stock': [
    'Two cartons of Acme Juice 200ml arrived crushed and leaking. Store wants a replacement plus pickup of the damaged units.',
    'Biscuit packs received with torn outer film — about 15 units unsellable. Retailer wants a damage claim raised.',
    'Cola bottles delivered with swollen caps, likely a cold-chain break in transit. Owner is worried about customer complaints.',
    'Energy drink cans dented on one side; retailer will only accept them at a discount.',
  ],
  'Scheme dispute': [
    "Retailer says last month's 5% off-invoice scheme was never credited. Has the circular and expects the adjustment next bill.",
    'Confusion over the buy-10-get-1 offer — distributor billed the full quantity. Owner wants the free units or a credit.',
    "Q2 display incentive for keeping the end-cap hasn't been paid. Retailer has photos of the display as proof.",
    'Trade discount applied at 2% instead of the agreed 4%. Retailer is holding payment until it is corrected.',
  ],
  Planogram: [
    'Competitor took over our contracted eye-level shelf while we were out of stock. Need to reclaim it on the next visit.',
    'Our SKUs are split across two shelves instead of blocked together — visibility is poor and off-take has dropped.',
    'Store staff moved Acme Chips to the bottom rack for a local brand. Owner is open to moving it back.',
    'Store layout changed after a renovation; our planogram no longer matches and needs a fresh merchandising plan.',
  ],
  'Pricing error': [
    'MRP sticker on Acme Cola 500ml shows the old price; store is selling below the revised MRP and losing margin.',
    'POS is ringing up Acme Juice 1L at the 200ml price. Retailer wants the master data corrected.',
    'Competitor running a 15% off promo on cola this week; our price looks high by comparison — flagged for review.',
    'Shelf price and counter price differ for the same SKU and a customer complained. Needs a price audit.',
  ],
  'POSM shortage': [
    'No shelf strips or wobblers for the new juice variant; the launch display looks bare.',
    'Danglers from the last campaign are torn and faded — store wants fresh POSM before the festival season.',
    'Promised standee for the end-cap never arrived. Owner has kept the space reserved for a week.',
    'Price tags and shelf talkers missing for half our range after the store reorganised.',
  ],
}
const COMPLAINT_CATS = Object.keys(COMPLAINT_ISSUES)

function daysAgoISO(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString()
}
function daysAgoDate(n: number): string {
  return daysAgoISO(n).slice(0, 10)
}

// ---- generator ----------------------------------------------------------

function seed(): DemoDB {
  const rand = makeRng(20260906)
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1))
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
  const chance = (p: number) => rand() < p

  const usedNames = new Set<string>()
  const name = () => {
    for (let i = 0; i < 50; i++) {
      const n = `${pick(FIRST)} ${pick(LAST)}`
      if (!usedNames.has(n)) {
        usedNames.add(n)
        return n
      }
    }
    return `${pick(FIRST)} ${pick(LAST)} ${int(1, 99)}`
  }

  const row = (id: string, rest: Record<string, unknown>): DemoRow => ({ id, ...rest })

  const organizations: DemoRow[] = [
    {
      id: 'o-acme',
      name: 'Acme Distribution',
      org_code: 'ACME',
      logo_url: null,
      created_at: daysAgoISO(320),
      created_by: 'u-admin',
    },
  ]

  const profiles: DemoRow[] = []
  const lastSeen = () => {
    const r = rand()
    if (r < 0.62) return daysAgoISO(int(0, 3) + rand()) // active
    if (r < 0.9) return daysAgoISO(int(4, 30))
    return null // never signed in
  }

  profiles.push(
    row('u-admin', {
      org_id: 'o-acme', employee_code: 'admin', full_name: 'Aditya Rao', role: 'admin',
      manager_id: null, zone: null, last_seen_at: daysAgoISO(0.2), deactivated_at: null,
      onboarding_status: 'active', created_at: daysAgoISO(320),
    }),
  )
  profiles.push(
    row('u-mgr-nat', {
      org_id: 'o-acme', employee_code: 'MGR-NAT', full_name: 'Meera Nair', role: 'manager',
      manager_id: null, zone: 'National', last_seen_at: daysAgoISO(0.5), deactivated_at: null,
      onboarding_status: 'active', created_at: daysAgoISO(300),
    }),
  )

  const outlets: DemoRow[] = []
  const visits: DemoRow[] = []
  const stock_reports: DemoRow[] = []
  const complaints: DemoRow[] = []
  let vc = 0
  let sc = 0
  let cc = 0

  for (const z of ZONES) {
    const mgrId = `u-mgr-${z.name.toLowerCase()}`
    profiles.push(
      row(mgrId, {
        org_id: 'o-acme', employee_code: `MGR-${z.code}`, full_name: name(), role: 'manager',
        manager_id: 'u-mgr-nat', zone: z.name, last_seen_at: lastSeen(), deactivated_at: null,
        onboarding_status: 'active', created_at: daysAgoISO(int(240, 290)),
      }),
    )

    // outlets for the zone
    const zoneOutlets: string[] = []
    for (const terr of z.territories) {
      const n = int(1, 2)
      for (let k = 0; k < n; k++) {
        const oid = `ot-${z.code}-${zoneOutlets.length + 1}`
        zoneOutlets.push(oid)
        outlets.push(
          row(oid, {
            org_id: 'o-acme', name: `${pick(CHAINS)} — ${terr}`, address: null, territory: terr,
            distributor_name: pick(DISTRIBUTORS),
            gps_lat: 15 + rand() * 13, gps_lng: 72 + rand() * 16, created_at: daysAgoISO(int(120, 260)),
          }),
        )
      }
    }

    // 25 reps per zonal manager
    for (let i = 1; i <= 25; i++) {
      const repId = `u-rep-${z.name.toLowerCase()}-${i}`
      const seen = i === 1 && z.code === 'S' ? daysAgoISO(0) : lastSeen()
      profiles.push(
        row(repId, {
          org_id: 'o-acme', employee_code: `${z.code}-${String(i).padStart(3, '0')}`,
          full_name: i === 1 && z.code === 'S' ? 'Ravi Kumar' : name(),
          role: 'rep', manager_id: mgrId, zone: z.name, last_seen_at: seen, deactivated_at: null,
          onboarding_status: 'active', created_at: daysAgoISO(int(15, 200)),
        }),
      )

      // activity for a subset of reps
      const isActive = seen != null && (chance(0.55) || (i === 1 && z.code === 'S'))
      if (!isActive) continue

      const nVisits = i === 1 && z.code === 'S' ? 6 : int(1, 5)
      for (let v = 0; v < nVisits; v++) {
        const ago = i === 1 && z.code === 'S' && v === 0 ? 0 : int(0, 29)
        const submitted = !(ago === 0 && chance(0.6))
        const vid = `v-${++vc}`
        visits.push(
          row(vid, {
            org_id: 'o-acme', outlet_id: pick(zoneOutlets), rep_id: repId,
            visit_date: daysAgoDate(ago), status: submitted ? 'submitted' : 'draft',
            gps_checkin_lat: 15 + rand() * 13, gps_checkin_lng: 72 + rand() * 16,
            notes: submitted ? 'Visit completed — stock and pricing captured.' : null,
            submitted_at: submitted ? daysAgoISO(ago) : null, created_at: daysAgoISO(ago + rand()),
          }),
        )

        if (submitted && chance(0.7)) {
          const rows = int(1, 3)
          for (let s = 0; s < rows; s++) {
            const price = int(15, 90)
            stock_reports.push(
              row(`sr-${++sc}`, {
                org_id: 'o-acme', visit_id: vid, sku: pick(SKUS),
                quantity: int(0, 40), price, competitor_price: price + int(-6, 6),
                photo_url: null, ai_extracted: null, created_at: daysAgoISO(ago),
              }),
            )
          }
        }

        if (submitted && chance(0.22)) {
          const st = pick(['open', 'open', 'assigned', 'assigned', 'resolved'])
          const cat = pick(COMPLAINT_CATS)
          complaints.push(
            row(`c-${++cc}`, {
              org_id: 'o-acme', visit_id: vid, category: cat,
              description: pick(COMPLAINT_ISSUES[cat]),
              status: st, assigned_to: st === 'open' ? null : mgrId,
              resolved_at: st === 'resolved' ? daysAgoISO(int(1, ago + 1)) : null,
              created_at: daysAgoISO(ago + int(0, 2)),
            }),
          )
        }
      }
    }
  }

  // a couple of AI-annotated records on Ravi Kumar's visits for the demo walkthrough
  const raviVisits = visits.filter((v) => v.rep_id === 'u-rep-south-1' && v.status === 'submitted')
  const merchandising_photos: DemoRow[] = []
  const voice_notes: DemoRow[] = []
  if (raviVisits[0]) {
    merchandising_photos.push(
      row('mp-1', {
        org_id: 'o-acme', visit_id: raviVisits[0].id, photo_url: 'demo-seed/shelf-1.svg',
        compliance_score: 72,
        ai_analysis: {
          compliance_score: 72,
          summary: 'Strong cola shelf share at eye level; chips under-faced and one price tag missing.',
          detected_skus: [
            { name: 'Acme Cola 500ml', facings: 6 },
            { name: 'Acme Chips 50g', facings: 2 },
          ],
          issues: ['Chips facings below target', 'Missing price tag on Juice 200ml', 'Competitor stock on the bottom shelf'],
        },
        created_at: daysAgoISO(2),
      }),
    )
  }
  if (raviVisits[1]) {
    voice_notes.push(
      row('vn-1', {
        org_id: 'o-acme', visit_id: raviVisits[1].id,
        audio_transcript:
          'Cola 1L out of stock since Monday, distributor delivery missed. Competitor running ten percent off. Owner wants a gondola end-cap next month.',
        structured_data: {
          summary: 'Cola 1L stocked out; competitor promo live; retailer wants an end-cap.',
          stock_mentions: [{ sku: 'Acme Cola 1L', quantity: 0, price: null }],
          competitor_activity: ['Competitor cola at 10% off'],
          complaints: ['Cola 1L OOS — missed delivery'],
          action_items: ['Escalate the delivery miss', 'Draft an end-cap proposal'],
        },
        created_at: daysAgoISO(4),
      }),
    )
  }

  // pending invites
  const managerIds = profiles.filter((p) => p.role === 'manager').map((p) => p.id)
  const invites: DemoRow[] = []
  for (let i = 0; i < 14; i++) {
    const created = int(1, 42)
    const isMgr = i >= 12
    const z = pick(ZONES)
    const fn = pick(FIRST).toLowerCase()
    const ln = pick(LAST).toLowerCase()
    const resentRecently = chance(0.3)
    invites.push(
      row(`i-${i + 1}`, {
        org_id: 'o-acme',
        email: `${fn}.${ln}${int(1, 99)}@example.com`,
        role: isMgr ? 'manager' : 'rep',
        zone: z.name,
        invited_by: isMgr ? 'u-admin' : pick(managerIds),
        status: 'pending',
        created_at: daysAgoISO(created),
        last_sent_at: resentRecently ? daysAgoISO(int(0, 3)) : daysAgoISO(created),
        expires_at: daysAgoISO(created - 30), // created + 30 days
        accepted_at: null,
        accepted_user_id: null,
      }),
    )
  }

  return {
    organizations, profiles, invites, outlets, visits,
    stock_reports, merchandising_photos, voice_notes, complaints,
  }
}

// ---- persistence -------------------------------------------------------

let db: DemoDB = load()

function load(): DemoDB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as DemoDB
  } catch {
    /* ignore */
  }
  const fresh = seed()
  persist(fresh)
  return fresh
}

function persist(next: DemoDB = db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* quota / unavailable — demo still works in-memory for the session */
  }
}

export function demoTable(name: keyof DemoDB): DemoRow[] {
  return db[name]
}

export function demoPersist() {
  persist()
}

export function resetDemoStore() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
  db = seed()
  persist()
}

// ---- session -----------------------------------------------------------

export interface DemoSession {
  user: { id: string; email: string }
}

export function readDemoSession(): DemoSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as DemoSession) : null
  } catch {
    return null
  }
}

export function writeDemoSession(session: DemoSession | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}
