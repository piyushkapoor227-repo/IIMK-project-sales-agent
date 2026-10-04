import { useState } from 'react'
import type { Organization, UserRole } from '../types/database.types'

interface DevModeBannerProps {
  role?: UserRole
  onSetRole?: (role: UserRole) => void
  orgs?: Organization[]
  currentOrgId?: string
  onSwitchOrg?: (orgId: string, role: UserRole) => void
  onEnterPlatformAdmin?: () => void
}

const STORAGE_KEY = 'dev-banner-collapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

/** Shared amber dev-mode chrome for AppShell and the Central Control dashboard. */
export function DevModeBanner({ role, onSetRole, orgs, currentOrgId, onSwitchOrg, onEnterPlatformAdmin }: DevModeBannerProps) {
  const [collapsed, setCollapsed] = useState(readCollapsed)

  function toggle() {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      // ignore write failures
    }
  }

  if (collapsed) {
    return (
      <button
        onClick={toggle}
        className="flex w-full items-center justify-center gap-1 bg-amber-400 px-4 py-1 text-xs font-semibold text-amber-950 hover:bg-amber-300"
      >
        Demo mode &mdash; click to show dev controls <span aria-hidden="true">&#x25BE;</span>
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-400 px-4 py-1.5 text-xs font-semibold text-amber-950">
      <span className="flex flex-wrap items-center gap-2">
        {orgs && orgs.length > 1 && onSwitchOrg && (
          <select
            value={currentOrgId ?? ''}
            onChange={(e) => onSwitchOrg(e.target.value, role ?? 'admin')}
            className="rounded bg-amber-300 px-2 py-0.5 font-semibold text-amber-950 hover:bg-amber-200"
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}
        <span className="flex gap-1">
          {(['admin', 'manager', 'rep'] as const).map((r) => (
            <button
              key={r}
              onClick={() => onSetRole?.(r)}
              className={`rounded px-2 py-0.5 ${role === r ? 'bg-amber-950 text-amber-50' : 'bg-amber-300 hover:bg-amber-200'}`}
            >
              view as {r}
            </button>
          ))}
          {onEnterPlatformAdmin && (
            <button onClick={onEnterPlatformAdmin} className="rounded bg-amber-300 px-2 py-0.5 hover:bg-amber-200">
              central control
            </button>
          )}
        </span>
      </span>
      <span className="flex items-center gap-2">
        <span className="hidden sm:inline">For demo purposes</span>
        <button
          onClick={toggle}
          title="Hide dev controls"
          aria-label="Hide dev controls"
          className="rounded bg-amber-300 px-1.5 py-0.5 hover:bg-amber-200"
        >
          <span aria-hidden="true">&#x25BE;</span>
        </button>
      </span>
    </div>
  )
}
