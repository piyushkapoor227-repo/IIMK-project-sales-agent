import type { Profile, UserRole } from '../../types/database.types'
import { getOrgs, getUsers } from './mockOrgStore'

// DEV-ONLY: set VITE_MOCK_AUTH=true in .env.local to log in without a real
// backend. Two credential sets:
//   admin / admin           -> signs in as the admin of the first demo org
//   superadmin / superadmin -> signs in to the cross-org Central Control view
// Remove this file and its usages once a real Supabase project is wired up.
export const MOCK_AUTH = import.meta.env.VITE_MOCK_AUTH === 'true'

export { MOCK_ORGS, MOCK_USERS } from './mockOrgData'

interface MockState {
  profile: Profile | null
  isPlatformAdmin: boolean
}

let state: MockState = { profile: null, isPlatformAdmin: false }
const listeners = new Set<() => void>()

function setState(next: MockState) {
  state = next
  listeners.forEach((l) => l())
}

export function subscribeMock(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getMockState() {
  return state
}

export function getMockProfile() {
  return state.profile
}

function syntheticUser(orgId: string, role: UserRole): Profile {
  const org = getOrgs().find((o) => o.id === orgId)
  const code = org?.org_code ?? 'ORG'
  return {
    id: `mock-${orgId}-${role}`,
    org_id: orgId,
    employee_code: `${code}-${role.toUpperCase()}-TEMP`,
    full_name: `Mock ${role.charAt(0).toUpperCase()}${role.slice(1)}`,
    role,
    manager_id: null,
    onboarding_status: 'active',
    deactivated_at: null,
    created_at: new Date().toISOString(),
  }
}

/** Signs in as the given role within the given org, seeded user if one exists, else a transient placeholder. */
export function mockEnterOrg(orgId: string, role: UserRole) {
  const existing = getUsers().find((u) => u.org_id === orgId && u.role === role)
  setState({ profile: existing ?? syntheticUser(orgId, role), isPlatformAdmin: false })
}

/** Accepts admin/admin (first org's admin) or superadmin/superadmin (central control). Rejects everything else. */
export function mockSignIn(identifier: string, password: string) {
  const id = identifier.trim().toLowerCase()
  if (id === 'superadmin' && password === 'superadmin') {
    setState({ profile: null, isPlatformAdmin: true })
    return
  }
  if (id === 'admin' && password === 'admin') {
    const firstOrg = getOrgs()[0]
    mockEnterOrg(firstOrg.id, 'admin')
    return
  }
  throw new Error('Invalid credentials. (Dev mock login accepts admin/admin or superadmin/superadmin.)')
}

/** Switches role within whichever org is currently active (falls back to the first org if none). */
export function mockSetRole(role: UserRole) {
  const orgId = state.profile?.org_id ?? getOrgs()[0].id
  mockEnterOrg(orgId, role)
}

export function mockEnterPlatformAdmin() {
  setState({ profile: null, isPlatformAdmin: true })
}

export function mockSignOut() {
  setState({ profile: null, isPlatformAdmin: false })
}
