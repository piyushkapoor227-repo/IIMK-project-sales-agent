import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth/AuthContext'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return <div className="flex min-h-svh items-center justify-center text-sm text-slate-400">Loading…</div>
  }
  if (!session) return <Navigate to="/login" replace />
  if (profile?.onboarding_status === 'pending_org') return <Navigate to="/create-org" replace />

  return <>{children}</>
}

export function RequireRole({ role, children }: { role: 'admin' | 'manager' | 'rep'; children: ReactNode }) {
  const { profile } = useAuth()
  if (profile?.role !== role) return <Navigate to="/" replace />
  return <>{children}</>
}

export function RoleHomeRedirect() {
  const { profile } = useAuth()
  if (profile?.role === 'admin') return <Navigate to="/admin/users" replace />
  if (profile?.role === 'manager') return <Navigate to="/manager" replace />
  return <Navigate to="/rep" replace />
}
