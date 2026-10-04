import type { Organization, Profile, UserRole } from '../../types/database.types'
import { MOCK_ORGS as SEED_ORGS, MOCK_USERS as SEED_USERS } from './mockOrgData'
import { SEED_OUTLETS, SEED_COMPLAINTS, type Outlet, type Complaint, type ComplaintStatus } from '../mock/mockOutletData'

// DEV-ONLY: mutable in-memory store wrapping the seeded mock orgs/users/outlets/
// complaints so the UI can create and update records during a session. Nothing
// here persists past a page reload, and it is only used when VITE_MOCK_AUTH=true.

let orgs: Organization[] = [...SEED_ORGS]
let users: Profile[] = [...SEED_USERS]
let outlets: Outlet[] = [...SEED_OUTLETS]
let complaints: Complaint[] = [...SEED_COMPLAINTS]
let orgSeq = orgs.length
let userSeq = users.length
let outletSeq = outlets.length
let complaintSeq = complaints.length

const listeners = new Set<() => void>()
function notify() {
  listeners.forEach((l) => l())
}

export function subscribeOrgStore(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getOrgs() {
  return orgs
}

export function getUsers() {
  return users
}

export function getOutlets() {
  return outlets
}

export function getComplaints() {
  return complaints
}

export function addOrganization(input: { name: string; org_code: string }): Organization {
  orgSeq += 1
  const org: Organization = {
    id: `org-new-${orgSeq}`,
    name: input.name,
    org_code: input.org_code.toUpperCase(),
    logo_url: null,
    created_at: new Date().toISOString(),
    created_by: null,
  }
  orgs = [...orgs, org]
  notify()
  return org
}

export function updateOrgLogo(orgId: string, logoUrl: string | null): Organization | undefined {
  let updated: Organization | undefined
  orgs = orgs.map((o) => {
    if (o.id !== orgId) return o
    updated = { ...o, logo_url: logoUrl }
    return updated
  })
  notify()
  return updated
}

export function updateOrgName(orgId: string, name: string): Organization | undefined {
  let updated: Organization | undefined
  orgs = orgs.map((o) => {
    if (o.id !== orgId) return o
    updated = { ...o, name }
    return updated
  })
  notify()
  return updated
}

export function addUser(input: {
  org_id: string
  full_name: string
  employee_code: string
  role: UserRole
}): Profile {
  userSeq += 1
  const user: Profile = {
    id: `user-new-${userSeq}`,
    org_id: input.org_id,
    employee_code: input.employee_code,
    full_name: input.full_name,
    role: input.role,
    manager_id: null,
    onboarding_status: 'active',
    deactivated_at: null,
    created_at: new Date().toISOString(),
  }
  users = [...users, user]
  notify()
  return user
}

export function addOutlet(input: {
  org_id: string
  name: string
  territory: string
  distributor: string
  address: string
  photo_url?: string | null
}): Outlet {
  outletSeq += 1
  const outlet: Outlet = {
    id: `outlet-new-${outletSeq}`,
    org_id: input.org_id,
    name: input.name,
    territory: input.territory,
    distributor: input.distributor,
    address: input.address,
    photo_url: input.photo_url ?? null,
    last_visited_by: null,
    last_visited_at: null,
    visited_this_week: false,
  }
  outlets = [...outlets, outlet]
  notify()
  return outlet
}

export function addComplaint(input: {
  org_id: string
  outlet_name: string
  type: string
  priority: Complaint['priority']
  description: string
}): Complaint {
  complaintSeq += 1
  const complaint: Complaint = {
    id: `complaint-new-${complaintSeq}`,
    org_id: input.org_id,
    outlet_name: input.outlet_name,
    type: input.type,
    priority: input.priority,
    status: 'open',
    description: input.description,
    assigned_to: null,
    created_at: new Date().toISOString(),
  }
  complaints = [...complaints, complaint]
  notify()
  return complaint
}

export function updateComplaint(
  complaintId: string,
  changes: { status?: ComplaintStatus; assigned_to?: string | null },
): Complaint | undefined {
  let updated: Complaint | undefined
  complaints = complaints.map((c) => {
    if (c.id !== complaintId) return c
    updated = { ...c, ...changes }
    return updated
  })
  notify()
  return updated
}
