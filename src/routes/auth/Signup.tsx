import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout } from '../../components/AuthLayout'
import { FormField } from '../../components/FormField'
import { Button } from '../../components/Button'
import { signInWithGoogle, signInWithLinkedIn, signUpWithEmail } from '../../lib/auth/authActions'

export function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signUpWithEmail(email, password, fullName)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <AuthLayout title="Check your email" subtitle="We've sent you a confirmation link.">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Once confirmed, sign in and you'll be prompted to create your organization.
        </p>
        <Link to="/login" className="mt-6 block text-center text-sm font-medium underline">
          Back to sign in
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Create your account" subtitle="Start your organization's free trial">
      <form onSubmit={handleSubmit} className="space-y-3">
        <FormField label="Full name" id="full_name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <FormField label="Email" id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <FormField
          label="Password"
          id="password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button type="submit" loading={loading}>
          Create account
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        or continue with
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>

      <div className="space-y-2">
        <Button variant="outline" type="button" onClick={() => signInWithGoogle()}>
          Continue with Google
        </Button>
        <Button variant="outline" type="button" onClick={() => signInWithLinkedIn()}>
          Continue with LinkedIn
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-slate-900 underline dark:text-white">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
