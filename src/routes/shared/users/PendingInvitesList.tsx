// Pending-invite table: who invited whom, when it was last sent, and how long
// until it expires — with a resend action. Author: Piyush Kapoor.
import { useState } from 'react'
import { RotateCw } from 'lucide-react'
import { Badge, EmptyState } from '../../../components/primitives'
import { useToast } from '../../../components/Toast'
import { useResendInvite, type InviteWithInviter } from '../../../lib/queries/useInvites'
import { expiryStatus, timeAgo } from '../../../lib/time'

export function PendingInvitesList({ invites }: { invites: InviteWithInviter[] }) {
  const resend = useResendInvite()
  const toast = useToast()
  const [busyId, setBusyId] = useState<string | null>(null)

  if (invites.length === 0) return <EmptyState>No pending invites match this filter.</EmptyState>

  async function handleResend(inv: InviteWithInviter) {
    setBusyId(inv.id)
    try {
      await resend.mutateAsync({ id: inv.id, email: inv.email, role: inv.role })
      toast.success(`Invite resent to ${inv.email}.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not resend the invite.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-800">
            <th className="px-3 py-2 font-medium">Email</th>
            <th className="px-3 py-2 font-medium">Role</th>
            <th className="px-3 py-2 font-medium">Zone</th>
            <th className="px-3 py-2 font-medium">Invited by</th>
            <th className="px-3 py-2 font-medium">Last sent</th>
            <th className="px-3 py-2 font-medium">Expires</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {invites.map((inv) => {
            const exp = expiryStatus(inv.expires_at)
            return (
              <tr key={inv.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                <td className="px-3 py-2 text-slate-800 dark:text-slate-200">{inv.email}</td>
                <td className="px-3 py-2 text-slate-500">{inv.role}</td>
                <td className="px-3 py-2 text-slate-500">{inv.zone || '—'}</td>
                <td className="px-3 py-2 text-slate-500">{inv.invitedBy?.full_name || '—'}</td>
                <td className="px-3 py-2 text-slate-500">{timeAgo(inv.last_sent_at)}</td>
                <td className="px-3 py-2">
                  <Badge tone={exp.expired ? 'red' : exp.soon ? 'amber' : 'slate'}>{exp.label}</Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => handleResend(inv)}
                    disabled={busyId === inv.id}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <RotateCw size={12} className={busyId === inv.id ? 'animate-spin' : ''} />
                    {busyId === inv.id ? 'Sending…' : 'Resend'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
