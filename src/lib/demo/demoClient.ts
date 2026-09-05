// A minimal stand-in for the supabase-js client, backed by the in-memory demo
// store. Implements only the surface this app uses. Author: Piyush Kapoor.
import {
  DEMO_CREDENTIALS,
  demoPersist,
  demoTable,
  readDemoSession,
  writeDemoSession,
  type DemoRow,
  type DemoSession,
} from './store'

type TableName = Parameters<typeof demoTable>[0]

interface Result<T> {
  data: T
  error: { message: string } | null
}

const EMBED_LOCAL_KEY: Record<string, string> = {
  outlet: 'outlet_id',
  rep: 'rep_id',
  assignee: 'assigned_to',
  visit: 'visit_id',
}

function splitTopLevel(cols: string): string[] {
  const out: string[] = []
  let depth = 0
  let buf = ''
  for (const ch of cols) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      out.push(buf.trim())
      buf = ''
    } else {
      buf += ch
    }
  }
  if (buf.trim()) out.push(buf.trim())
  return out
}

function project(row: DemoRow, cols: string): DemoRow {
  if (!cols || cols === '*') return { ...row }
  const segments = splitTopLevel(cols)
  const result: Record<string, unknown> = {}
  for (const seg of segments) {
    if (seg === '*') {
      Object.assign(result, row)
      continue
    }
    const embed = seg.match(/^(?:(\w+):)?(\w+)\(([\s\S]*)\)$/)
    if (embed) {
      const alias = embed[1] || embed[2]
      const table = embed[2] as TableName
      const inner = embed[3]
      const localKey = EMBED_LOCAL_KEY[alias] ?? `${table.replace(/s$/, '')}_id`
      const fk = row[localKey] as string | null
      const related = fk ? demoTable(table).find((r) => r.id === fk) : null
      result[alias] = related ? project(related, inner) : null
    } else {
      result[seg] = row[seg]
    }
  }
  return result as DemoRow
}

class DemoQuery implements PromiseLike<Result<unknown>> {
  private filters: [string, unknown][] = []
  private orders: { col: string; ascending: boolean }[] = []
  private limitN: number | null = null
  private cols = '*'
  private singleMode: 'none' | 'one' | 'maybe' = 'none'
  private table: TableName
  private op: 'select' | 'insert' | 'update' | 'delete'
  private payload?: Record<string, unknown>
  private returnRows: boolean

  constructor(
    table: TableName,
    op: 'select' | 'insert' | 'update' | 'delete',
    payload?: Record<string, unknown>,
    returnRows = false,
  ) {
    this.table = table
    this.op = op
    this.payload = payload
    this.returnRows = returnRows
  }

  select(cols = '*') {
    this.cols = cols
    if (this.op !== 'select') this.returnRows = true
    return this
  }
  eq(col: string, val: unknown) {
    this.filters.push([col, val])
    return this
  }
  neq(col: string, val: unknown) {
    this.filters.push([`!${col}`, val])
    return this
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push({ col, ascending: opts?.ascending ?? true })
    return this
  }
  limit(n: number) {
    this.limitN = n
    return this
  }
  single() {
    this.singleMode = 'one'
    return this
  }
  maybeSingle() {
    this.singleMode = 'maybe'
    return this
  }

  private matches(r: DemoRow): boolean {
    return this.filters.every(([col, val]) => {
      if (col.startsWith('!')) return String(r[col.slice(1)]) !== String(val)
      return String(r[col]) === String(val)
    })
  }

  private run(): Result<unknown> {
    const rows = demoTable(this.table)

    if (this.op === 'insert') {
      const record: DemoRow = {
        id: (this.payload?.id as string) || crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...this.payload,
      }
      rows.push(record)
      demoPersist()
      if (this.returnRows) return finalize([record], this.cols, this.singleMode || 'one')
      return { data: null, error: null }
    }

    if (this.op === 'update') {
      const hit = rows.filter((r) => this.matches(r))
      hit.forEach((r) => Object.assign(r, this.payload))
      demoPersist()
      if (this.returnRows) return finalize(hit, this.cols, this.singleMode)
      return { data: null, error: null }
    }

    if (this.op === 'delete') {
      for (let i = rows.length - 1; i >= 0; i--) {
        if (this.matches(rows[i])) rows.splice(i, 1)
      }
      demoPersist()
      return { data: null, error: null }
    }

    // select
    let out = rows.filter((r) => this.matches(r))
    for (const o of [...this.orders].reverse()) {
      out = [...out].sort((a, b) => {
        const av = a[o.col] as string | number
        const bv = b[o.col] as string | number
        if (av === bv) return 0
        const cmp = av < bv ? -1 : 1
        return o.ascending ? cmp : -cmp
      })
    }
    if (this.limitN != null) out = out.slice(0, this.limitN)
    return finalize(out, this.cols, this.singleMode)
  }

