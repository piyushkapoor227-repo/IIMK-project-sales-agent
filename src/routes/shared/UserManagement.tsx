// Invite users + team roster. Shared by admins (/admin/users) and managers
// (/manager/users). Admins can invite any role; managers can invite field reps
// (who are then attached to that manager). Author: Piyush Kapoor.
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Send } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { FormField } from '../../components/FormField'
import { Button } from '../../components/Button'
import { Badge, Card, SectionTitle } from '../../components/primitives'
import { Pagination, usePagination } from '../../components/Pagination'
import { SkeletonTable } from '../../components/Skeleton'
import { useAuth } from '../../lib/auth/AuthContext'
import { useOrgMembers } from '../../lib/queries/useOrgMembers'
import { useInviteUser, usePendingInvites } from '../../lib/queries/useInvites'
import { shortDate, timeAgo } from '../../lib/time'
import type { Profile, UserRole } from '../../types/database.types'
import { MemberProfileModal } from './users/MemberProfileModal'
import { PendingInvitesList } from './users/PendingInvitesList'

const roleTone = { admin: 'red', manager: 'blue', rep: 'slate' } as const

export function UserManagement({ nav }: { nav: { to: string; label: string }[] }) {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('rep')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [zoneFilter, setZoneFilter] = useState('all')
  const [managerFilter, setManagerFilter] = useState('all')
  const [selected, setSelected] = useState<Profile | null>(null)

  const { data: members, isLoading: membersLoading } = useOrgMembers()
  const { data: invites, isLoading: invitesLoading } = usePendingInvites()
  const inviteMutation = useInviteUser()

  const managers = useMemo(
    () => (members ?? []).filter((m) => m.role === 'manager'),
    [members],
  )
  const zones = useMemo(() => {
    const set = new Set<string>()
    for (const m of members ?? []) if (m.zone) set.add(m.zone)
    return [...set].sort()
  }, [members])
  const managerName = (id: string | null) =>
    (members ?? []).find((m) => m.id === id)?.full_name ?? null

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (members ?? []).filter((m) => {
      if (roleFilter !== 'all' && m.role !== roleFilter) return false
      if (zoneFilter === 'unzoned' ? m.zone : zoneFilter !== 'all' && m.zone !== zoneFilter) return false
      if (managerFilter === 'unassigned' ? m.manager_id : managerFilter !== 'all' && m.manager_id !== managerFilter)
        return false
      if (!q) return true
      return (
        (m.full_name ?? '').toLowerCase().includes(q) ||
        (m.employee_code ?? '').toLowerCase().includes(q)
      )
    })
  }, [members, search, roleFilter, zoneFilter, managerFilter])

  const filteredInvites = useMemo(() => {
    return (invites ?? []).filter((inv) => {
      if (roleFilter !== 'all' && inv.role !== roleFilter) return false
      if (zoneFilter !== 'all' && zoneFilter !== 'unzoned' && inv.zone !== zoneFilter) return false
      const q = search.trim().toLowerCase()
      return !q || inv.email.toLowerCase().includes(q)
    })
  }, [invites, roleFilter, zoneFilter, search])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    try {
      await inviteMutation.mutateAsync({ email, role: isAdmin ? role : 'rep' })
      setSuccess(`Invite sent to ${email}.`)
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite.')
    }
  }

  const filterKey = `${search}|${roleFilter}|${zoneFilter}|${managerFilter}`
  const membersPager = usePagination(filteredMembers.length, filterKey)
  const invitesPager = usePagination(filteredInvites.length, filterKey)
  const shown = filteredMembers.slice(membersPager.start, membersPager.end)
  const shownInvites = filteredInvites.slice(invitesPager.start, invitesPager.end)

  return (
    <AppShell nav={nav}>
      <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">Users</h2>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        {isAdmin ? (
          <>Admins can invite field reps, managers and other admins.</>
        ) : (
          <>
            Managers can invite <span className="font-medium">field reps</span> — new reps join your
            team automatically. Ask an admin to add managers or other admins.
          </>
        )}
      </p>

      <Card className="mb-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <FormField
              label="Email"
              id="invite_email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="text-left">
            <label
              htmlFor="invite_role"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Role
            </label>
            <select
              id="invite_role"
              value={isAdmin ? role : 'rep'}
              disabled={!isAdmin}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="rep">Field rep</option>
              {isAdmin && <option value="manager">Manager</option>}
              {isAdmin && <option value="admin">Admin</option>}
            </select>
          </div>
          <Button type="submit" className="sm:w-auto" loading={inviteMutation.isPending}>
            <Send size={15} /> Send invite
          </Button>
        </form>
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {success && <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{success}</p>}
      </Card>

      {/* filters */}
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input
          placeholder="Search name, code or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        <Select value={roleFilter} onChange={(v) => setRoleFilter(v as 'all' | UserRole)}>
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="rep">Field rep</option>
        </Select>
        <Select value={zoneFilter} onChange={setZoneFilter}>
          <option value="all">All zones</option>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
          <option value="unzoned">Unzoned</option>
        </Select>
        <Select value={managerFilter} onChange={setManagerFilter}>
          <option value="all">All managers</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
          <option value="unassigned">Unassigned</option>
        </Select>
      </div>

      <SectionTitle>
        Team members
        <span className="ml-2 text-sm font-normal text-slate-400">
          {filteredMembers.length} of {members?.length ?? 0}
        </span>
      </SectionTitle>

      {membersLoading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : (
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-800">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Zone</th>
              <th className="px-3 py-2 font-medium">Reports to</th>
              <th className="px-3 py-2 font-medium">Added</th>
              <th className="px-3 py-2 font-medium">Last active</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((m) => (
              <tr
                key={m.id}
                onClick={() => setSelected(m)}
                className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/50"
              >
                <td className="px-3 py-2">
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {m.full_name || 'Unnamed'}
                  </span>
                  <span className="ml-2 text-xs text-slate-400">{m.employee_code}</span>
                </td>
                <td className="px-3 py-2">
                  <Badge tone={roleTone[m.role]}>{m.role}</Badge>
                </td>
                <td className="px-3 py-2 text-slate-500">{m.zone || '—'}</td>
                <td className="px-3 py-2 text-slate-500">{managerName(m.manager_id) || '—'}</td>
                <td className="px-3 py-2 text-slate-500">{shortDate(m.created_at)}</td>
                <td className="px-3 py-2 text-slate-500">{timeAgo(m.last_seen_at)}</td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                  No members match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
      <div className="mb-8">
        <Pagination total={filteredMembers.length} pager={membersPager} label="members" />
      </div>

      <SectionTitle>
        Pending invites
        <span className="ml-2 text-sm font-normal text-slate-400">{filteredInvites.length}</span>
      </SectionTitle>
      {invitesLoading ? (
        <SkeletonTable rows={4} cols={6} />
      ) : (
        <>
          <PendingInvitesList invites={shownInvites} />
          <Pagination total={filteredInvites.length} pager={invitesPager} label="invites" />
        </>
      )}

      {selected && (
        <MemberProfileModal
          member={selected}
          manager={(members ?? []).find((m) => m.id === selected.manager_id) ?? null}
          onClose={() => setSelected(null)}
        />
      )}
    </AppShell>
  )
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (v: string) => void
  children: ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
    >
      {children}
    </select>
  )
}
