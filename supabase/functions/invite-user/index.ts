// Admin-only: invites a new user into the caller's organization.
// verify_jwt = true (see supabase/config.toml) means the platform has already
// validated the JWT signature/expiry before this code runs — we only need to
// decode the (already-verified) payload to read the caller's org_id/role.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleOptions } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  const preflight = handleOptions(req)
  if (preflight) return preflight

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '')
    const claims = decodeJwtPayload(jwt)
    if (!claims?.sub) return jsonResponse({ error: 'Not authenticated.' }, 401)

    const callerRole = claims.user_role
    const callerOrgId = claims.org_id
    if (callerRole !== 'admin' || !callerOrgId) {
      return jsonResponse({ error: 'Only org admins can invite users.' }, 403)
    }

    const { email, role, full_name } = await req.json()
    if (!email || !role) {
      return jsonResponse({ error: 'email and role are required.' }, 400)
    }
    if (!['admin', 'manager', 'rep'].includes(role)) {
      return jsonResponse({ error: 'Invalid role.' }, 400)
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: invite, error: inviteInsertError } = await admin
      .from('invites')
      .insert({ org_id: callerOrgId, email, role, invited_by: claims.sub })
      .select('id')
      .single()

    if (inviteInsertError) {
      if (inviteInsertError.code === '23505') {
        return jsonResponse({ error: 'There is already a pending invite for this email.' }, 409)
      }
      throw inviteInsertError
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://127.0.0.1:5173'
    const { error: inviteSendError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { org_id: callerOrgId, role, invite_id: invite.id, full_name: full_name ?? '' },
      redirectTo: `${siteUrl}/accept-invite`,
    })

    if (inviteSendError) {
      await admin.from('invites').update({ status: 'revoked' }).eq('id', invite.id)
      if (inviteSendError.message?.toLowerCase().includes('already registered')) {
        return jsonResponse({ error: 'This email is already registered.' }, 409)
      }
      throw inviteSendError
    }

    return jsonResponse({ success: true, invite_id: invite.id })
  } catch (err) {
    console.error(err)
    return jsonResponse({ error: 'Failed to send invite.' }, 500)
  }
})

function decodeJwtPayload(jwt: string): Record<string, any> | null {
  try {
    const [, payload] = jwt.split('.')
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
