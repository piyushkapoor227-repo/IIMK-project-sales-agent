// Resolves an org_code + employee_code + password login into a Supabase
// session, without ever exposing the resolved email to the client. Runs
// with verify_jwt = false (see supabase/config.toml) since callers aren't
// authenticated yet — this function IS the login step.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleOptions } from '../_shared/cors.ts'

const MAX_ATTEMPTS = 5
const WINDOW_MINUTES = 15
const GENERIC_ERROR = 'Invalid company code, employee code, or password.'

Deno.serve(async (req) => {
  const preflight = handleOptions(req)
  if (preflight) return preflight

  try {
    const { org_code, employee_code, password } = await req.json()
    if (!org_code || !employee_code || !password) {
      return jsonResponse({ error: GENERIC_ERROR }, 400)
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const identifier = `${String(org_code).toLowerCase()}:${String(employee_code).toLowerCase()}`

    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString()
    const { count } = await admin
      .from('login_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('identifier', identifier)
      .gte('attempted_at', windowStart)

    if ((count ?? 0) >= MAX_ATTEMPTS) {
      return jsonResponse({ error: 'Too many attempts. Please try again later.' }, 429)
    }

    const fail = async () => {
      await admin.from('login_attempts').insert({ identifier })
      return jsonResponse({ error: GENERIC_ERROR }, 401)
    }

    const { data: org } = await admin
      .from('organizations')
      .select('id')
      .eq('org_code', org_code)
      .maybeSingle()
    if (!org) return await fail()

    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('org_id', org.id)
      .eq('employee_code', employee_code)
      .maybeSingle()
    if (!profile) return await fail()

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(profile.id)
    if (userError || !userData?.user?.email) return await fail()

    const anon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    )
    const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
      email: userData.user.email,
      password,
    })
    if (signInError || !signInData.session) return await fail()

    return jsonResponse({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    })
  } catch (_err) {
    return jsonResponse({ error: GENERIC_ERROR }, 400)
  }
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
