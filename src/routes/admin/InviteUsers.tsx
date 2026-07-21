import { useState, type FormEvent } from 'react'
import { AppShell } from '../../components/AppShell'
import { FormField } from '../../components/FormField'
import { Button } from '../../components/Button'
import { useOrgMembers } from '../../lib/queries/useOrgMembers'
import { useInviteUser, usePendingInvites } from '../../lib/queries/useInvites'
import type { UserRole } from '../../types/database.types'
import { adminNav } from './nav'

export function InviteUsers() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('rep')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const { data: members } = useOrgMembers()
  const { data: invites } = usePendingInvites()
  const inviteMutation = useInviteUser()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    try {
      await inviteMutation.mutateAsync({ email, role })
      setSuccess(`Invite sent to ${email}.`)
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite.')
    }
  }

  return (
    <AppShell nav={adminNav}>
      <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Invite users</h2>

      <form onSubmit={handleSubmit} className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end">
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
          <label htmlFor="invite_role" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Role
          </label>
          <select
            id="invite_role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value="rep">Field rep</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <Button type="submit" className="sm:w-auto" loading={inviteMutation.isPending}>
          Send invite
        </Button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {success && <p className="mb-4 text-sm text-emerald-600 dark:text-emerald-400">{success}</p>}

      <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Pending invites</h3>
      <ul className="mb-8 divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {invites?.length ? (
          invites.map((invite) => (
            <li key={invite.id} className="flex justify-between px-4 py-2 text-sm">
              <span className="text-slate-800 dark:text-slate-200">{invite.email}</span>
              <span className="text-slate-400">{invite.role}</span>
            </li>
          ))
        ) : (
          <li className="px-4 py-3 text-sm text-slate-400">No pending invites.</li>
        )}
      </ul>

      <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Team members</h3>
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {members?.map((member) => (
          <li key={member.id} className="flex justify-between px-4 py-2 text-sm">
            <span className="text-slate-800 dark:text-slate-200">{member.full_name || member.id}</span>
            <span className="text-slate-400">{member.role}</span>
          </li>
        ))}
      </ul>
    </AppShell>
  )
}
