import { useMemo, useState, type FormEvent, useSyncExternalStore } from 'react'
import { useAuth } from '../../lib/auth/AuthContext'
import { addOrganization, addUser, getOrgs, getUsers, subscribeOrgStore } from '../../lib/auth/mockOrgStore'
import { AppShell } from '../../components/AppShell'
import { FormField } from '../../components/FormField'
import { Button } from '../../components/Button'
import { DataTable, type DataTableColumn } from '../../components/DataTable'
import type { Organization, Profile, UserRole } from '../../types/database.types'

const ROLE_LABEL: Record<string, string> = { admin: 'Admins', manager: 'Managers', rep: 'Reps' }

interface OrgStat {
  org: Organization
  total: number
  admins: number
  managers: number
  reps: number
}

const orgColumns: DataTableColumn<OrgStat>[] = [
  { key: 'name', label: 'Organization', render: (s) => s.org.name },
  { key: 'code', label: 'Code', render: (s) => s.org.org_code },
  { key: 'admins', label: 'Admins' },
  { key: 'managers', label: 'Managers' },
  { key: 'reps', label: 'Reps' },
  { key: 'total', label: 'Total' },
]

const peopleColumns: DataTableColumn<Profile>[] = [
  { key: 'full_name', label: 'Name', render: (u) => u.full_name ?? u.id },
  { key: 'employee_code', label: 'Employee Code' },
  { key: 'role', label: 'Role', render: (u) => ROLE_LABEL[u.role] ?? u.role },
]

export function PlatformDashboard() {
  const { enterOrg } = useAuth()
  const orgs = useSyncExternalStore(subscribeOrgStore, getOrgs)
  const users = useSyncExternalStore(subscribeOrgStore, getUsers)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [showNewOrgForm, setShowNewOrgForm] = useState(false)
  const [showNewPersonForm, setShowNewPersonForm] = useState(false)

  const orgStats = useMemo(
    () =>
      orgs.map((org) => {
        const orgUsers = users.filter((u) => u.org_id === org.id)
        return {
          org,
          total: orgUsers.length,
          admins: orgUsers.filter((u) => u.role === 'admin').length,
          managers: orgUsers.filter((u) => u.role === 'manager').length,
          reps: orgUsers.filter((u) => u.role === 'rep').length,
        }
      }),
    [orgs, users],
  )

  const totals = useMemo(
    () => ({
      orgs: orgs.length,
      users: users.length,
      admins: users.filter((u) => u.role === 'admin').length,
      managers: users.filter((u) => u.role === 'manager').length,
      reps: users.filter((u) => u.role === 'rep').length,
    }),
    [orgs, users],
  )

  const selectedOrg = orgStats.find((o) => o.org.id === selectedOrgId)
  const selectedUsers = selectedOrgId ? users.filter((u) => u.org_id === selectedOrgId) : []

  function handleCreateOrg(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    const code = String(form.get('code') ?? '').trim()
    if (!name || !code) return
    const org = addOrganization({ name, org_code: code })
    setShowNewOrgForm(false)
    setSelectedOrgId(org.id)
    e.currentTarget.reset()
  }

  function handleCreatePerson(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedOrgId) return
    const form = new FormData(e.currentTarget)
    const fullName = String(form.get('full_name') ?? '').trim()
    const employeeCode = String(form.get('employee_code') ?? '').trim()
    const role = String(form.get('role') ?? 'rep') as UserRole
    if (!fullName || !employeeCode) return
    addUser({ org_id: selectedOrgId, full_name: fullName, employee_code: employeeCode, role })
    setShowNewPersonForm(false)
    e.currentTarget.reset()
  }

  return (
    <AppShell nav={[]} maxWidth="max-w-5xl" title="Central Control" avatarLabel="C" subtitle="Signed in as Platform Super Admin">
        <h1 className="mb-4 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Central Control
        </h1>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Organizations" value={totals.orgs} />
          <StatCard label="Total People" value={totals.users} />
          <StatCard label="Admins" value={totals.admins} />
          <StatCard label="Managers" value={totals.managers} />
          <StatCard label="Reps" value={totals.reps} />
        </div>

        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">All organizations</h2>
          <Button variant="primary" className="w-auto" onClick={() => setShowNewOrgForm((v) => !v)}>
            {showNewOrgForm ? 'Cancel' : '+ New organization'}
          </Button>
        </div>

        {showNewOrgForm && (
          <form
            onSubmit={handleCreateOrg}
            className="mb-4 flex flex-col gap-2 rounded-control border border-slate-200 bg-white p-3 sm:flex-row sm:items-end dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex-1">
              <FormField
                label="Organization name"
                id="new_org_name"
                name="name"
                required
                placeholder="e.g. Horizon Retail Group"
              />
            </div>
            <div className="sm:w-40">
              <FormField label="Org code" id="new_org_code" name="code" required placeholder="e.g. HORIZON" />
            </div>
            <Button type="submit" variant="primary" className="w-auto">
              Create
            </Button>
          </form>
        )}

        <div className="mb-6">
          <DataTable
            columns={orgColumns}
            rows={orgStats}
            getRowKey={(row) => row.org.id}
            onRowClick={(row) => setSelectedOrgId(row.org.id === selectedOrgId ? null : row.org.id)}
            isRowActive={(row) => row.org.id === selectedOrgId}
          />
        </div>

        {selectedOrg && (
          <>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                People in {selectedOrg.org.name} ({selectedUsers.length})
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" className="w-auto" onClick={() => setShowNewPersonForm((v) => !v)}>
                  {showNewPersonForm ? 'Cancel' : '+ New person'}
                </Button>
                <button
                  onClick={() => setSelectedOrgId(null)}
                  className="text-xs font-medium text-slate-500 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  &larr; back to all organizations
                </button>
              </div>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400">Switch into this org as:</span>
              {(['admin', 'manager', 'rep'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => enterOrg?.(selectedOrg.org.id, r)}
                  className="rounded bg-slate-200 px-2 py-1 font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {r}
                </button>
              ))}
            </div>

            {showNewPersonForm && (
              <form
                onSubmit={handleCreatePerson}
                className="mb-4 flex flex-col gap-2 rounded-control border border-slate-200 bg-white p-3 sm:flex-row sm:items-end dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex-1">
                  <FormField label="Full name" id="new_person_name" name="full_name" required placeholder="e.g. Rohan Verma" />
                </div>
                <div className="sm:w-40">
                  <FormField
                    label="Employee code"
                    id="new_person_code"
                    name="employee_code"
                    required
                    placeholder="e.g. HORIZON-REP-001"
                  />
                </div>
                <div className="text-left sm:w-36">
                  <label htmlFor="new_person_role" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200">
                    Role
                  </label>
                  <select
                    id="new_person_role"
                    name="role"
                    defaultValue="rep"
                    className="w-full rounded-control border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-ring dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="rep">Field rep</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <Button type="submit" variant="primary" className="w-auto">
                  Add
                </Button>
              </form>
            )}

            <div className="mb-6 max-h-96 overflow-y-auto">
              <DataTable columns={peopleColumns} rows={selectedUsers} getRowKey={(u) => u.id} />
            </div>
          </>
        )}
    </AppShell>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-control border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xl font-semibold text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}
