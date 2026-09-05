import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './lib/auth/AuthContext'
import { Login } from './routes/auth/Login'
import { Signup } from './routes/auth/Signup'
import { AcceptInvite } from './routes/auth/AcceptInvite'
import { CreateOrg } from './routes/auth/CreateOrg'
import { RepHome } from './routes/rep/Home'
import { RepHistory } from './routes/rep/History'
import { VisitCapture } from './routes/rep/VisitCapture'
import { ManagerDashboard } from './routes/manager/Dashboard'
import { ManagerComplaints } from './routes/manager/Complaints'
import { AdminDashboard } from './routes/admin/Dashboard'
import { InviteUsers } from './routes/admin/InviteUsers'
import { Outlets } from './routes/admin/Outlets'
import { AdminComplaints } from './routes/admin/Complaints'
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
        path="/rep/history"
        element={
          <RequireAuth>
            <RequireRole role="rep">
              <RepHistory />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/rep/visit/:visitId"
        element={
          <RequireAuth>
            <RequireRole role="rep">
              <VisitCapture />
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
        path="/manager/complaints"
        element={
          <RequireAuth>
            <RequireRole role="manager">
              <ManagerComplaints />
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/admin"
        element={
          <RequireAuth>
            <RequireRole role="admin">
              <AdminDashboard />
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
        path="/admin/outlets"
        element={
          <RequireAuth>
            <RequireRole role="admin">
              <Outlets />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/complaints"
        element={
          <RequireAuth>
            <RequireRole role="admin">
              <AdminComplaints />
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
