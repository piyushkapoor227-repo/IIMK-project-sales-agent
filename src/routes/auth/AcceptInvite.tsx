import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout } from '../../components/AuthLayout'
import { FormField } from '../../components/FormField'
import { Button } from '../../components/Button'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth/AuthContext'

export function AcceptInvite() {
  const { session, loading } = useAuth()
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: fullName ? { full_name: fullName } : undefined,
      })
      if (updateError) throw updateError

      if (fullName) {
        await supabase.from('profiles').update({ full_name: fullName }).eq('id', session?.user.id)
      }
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete setup.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AuthLayout title="Loading…">
        <p className="text-sm text-slate-500">Verifying your invite…</p>
      </AuthLayout>
    )
  }

  if (!session) {
    return (
      <AuthLayout title="Invite link invalid or expired">
        <p className="text-sm text-slate-500">
          Ask your admin to resend the invite, or sign in if you already have an account.
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Finish setting up your account" subtitle={session.user.email ?? undefined}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <FormField label="Full name" id="full_name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <FormField
          label="Set a password"
          id="password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button type="submit" loading={submitting}>
          Finish setup
        </Button>
      </form>
    </AuthLayout>
  )
}
