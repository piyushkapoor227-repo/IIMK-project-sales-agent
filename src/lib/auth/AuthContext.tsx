import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import type { Organization, Profile, UserRole } from '../../types/database.types'
import { MOCK_AUTH, getMockState, mockEnterOrg, mockEnterPlatformAdmin, mockSetRole, mockSignOut, subscribeMock } from './mockAuth'
import { getOrgs, subscribeOrgStore } from './mockOrgStore'

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  organization: Organization | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
  mockMode: boolean
  setMockRole?: (role: UserRole) => void
  isPlatformAdmin?: boolean
  enterPlatformAdmin?: () => void
  enterOrg?: (orgId: string, role: UserRole) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function MockAuthProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribeMock, getMockState)
  const orgs = useSyncExternalStore(subscribeOrgStore, getOrgs)
  const { profile, isPlatformAdmin } = state
  const session =
    profile || isPlatformAdmin ? ({ user: { id: profile?.id ?? 'mock-platform-admin' } } as unknown as Session) : null
  const organization = profile ? (orgs.find((o) => o.id === profile.org_id) ?? null) : null

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        organization,
        loading: false,
        refreshProfile: async () => {},
        signOut: async () => mockSignOut(),
        mockMode: true,
        setMockRole: (role) => mockSetRole(role),
        isPlatformAdmin,
        enterPlatformAdmin: () => mockEnterPlatformAdmin(),
        enterOrg: (orgId, role) => mockEnterOrg(orgId, role),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

function RealAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    setProfile(profileData as Profile | null)

    if (profileData?.org_id) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profileData.org_id)
        .maybeSingle()
      setOrganization(orgData as Organization | null)
    } else {
      setOrganization(null)
    }
  }

  async function refreshProfile() {
    if (session?.user) await loadProfile(session.user.id)
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        loadProfile(newSession.user.id)
      } else {
        setProfile(null)
        setOrganization(null)
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, profile, organization, loading, refreshProfile, signOut, mockMode: false }}>
      {children}
    </AuthContext.Provider>
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return MOCK_AUTH ? <MockAuthProvider>{children}</MockAuthProvider> : <RealAuthProvider>{children}</RealAuthProvider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
