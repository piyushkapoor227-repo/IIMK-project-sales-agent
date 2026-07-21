import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout } from '../../components/AuthLayout'
import { FormField } from '../../components/FormField'
import { Button } from '../../components/Button'
import { createOrganization } from '../../lib/auth/authActions'
import { useAuth } from '../../lib/auth/AuthContext'

export function CreateOrg() {
  const [name, setName] = useState('')
  const [orgCode, setOrgCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { refreshProfile } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await createOrganization(name, orgCode)
      await refreshProfile()
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create organization.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Set up your organization" subtitle="You'll be the first admin — invite your team next.">
      <form onSubmit={handleSubmit} className="space-y-3">
        <FormField label="Organization name" id="org_name" required value={name} onChange={(e) => setName(e.target.value)} />
        <FormField
          label="Company code"
          id="org_code"
          required
          value={orgCode}
          onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
          placeholder="e.g. ACME"
          maxLength={20}
        />
        <p className="text-xs text-slate-400">
          Your team will use this code to sign in with their employee code.
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button type="submit" loading={loading}>
          Create organization
        </Button>
      </form>
    </AuthLayout>
  )
}
