// Offline outbox for the rep visit-capture flow. Text-only operations (stock
// rows, complaints, voice notes, visit notes, submit) are queued in
// localStorage while offline and replayed on reconnect. Photos are not queued.
// Author: Piyush Kapoor.

export type OpKind = 'stock' | 'complaint' | 'voice' | 'notes' | 'submit'

export interface QueueOp {
  id: string
  kind: OpKind
  visitId: string
  orgId: string
  payload: Record<string, unknown>
  createdAt: string
}

const KEY = 'offline:visit-queue:v1'
const listeners = new Set<() => void>()

function read(): QueueOp[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as QueueOp[]) : []
  } catch {
    return []
  }
}

function write(ops: QueueOp[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ops))
  } catch {
    /* quota / unavailable */
  }
  listeners.forEach((l) => l())
}

export function enqueue(op: Omit<QueueOp, 'id' | 'createdAt'>): QueueOp {
  const full: QueueOp = { ...op, id: `q-${crypto.randomUUID()}`, createdAt: new Date().toISOString() }
  write([...read(), full])
  return full
}

export function removeOp(id: string) {
  write(read().filter((o) => o.id !== id))
}

export function allOps(): QueueOp[] {
  return read()
}

export function opsForVisit(visitId: string, kind?: OpKind): QueueOp[] {
  return read().filter((o) => o.visitId === visitId && (!kind || o.kind === kind))
}

export function queueCount(): number {
  return read().length
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function clearQueue() {
  write([])
}

// ---- projection into the row shapes the visit queries return -------------

export function pendingStockRows(visitId: string) {
  return opsForVisit(visitId, 'stock').map((o) => ({
    id: o.id,
    org_id: o.orgId,
    visit_id: visitId,
    sku: o.payload.sku,
    quantity: o.payload.quantity,
    price: o.payload.price,
    competitor_price: o.payload.competitor_price,
    photo_url: null,
    ai_extracted: o.payload.ai_extracted ?? null,
    created_at: o.createdAt,
    _pending: true,
  }))
}

export function pendingComplaintRows(visitId: string) {
  return opsForVisit(visitId, 'complaint').map((o) => ({
    id: o.id,
    org_id: o.orgId,
    visit_id: visitId,
    category: o.payload.category || null,
    description: o.payload.description,
    status: 'open',
    assigned_to: null,
    resolved_at: null,
    created_at: o.createdAt,
    _pending: true,
  }))
}

export function pendingVoiceRows(visitId: string) {
  return opsForVisit(visitId, 'voice').map((o) => ({
    id: o.id,
    org_id: o.orgId,
    visit_id: visitId,
    audio_transcript: o.payload.transcript,
    structured_data: o.payload.structured ?? null,
    created_at: o.createdAt,
    _pending: true,
  }))
}

/** Latest queued notes value + whether a submit is queued, for one visit. */
export function pendingVisitPatch(visitId: string): { notes?: string; submitted?: boolean } {
  const ops = opsForVisit(visitId)
  const patch: { notes?: string; submitted?: boolean } = {}
  for (const o of ops) {
    if (o.kind === 'notes') patch.notes = String(o.payload.notes ?? '')
    if (o.kind === 'submit') patch.submitted = true
  }
  return patch
}
