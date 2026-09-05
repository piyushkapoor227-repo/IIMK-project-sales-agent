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
    if (!['admin', 'manager'].includes(callerRole) || !callerOrgId) {
      return jsonResponse({ error: 'Only admins and managers can invite users.' }, 403)
    }

    const { email, role, full_name, resend } = await req.json()
    if (!email || !role) {
      return jsonResponse({ error: 'email and role are required.' }, 400)
    }
    if (!['admin', 'manager', 'rep'].includes(role)) {
      return jsonResponse({ error: 'Invalid role.' }, 400)
    }
    // Managers can only add field reps, who then report to them.
    if (callerRole === 'manager' && role !== 'rep') {
      return jsonResponse({ error: 'Managers can only invite field reps.' }, 403)
    }
    const managerId = callerRole === 'manager' ? claims.sub : null

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // A manager's invitee inherits the manager's zone.
    let zone: string | null = null
    if (callerRole === 'manager') {
      const { data: me } = await admin
        .from('profiles')
        .select('zone')
        .eq('id', claims.sub)
        .maybeSingle()
      zone = me?.zone ?? null
    }

    // Find (or create) the pending invite row.
    const { data: existing } = await admin
      .from('invites')
      .select('id')
      .eq('org_id', callerOrgId)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle()

    let inviteId: string
    if (existing) {
      if (!resend) {
        return jsonResponse({ error: 'There is already a pending invite for this email.' }, 409)
      }
      inviteId = existing.id
      await admin
        .from('invites')
        .update({ last_sent_at: new Date().toISOString(), expires_at: new Date(Date.now() + 30 * 864e5).toISOString() })
        .eq('id', inviteId)
    } else {
      const { data: invite, error: inviteInsertError } = await admin
        .from('invites')
        .insert({ org_id: callerOrgId, email, role, zone, invited_by: claims.sub })
        .select('id')
        .single()
      if (inviteInsertError) throw inviteInsertError
      inviteId = invite.id
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://127.0.0.1:5173'
    const { error: inviteSendError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        org_id: callerOrgId,
        role,
        invite_id: inviteId,
        full_name: full_name ?? '',
        manager_id: managerId,
        zone,
      },
      redirectTo: `${siteUrl}/accept-invite`,
    })

    if (inviteSendError) {
      if (!existing) {
        await admin.from('invites').update({ status: 'revoked' }).eq('id', inviteId)
      }
      if (inviteSendError.message?.toLowerCase().includes('already registered')) {
        return jsonResponse({ error: 'This email is already registered.' }, 409)
      }
      throw inviteSendError
    }

    return jsonResponse({ success: true, invite_id: inviteId, resent: !!existing })
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
