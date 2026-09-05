import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth/AuthContext'
import { RequireAuth, RequireRole, RoleHomeRedirect } from './components/RequireAuth'
import { Attribution } from './components/Attribution'
import { useOfflineSync } from './lib/offline/flush'

// Auth screens load eagerly (first paint); everything behind the login is split.
import { Login } from './routes/auth/Login'
import { Signup } from './routes/auth/Signup'
import { AcceptInvite } from './routes/auth/AcceptInvite'
import { CreateOrg } from './routes/auth/CreateOrg'

const named = <T extends string>(loader: () => Promise<Record<T, ComponentType>>, name: T) =>
  lazy(() => loader().then((m) => ({ default: m[name] })))

const RepHome = named(() => import('./routes/rep/Home'), 'RepHome')
const RepHistory = named(() => import('./routes/rep/History'), 'RepHistory')
const VisitCapture = named(() => import('./routes/rep/VisitCapture'), 'VisitCapture')
const ManagerDashboard = named(() => import('./routes/manager/Dashboard'), 'ManagerDashboard')
const ManagerUsers = named(() => import('./routes/manager/Users'), 'ManagerUsers')
const ManagerComplaints = named(() => import('./routes/manager/Complaints'), 'ManagerComplaints')
const AdminDashboard = named(() => import('./routes/admin/Dashboard'), 'AdminDashboard')
const InviteUsers = named(() => import('./routes/admin/InviteUsers'), 'InviteUsers')
const Outlets = named(() => import('./routes/admin/Outlets'), 'Outlets')
const AdminComplaints = named(() => import('./routes/admin/Complaints'), 'AdminComplaints')
const Branding = named(() => import('./routes/admin/Branding'), 'Branding')
const NotFound = named(() => import('./routes/NotFound'), 'NotFound')

function RouteFallback() {
  return <div className="flex min-h-svh items-center justify-center text-sm text-slate-400">Loading…</div>
}

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

function roleRoute(role: 'admin' | 'manager' | 'rep', element: ReactNode) {
  return (
    <RequireAuth>
      <RequireRole role={role}>{element}</RequireRole>
    </RequireAuth>
  )
}

export default function App() {
  useOfflineSync()
  return (
    <>
      <Suspense fallback={<RouteFallback />}>
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

          <Route path="/rep" element={roleRoute('rep', <RepHome />)} />
          <Route path="/rep/history" element={roleRoute('rep', <RepHistory />)} />
          <Route path="/rep/visit/:visitId" element={roleRoute('rep', <VisitCapture />)} />

          <Route path="/manager" element={roleRoute('manager', <ManagerDashboard />)} />
          <Route path="/manager/users" element={roleRoute('manager', <ManagerUsers />)} />
          <Route path="/manager/complaints" element={roleRoute('manager', <ManagerComplaints />)} />

          <Route path="/admin" element={roleRoute('admin', <AdminDashboard />)} />
          <Route path="/admin/users" element={roleRoute('admin', <InviteUsers />)} />
          <Route path="/admin/outlets" element={roleRoute('admin', <Outlets />)} />
          <Route path="/admin/complaints" element={roleRoute('admin', <AdminComplaints />)} />
          <Route path="/admin/branding" element={roleRoute('admin', <Branding />)} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Attribution />
    </>
  )
}
