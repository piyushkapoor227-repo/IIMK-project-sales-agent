// What each role can do — surfaced on the Users page and the invite form.
// Author: Piyush Kapoor.
import type { UserRole } from '../types/database.types'

export const ROLE_INFO: Record<UserRole, { label: string; blurb: string }> = {
  admin: {
    label: 'Admin',
    blurb:
      'Full control of the organization — manages the outlet directory, branding and every user, and sees org-wide dashboards and complaints.',
  },
  manager: {
    label: 'Manager',
    blurb:
      "Leads a team of field reps — sees their direct reports' visits, coverage and pricing on the dashboard, triages complaints, and can invite reps to their team.",
  },
  rep: {
    label: 'Field rep',
    blurb:
      'Visits retail outlets and captures stock, pricing, shelf photos, voice notes and complaints. Sees only their own visits.',
  },
}
