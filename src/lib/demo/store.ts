// In-memory demo backend. Enabled with VITE_DEMO_MODE=true so the app can be
// explored end-to-end without a Supabase project. Data is seeded once and then
// persisted to localStorage (this browser only). Author: Piyush Kapoor.

export const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

const STORAGE_KEY = 'demo:db:v1'
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

// Demo users — username === employee_code, password shown here.
export const DEMO_CREDENTIALS: Record<string, { password: string; userId: string }> = {
  admin: { password: 'admin', userId: 'u-admin' },
  manager: { password: 'manager', userId: 'u-mgr' },
  rep: { password: 'rep', userId: 'u-rep' },
  rep2: { password: 'rep2', userId: 'u-rep2' },
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}
function dateAgo(n: number): string {
  return daysAgo(n).slice(0, 10)
}

function seed(): DemoDB {
  return {
    organizations: [
      {
        id: 'o-acme',
        name: 'Acme Distribution',
        org_code: 'ACME',
        logo_url: null,
        created_at: daysAgo(120),
        created_by: 'u-admin',
      },
    ],
    profiles: [
      row('u-admin', {
        org_id: 'o-acme',
        employee_code: 'admin',
        full_name: 'Aditya Rao',
        role: 'admin',
        manager_id: null,
        onboarding_status: 'active',
        deactivated_at: null,
        created_at: daysAgo(120),
      }),
      row('u-mgr', {
        org_id: 'o-acme',
        employee_code: 'manager',
        full_name: 'Meera Nair',
        role: 'manager',
        manager_id: null,
        onboarding_status: 'active',
        deactivated_at: null,
        created_at: daysAgo(110),
      }),
      row('u-rep', {
        org_id: 'o-acme',
        employee_code: 'rep',
        full_name: 'Ravi Kumar',
        role: 'rep',
        manager_id: 'u-mgr',
        onboarding_status: 'active',
        deactivated_at: null,
        created_at: daysAgo(90),
      }),
      row('u-rep2', {
        org_id: 'o-acme',
        employee_code: 'rep2',
        full_name: 'Sana Shaikh',
        role: 'rep',
        manager_id: 'u-mgr',
        onboarding_status: 'active',
        deactivated_at: null,
        created_at: daysAgo(80),
      }),
    ],
    invites: [
      row('i-1', {
        org_id: 'o-acme',
        email: 'nikhil.desai@example.com',
        role: 'rep',
        invited_by: 'u-admin',
        status: 'pending',
        expires_at: daysAgo(-5),
        accepted_at: null,
        accepted_user_id: null,
        created_at: daysAgo(2),
      }),
    ],
    outlets: [
      outlet('ot-1', 'MoreRetail — Andheri', 'Mumbai West', 'Sunrise Distributors'),
      outlet('ot-2', 'DMart — Powai', 'Mumbai East', 'Sunrise Distributors'),
      outlet('ot-3', 'Reliance Fresh — Bandra', 'Mumbai West', 'Metro Supply Co'),
      outlet('ot-4', 'Local Kirana — Vile Parle', 'Mumbai West', 'Metro Supply Co'),
      outlet('ot-5', 'Star Bazaar — Thane', 'Thane', 'Sunrise Distributors'),
    ],
    visits: [
      visit('v-1', 'ot-1', 'u-rep', 1, 'submitted'),
      visit('v-2', 'ot-2', 'u-rep', 2, 'submitted'),
      visit('v-3', 'ot-3', 'u-rep', 3, 'submitted'),
      visit('v-4', 'ot-4', 'u-rep', 6, 'submitted'),
      visit('v-5', 'ot-1', 'u-rep', 0, 'draft'),
      visit('v-6', 'ot-5', 'u-rep2', 1, 'submitted'),
      visit('v-7', 'ot-2', 'u-rep2', 4, 'submitted'),
    ],
    stock_reports: [
      stock('sr-1', 'v-1', 'Acme Cola 500ml', 18, 35, 34),
      stock('sr-2', 'v-1', 'Acme Chips 50g', 6, 20, 20),
      stock('sr-3', 'v-2', 'Acme Cola 1L', 0, 65, 60),
      stock('sr-4', 'v-2', 'Acme Juice 200ml', 12, 25, 27),
      stock('sr-5', 'v-3', 'Acme Cola 500ml', 24, 35, 33),
      stock('sr-6', 'v-3', 'Acme Water 1L', 30, 20, 19),
      stock('sr-7', 'v-4', 'Acme Chips 50g', 9, 20, 18),
      stock('sr-8', 'v-6', 'Acme Cola 1L', 15, 65, 62),
      stock('sr-9', 'v-6', 'Acme Juice 200ml', 8, 25, 25),
      stock('sr-10', 'v-7', 'Acme Cola 500ml', 20, 35, 35),
    ],
    merchandising_photos: [
      row('mp-1', {
        org_id: 'o-acme',
        visit_id: 'v-1',
        photo_url: 'demo-seed/shelf-1.svg',
        compliance_score: 72,
        ai_analysis: {
          compliance_score: 72,
          summary:
            'Strong cola shelf share at eye level; chips facings below target and one price tag missing.',
          detected_skus: [
            { name: 'Acme Cola 500ml', facings: 6 },
            { name: 'Acme Chips 50g', facings: 2 },
          ],
          issues: [
            'Chips facings below the 4-facing target',
            'Missing price tag on Juice 200ml',
            'Competitor stock encroaching on the lower shelf',
          ],
        },
        created_at: daysAgo(1),
      }),
    ],
    voice_notes: [
      row('vn-1', {
        org_id: 'o-acme',
        visit_id: 'v-2',
        audio_transcript:
          'Spoke to the store manager. Cola 1L has been out of stock since Monday because the distributor missed the delivery. Competitor is running ten percent off on their cola this week. Owner wants a gondola end-cap display next month.',
        structured_data: {
          summary:
            'Cola 1L stocked out from a missed distributor delivery; competitor promo live; retailer wants an end-cap.',
          stock_mentions: [{ sku: 'Acme Cola 1L', quantity: 0, price: null }],
          competitor_activity: ['Competitor cola at 10% off this week'],
          complaints: ['Acme Cola 1L out of stock — missed distributor delivery'],
          action_items: [
            'Escalate the missed delivery to the distributor',
            'Propose a gondola end-cap for next month',
          ],
        },
        created_at: daysAgo(2),
      }),
    ],
    complaints: [
      complaint('c-1', 'v-2', 'Supply delay', 'Distributor missed the weekly delivery; store was out of Cola 1L for three days.', 'open', null, null),
      complaint('c-2', 'v-3', 'Damaged stock', 'Two cases of Juice 200ml arrived leaking and were rejected by the store.', 'assigned', 'u-rep', null),
      complaint('c-3', 'v-4', 'Scheme dispute', "Retailer says last month's 5% scheme was never credited to their account.", 'open', null, null),
      complaint('c-4', 'v-6', 'Planogram', 'Competitor is occupying our contracted eye-level shelf space.', 'resolved', 'u-mgr', daysAgo(1)),
    ],
  }

  function row(id: string, rest: Record<string, unknown>): DemoRow {
    return { id, ...rest }
  }
  function outlet(id: string, name: string, territory: string, distributor_name: string): DemoRow {
    return row(id, {
      org_id: 'o-acme',
      name,
      address: null,
      territory,
      distributor_name,
      gps_lat: null,
      gps_lng: null,
      created_at: daysAgo(60),
    })
  }
  function visit(id: string, outlet_id: string, rep_id: string, ago: number, status: string): DemoRow {
    return row(id, {
      org_id: 'o-acme',
      outlet_id,
      rep_id,
      visit_date: dateAgo(ago),
      status,
      gps_checkin_lat: 19.11 + Math.random() * 0.1,
      gps_checkin_lng: 72.86 + Math.random() * 0.1,
      notes: status === 'submitted' ? 'Visit completed; see captured stock and photos.' : null,
      submitted_at: status === 'submitted' ? daysAgo(ago) : null,
      created_at: daysAgo(ago),
    })
  }
  function stock(
    id: string,
    visit_id: string,
    sku: string,
    quantity: number,
    price: number,
    competitor_price: number,
  ): DemoRow {
    return row(id, {
      org_id: 'o-acme',
      visit_id,
      sku,
      quantity,
      price,
      competitor_price,
      photo_url: null,
      ai_extracted: null,
      created_at: daysAgo(3),
    })
  }
  function complaint(
    id: string,
    visit_id: string,
    category: string,
    description: string,
    status: string,
    assigned_to: string | null,
    resolved_at: string | null,
  ): DemoRow {
    return row(id, {
      org_id: 'o-acme',
      visit_id,
      category,
      description,
      status,
      assigned_to,
      resolved_at,
      created_at: daysAgo(4),
    })
  }
}

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
    /* ignore */
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
