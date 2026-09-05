// Slide-over profile for a team member, opened by clicking a row in the roster.
// Author: Piyush Kapoor.
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient'
import { Badge } from '../../../components/primitives'
import { shortDate, timeAgo } from '../../../lib/time'
import type { Profile } from '../../../types/database.types'

const roleTone = { admin: 'red', manager: 'blue', rep: 'slate' } as const

function useMemberActivity(id: string) {
  return useQuery({
    queryKey: ['member-activity', id],
    queryFn: async () => {
      const { data: visits } = await supabase
        .from('visits')
        .select('id, visit_date, status, outlet_id')
        .eq('rep_id', id)
      const list = (visits ?? []) as { id: string; visit_date: string; status: string; outlet_id: string }[]
      return {
        visits: list.length,
        submitted: list.filter((v) => v.status === 'submitted').length,
        outlets: new Set(list.map((v) => v.outlet_id)).size,
        lastVisit: list.map((v) => v.visit_date).sort().at(-1) ?? null,
      }
    },
  })
}

export function MemberProfileModal({
  member,
  manager,
  onClose,
}: {
  member: Profile
  manager: Profile | null
  onClose: () => void
}) {
  const { data: activity } = useMemberActivity(member.id)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const initials = (member.full_name || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-sm overflow-y-auto bg-white p-6 shadow-xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white dark:bg-slate-700">
              {initials}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {member.full_name || 'Unnamed'}
              </h3>
              <Badge tone={roleTone[member.role]}>{member.role}</Badge>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            ✕
          </button>
        </div>

        <dl className="space-y-3 text-sm">
          <Row label="Employee code" value={member.employee_code || '—'} />
          <Row label="Zone" value={member.zone || '—'} />
          <Row label="Reports to" value={manager?.full_name || (member.role === 'admin' ? '—' : 'Unassigned')} />
          <Row label="Added" value={shortDate(member.created_at)} />
          <Row label="Last active" value={timeAgo(member.last_seen_at)} />
          <Row
            label="Status"
            value={member.deactivated_at ? 'Deactivated' : member.last_seen_at ? 'Active' : 'Not signed in yet'}
          />
        </dl>

        {member.role === 'rep' && (
          <>
            <h4 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Field activity
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric label="Visits" value={activity?.visits ?? '—'} />
              <Metric label="Submitted" value={activity?.submitted ?? '—'} />
              <Metric label="Outlets" value={activity?.outlets ?? '—'} />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Last visit: {activity?.lastVisit ? shortDate(activity.lastVisit) : 'none'}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2 dark:border-slate-800">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 py-2 dark:border-slate-800">
      <p className="text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  )
}
