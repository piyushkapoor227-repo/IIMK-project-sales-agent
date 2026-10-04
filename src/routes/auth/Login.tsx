import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../../components/AuthLayout'
import { FormField } from '../../components/FormField'
import { Button } from '../../components/Button'
import {
  signInWithEmail,
  signInWithEmployeeCode,
  signInWithGoogle,
  signInWithLinkedIn,
} from '../../lib/auth/authActions'
import { MOCK_AUTH } from '../../lib/auth/mockAuth'

type Mode = 'email' | 'company'

export function Login() {
  const [mode, setMode] = useState<Mode>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgCode, setOrgCode] = useState('')
  const [employeeCode, setEmployeeCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'email') {
        await signInWithEmail(email, password)
      } else {
        await signInWithEmployeeCode(orgCode, employeeCode, password)
      }
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to AI Field Sales Copilot">
      {MOCK_AUTH && (
        <div className="mb-4 rounded-control bg-amber-100 px-3 py-2 text-xs font-medium text-amber-900 dark:bg-amber-900/30 dark:text-amber-300">
          Dev mock login active &mdash; no real backend connected.
          {mode === 'email' ? (
            <>
              <br />
              <span className="font-mono">admin / admin</span> &mdash; org admin (single organization)
              <br />
              <span className="font-mono">superadmin / superadmin</span> &mdash; Central Control (all 7 orgs, 150 people)
            </>
          ) : (
            <>
              <br />
              Company code: <span className="font-mono">any value</span> (e.g. <span className="font-mono">ACME</span>) &mdash; not checked in mock mode
              <br />
              Employee code <span className="font-mono">admin</span> / password <span className="font-mono">admin</span> &mdash; org admin
              <br />
              Employee code <span className="font-mono">superadmin</span> / password <span className="font-mono">superadmin</span> &mdash; Central Control
            </>
          )}
        </div>
      )}
      <div className="mb-4 flex rounded-lg bg-slate-100 p-1 text-sm dark:bg-slate-800">
        <button
          type="button"
          onClick={() => setMode('email')}
          className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${
            mode === 'email' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'
          }`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => setMode('company')}
          className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${
            mode === 'company' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'
          }`}
        >
          Company login
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'email' ? (
          <FormField
            label="Email"
            id="email"
            type={MOCK_AUTH ? 'text' : 'email'}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        ) : (
          <>
            <FormField
              label="Company code"
              id="org_code"
              required
              value={orgCode}
              onChange={(e) => setOrgCode(e.target.value)}
              placeholder="e.g. ACME"
            />
            <FormField
              label="Employee code"
              id="employee_code"
              required
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
            />
          </>
        )}
        <FormField
          label="Password"
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" loading={loading}>
          Sign in
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        or continue with
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>

      <div className="space-y-2">
        <Button variant="outline" type="button" onClick={() => signInWithGoogle()}>
          <span className="flex items-center justify-center gap-2">
            <GoogleIcon /> Continue with Google
          </span>
        </Button>
        <Button variant="outline" type="button" onClick={() => signInWithLinkedIn()}>
          <span className="flex items-center justify-center gap-2">
            <LinkedInIcon /> Continue with LinkedIn
          </span>
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        New here?{' '}
        <Link to="/signup" className="font-medium text-slate-900 underline dark:text-white">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-2.1 14.1-5.6l-6.5-5.5C29.6 34.7 27 35.5 24 35.5c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.5 5.5C41.6 35.6 44 30.3 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="4" fill="#0A66C2" />
      <path
        fill="#fff"
        d="M7.1 9.6H4.3V19h2.8V9.6zM5.7 5c-1 0-1.6.6-1.6 1.5 0 .8.6 1.5 1.6 1.5s1.6-.7 1.6-1.5C7.3 5.6 6.7 5 5.7 5zM19.7 13.3c0-2.6-1.4-3.9-3.3-3.9-1.5 0-2.2.8-2.6 1.4V9.6h-2.8c0 .1 0 9.4 0 9.4h2.8v-5.2c0-.3 0-.6.1-.8.2-.6.8-1.2 1.7-1.2 1.2 0 1.7.9 1.7 2.3V19h2.8v-5.7z"
      />
    </svg>
  )
}
