// Complaint triage board for managers / admins: assign to a team member,
// mark resolved. Accepts a ?status= filter (used by the dashboard donut
// drill-down). Author: Piyush Kapoor.
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Badge, Card, EmptyState, SectionTitle } from '../../components/primitives'
import { Skeleton } from '../../components/Skeleton'
import { useToast } from '../../components/Toast'
import { useAssignComplaint, useComplaints, useResolveComplaint } from '../../lib/queries/useTeam'
import { useOrgMembers } from '../../lib/queries/useOrgMembers'
import type { ComplaintStatus } from '../../types/database.types'

const STATUSES: (ComplaintStatus | 'all')[] = ['all', 'open', 'assigned', 'resolved']

export function ComplaintsBoard({ nav }: { nav: { to: string; label: string }[] }) {
  const [params, setParams] = useSearchParams()
  const statusFilter = (params.get('status') ?? 'all') as ComplaintStatus | 'all'

  const { data: complaints, isLoading } = useComplaints()
  const { data: members } = useOrgMembers()
  const assign = useAssignComplaint()
  const resolve = useResolveComplaint()
  const toast = useToast()

  const filtered = useMemo(
    () => (complaints ?? []).filter((c) => statusFilter === 'all' || c.status === statusFilter),
    [complaints, statusFilter],
  )

  const setStatus = (s: string) => {
    setParams(s === 'all' ? {} : { status: s }, { replace: true })
  }

  return (
    <AppShell nav={nav}>
      <SectionTitle>
        Complaints
        <span className="ml-2 text-sm font-normal text-slate-400">{filtered.length}</span>
      </SectionTitle>

      <div className="mb-4 flex flex-wrap gap-1">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
              statusFilter === s
                ? 'bg-accent-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !filtered.length ? (
        <EmptyState>No complaints in this view.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {filtered.map((c) => (
            <li key={c.id}>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {c.category || 'General'}
                      {c.visit?.outlet?.name ? (
                        <span className="font-normal text-slate-400"> · {c.visit.outlet.name}</span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{c.description}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge tone={c.status === 'resolved' ? 'green' : c.status === 'assigned' ? 'blue' : 'amber'}>
                    {c.status}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    value={c.assigned_to ?? ''}
                    onChange={(e) =>
                      assign.mutate(
                        { id: c.id, assigneeId: e.target.value || null },
                        {
                          onSuccess: () =>
                            toast.success(e.target.value ? 'Complaint assigned.' : 'Complaint unassigned.'),
                          onError: (err) =>
                            toast.error(err instanceof Error ? err.message : 'Could not assign.'),
                        },
                      )
                    }
                    disabled={c.status === 'resolved'}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Unassigned</option>
                    {members?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name || m.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() =>
                      resolve.mutate(
                        { id: c.id, resolved: c.status !== 'resolved' },
                        {
                          onSuccess: () =>
                            toast.success(c.status === 'resolved' ? 'Complaint reopened.' : 'Complaint resolved.'),
                          onError: (err) =>
                            toast.error(err instanceof Error ? err.message : 'Could not update.'),
                        },
                      )
                    }
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {c.status === 'resolved' ? 'Reopen' : 'Mark resolved'}
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  )
}
