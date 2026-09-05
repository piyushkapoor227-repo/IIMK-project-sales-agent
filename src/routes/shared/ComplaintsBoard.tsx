// Complaint triage board for managers / admins: assign to a team member,
// mark resolved. Author: Piyush Kapoor.
import { AppShell } from '../../components/AppShell'
import { Badge, Card, EmptyState, SectionTitle, Spinner } from '../../components/primitives'
import { useAssignComplaint, useComplaints, useResolveComplaint } from '../../lib/queries/useTeam'
import { useOrgMembers } from '../../lib/queries/useOrgMembers'

export function ComplaintsBoard({ nav }: { nav: { to: string; label: string }[] }) {
  const { data: complaints, isLoading } = useComplaints()
  const { data: members } = useOrgMembers()
  const assign = useAssignComplaint()
  const resolve = useResolveComplaint()

  return (
    <AppShell nav={nav}>
      <SectionTitle>Complaints</SectionTitle>

      {isLoading ? (
        <Spinner />
      ) : !complaints?.length ? (
        <EmptyState>No complaints logged yet.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {complaints.map((c) => (
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
                    onChange={(e) => assign.mutate({ id: c.id, assigneeId: e.target.value || null })}
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
                    onClick={() => resolve.mutate({ id: c.id, resolved: c.status !== 'resolved' })}
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
