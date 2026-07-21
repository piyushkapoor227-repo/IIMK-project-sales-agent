import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './lib/auth/AuthContext'
import { Login } from './routes/auth/Login'
import { Signup } from './routes/auth/Signup'
import { AcceptInvite } from './routes/auth/AcceptInvite'
import { CreateOrg } from './routes/auth/CreateOrg'
import { RepHome } from './routes/rep/Home'
import { ManagerDashboard } from './routes/manager/Dashboard'
import { InviteUsers } from './routes/admin/InviteUsers'
import { Branding } from './routes/admin/Branding'
import { RequireAuth, RequireRole, RoleHomeRedirect } from './components/RequireAuth'

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to="/" replace />
  return <>{children}</>
}

function CreateOrgGuard() {
  const { session, profile, loading } = useAuth()
  if (loading) return null
  if (!session) return <Navigate to="/login" replace />
  if (profile?.onboarding_status === 'active') return <Navigate to="/" replace />
  return <CreateOrg />
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <Login />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/signup"
        element={
          <RedirectIfAuthed>
            <Signup />
          </RedirectIfAuthed>
        }
      />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/create-org" element={<CreateOrgGuard />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <RoleHomeRedirect />
          </RequireAuth>
        }
      />
      <Route
        path="/rep"
        element={
          <RequireAuth>
            <RequireRole role="rep">
              <RepHome />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/manager"
        element={
          <RequireAuth>
            <RequireRole role="manager">
              <ManagerDashboard />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/users"
        element={
          <RequireAuth>
            <RequireRole role="admin">
              <InviteUsers />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/branding"
        element={
          <RequireAuth>
            <RequireRole role="admin">
              <Branding />
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