  then<TResult1 = Result<unknown>, TResult2 = never>(
    onfulfilled?: ((value: Result<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    try {
      return Promise.resolve(this.run()).then(onfulfilled, onrejected)
    } catch (err) {
      return Promise.resolve(onrejected ? onrejected(err) : Promise.reject(err))
    }
  }
}

function finalize(
  rows: DemoRow[],
  cols: string,
  mode: 'none' | 'one' | 'maybe',
): Result<unknown> {
  const projected = rows.map((r) => project(r, cols))
  if (mode === 'one') {
    if (projected.length !== 1) return { data: null, error: { message: 'Row not found' } }
    return { data: projected[0], error: null }
  }
  if (mode === 'maybe') {
    return { data: projected[0] ?? null, error: null }
  }
  return { data: projected, error: null }
}

// ---- auth --------------------------------------------------------------

type AuthListener = (event: string, session: unknown) => void

function makeSession(userId: string) {
  const profile = demoTable('profiles').find((p) => p.id === userId)
  const email = `${(profile?.employee_code as string) ?? 'user'}@demo.local`
  const session: DemoSession & { access_token: string; refresh_token: string } = {
    user: { id: userId, email },
    access_token: `demo.${userId}`,
    refresh_token: `demo.${userId}`,
  }
  return session
}

const listeners: AuthListener[] = []

function emit(event: string, session: unknown) {
  listeners.forEach((l) => l(event, session))
}

function resolveUsername(username: string, password: string): string | null {
  const key = username.trim().toLowerCase()
  const entry = DEMO_CREDENTIALS[key]
  if (entry && entry.password === password) return entry.userId
  return null
}

const auth = {
  async getSession() {
    const s = readDemoSession()
    return { data: { session: s ? makeSession(s.user.id) : null }, error: null }
  },
  async getUser() {
    const s = readDemoSession()
    return { data: { user: s ? makeSession(s.user.id).user : null }, error: null }
  },
  onAuthStateChange(cb: AuthListener) {
    listeners.push(cb)
    return { data: { subscription: { unsubscribe: () => {
      const i = listeners.indexOf(cb)
      if (i >= 0) listeners.splice(i, 1)
    } } } }
  },
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const userId = resolveUsername(email.split('@')[0], password)
    if (!userId) return { data: { session: null, user: null }, error: { message: 'Invalid demo credentials. Try admin / admin.' } }
    const session = makeSession(userId)
    writeDemoSession({ user: session.user })
    emit('SIGNED_IN', session)
    return { data: { session, user: session.user }, error: null }
  },
  async signUp() {
    return { data: { session: null, user: null }, error: { message: 'Sign-up is disabled in demo mode — use admin / admin, manager / manager, or rep / rep.' } }
  },
  async signInWithOAuth() {
    return { data: { provider: null, url: null }, error: { message: 'Social login is disabled in demo mode.' } }
  },
  async setSession({ access_token }: { access_token: string }) {
    const userId = access_token.replace(/^demo\./, '')
    if (!demoTable('profiles').some((p) => p.id === userId)) {
      return { data: { session: null }, error: { message: 'Unknown demo session.' } }
    }
    const session = makeSession(userId)
    writeDemoSession({ user: session.user })
    emit('SIGNED_IN', session)
    return { data: { session, user: session.user }, error: null }
  },
  async updateUser() {
    return { data: { user: null }, error: null }
  },
  async signOut() {
    writeDemoSession(null)
    emit('SIGNED_OUT', null)
    return { error: null }
  },
}

// ---- storage ----------------------------------------------------------

const objectUrls = new Map<string, string>()

const PLACEHOLDER_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><rect width="100%" height="100%" fill="#1e293b"/><g fill="#475569"><rect x="24" y="40" width="120" height="240"/><rect x="168" y="40" width="120" height="240"/><rect x="312" y="40" width="120" height="240"/></g><text x="50%" y="305" fill="#94a3b8" font-family="sans-serif" font-size="14" text-anchor="middle">demo shelf photo</text></svg>`,
  )

function storageFrom() {
  return {
    async upload(path: string, file: File) {
      try {
        objectUrls.set(path, URL.createObjectURL(file))
      } catch {
        objectUrls.set(path, PLACEHOLDER_IMG)
      }
      return { data: { path }, error: null }
    },
    getPublicUrl(path: string) {
      return { data: { publicUrl: objectUrls.get(path) ?? PLACEHOLDER_IMG } }
    },
    async createSignedUrl(path: string) {
      return { data: { signedUrl: objectUrls.get(path) ?? PLACEHOLDER_IMG }, error: null }
    },
  }
}

// ---- rpc ------------------------------------------------------------------

async function rpc(name: string, args: Record<string, unknown>): Promise<Result<unknown>> {
  if (name === 'create_organization') {
    const session = readDemoSession()
    if (!session) return { data: null, error: { message: 'Not authenticated.' } }
    const orgId = crypto.randomUUID()
    demoTable('organizations').push({
      id: orgId,
      name: String(args.p_name ?? 'New org'),
      org_code: String(args.p_org_code ?? 'ORG'),
      logo_url: null,
      created_at: new Date().toISOString(),
      created_by: session.user.id,
    })
    const profile = demoTable('profiles').find((p) => p.id === session.user.id)
    if (profile) Object.assign(profile, { org_id: orgId, role: 'admin', onboarding_status: 'active' })
    demoPersist()
    return { data: orgId, error: null }
  }
  return { data: null, error: { message: `Unknown demo RPC: ${name}` } }
}

export const demoClient = {
  auth,
  from(table: TableName) {
    return {
      select: (cols?: string) => new DemoQuery(table, 'select').select(cols ?? '*'),
      insert: (payload: Record<string, unknown>) => new DemoQuery(table, 'insert', payload),
      update: (payload: Record<string, unknown>) => new DemoQuery(table, 'update', payload),
      delete: () => new DemoQuery(table, 'delete'),
    }
  },
  rpc,
  storage: { from: storageFrom },
}
