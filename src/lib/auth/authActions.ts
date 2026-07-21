import { supabase, functionsUrl } from '../supabaseClient'

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })
  if (error) throw error
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  if (error) throw error
}

export async function signInWithLinkedIn() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'linkedin_oidc',
    options: { redirectTo: window.location.origin },
  })
  if (error) throw error
}

export async function signInWithEmployeeCode(orgCode: string, employeeCode: string, password: string) {
  const res = await fetch(`${functionsUrl}/employee-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ org_code: orgCode, employee_code: employeeCode, password }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Login failed.')

  const { error } = await supabase.auth.setSession({
    access_token: body.access_token,
    refresh_token: body.refresh_token,
  })
  if (error) throw error
}

export async function createOrganization(name: string, orgCode: string) {
  const { data, error } = await supabase.rpc('create_organization', {
    p_name: name,
    p_org_code: orgCode,
  })
  if (error) throw error
  return data as string
}

export async function inviteUser(email: string, role: 'admin' | 'manager' | 'rep', fullName?: string) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Not authenticated.')

  const res = await fetch(`${functionsUrl}/invite-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email, role, full_name: fullName }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Failed to send invite.')
  return body
}
