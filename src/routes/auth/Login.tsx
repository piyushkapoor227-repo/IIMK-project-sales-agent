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
            type="email"
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
        New here?{' '}
        <Link to="/signup" className="font-medium text-slate-900 underline dark:text-white">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}
