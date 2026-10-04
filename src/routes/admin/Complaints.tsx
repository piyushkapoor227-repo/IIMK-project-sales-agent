import { useMemo, useState, useSyncExternalStore } from 'react'
import { AppShell } from '../../components/AppShell'
import { useAuth } from '../../lib/auth/AuthContext'
import { getComplaints, getUsers, subscribeOrgStore, updateComplaint } from '../../lib/auth/mockOrgStore'
import type { ComplaintStatus } from '../../lib/mock/mockOutletData'
import { adminNav } from './nav'

const TABS: { key: 'all' | ComplaintStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'resolved', label: 'Resolved' },
]

const PRIORITY_BADGE: Record<string, string> = {
  Low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  High: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  Critical: 'bg-red-600 text-white dark:bg-red-600',
}

export function Complaints() {
  const { organization } = useAuth()
  const allComplaints = useSyncExternalStore(subscribeOrgStore, getComplaints)
  const allUsers = useSyncExternalStore(subscribeOrgStore, getUsers)
  const [tab, setTab] = useState<'all' | ComplaintStatus>('all')
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const assignableUsers = useMemo(
    () => allUsers.filter((u) => u.org_id === organization?.id && (u.role === 'rep' || u.role === 'manager')),
    [allUsers, organization],
  )

  const orgComplaints = useMemo(
    () => allComplaints.filter((c) => c.org_id === organization?.id),
    [allComplaints, organization],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orgComplaints
      .filter((c) => tab === 'all' || c.status === tab)
      .filter((c) => priorityFilter === 'all' || c.priority === priorityFilter)
      .filter((c) => !q || c.outlet_name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [orgComplaints, tab, priorityFilter, search])

  function handleAssign(id: string, assignee: string) {
    updateComplaint(id, { assigned_to: assignee || null, status: assignee ? 'assigned' : 'open' })
  }

  function handleResolve(id: string) {
    updateComplaint(id, { status: 'resolved' })
  }

  return (
    <AppShell nav={adminNav}>
      <h2 className="mb-1 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
        Complaints <span className="text-base font-normal text-slate-500 dark:text-slate-400">({orgComplaints.length})</span>
      </h2>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        All retailer and service issues for {organization?.name} in one place.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              tab === t.key
                ? 'bg-brand text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search outlet or issue type"
          className="flex-1 rounded-control border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-ring dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-control border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        >
          <option value="all">All priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map((c) => (
          <div key={c.id} className="rounded-control border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-1 flex items-start justify-between gap-2">
              <p className="font-medium text-slate-900 dark:text-white">
                {c.type} <span className="font-normal text-slate-500 dark:text-slate-400">&middot; {c.outlet_name}</span>
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE[c.priority]}`}>{c.priority}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.status === 'resolved'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : c.status === 'assigned'
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {c.status}
                </span>
              </div>
            </div>
            <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">{c.description}</p>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              {new Date(c.created_at).toLocaleDateString()}
            </p>

            {c.status !== 'resolved' && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={c.assigned_to ?? ''}
                  onChange={(e) => handleAssign(c.id, e.target.value)}
                  className="rounded-control border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Unassigned</option>
                  {assignableUsers.map((u) => (
                    <option key={u.id} value={u.full_name ?? u.employee_code ?? u.id}>
                      {u.full_name ?? u.employee_code}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleResolve(c.id)}
                  className="rounded-control border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Mark resolved
                </button>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No complaints match these filters.</p>}
      </div>
    </AppShell>
  )
}
