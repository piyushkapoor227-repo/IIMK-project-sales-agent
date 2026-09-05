// Small relative-time helpers for the user directory. Author: Piyush Kapoor.

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

export function timeAgo(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < MIN) return 'Just now'
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m ago`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`
  const days = Math.floor(diff / DAY)
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export function shortDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export interface Expiry {
  label: string
  expired: boolean
  soon: boolean
}

export function expiryStatus(iso: string): Expiry {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return { label: 'Expired', expired: true, soon: false }
  const days = Math.floor(diff / DAY)
  if (days < 1) return { label: `${Math.max(1, Math.floor(diff / HOUR))}h left`, expired: false, soon: true }
  return { label: `${days}d left`, expired: false, soon: days <= 5 }
}
