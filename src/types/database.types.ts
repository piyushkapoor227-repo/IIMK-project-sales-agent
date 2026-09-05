export type UserRole = 'admin' | 'manager' | 'rep'
export type OnboardingStatus = 'pending_org' | 'active'
export type InviteStatus = 'pending' | 'accepted' | 'revoked'
export type VisitStatus = 'draft' | 'submitted'
export type ComplaintStatus = 'open' | 'assigned' | 'resolved'

export interface Organization {
  id: string
  name: string
  org_code: string
  logo_url: string | null
  created_at: string
  created_by: string | null
}

export interface Profile {
  id: string
  org_id: string | null
  employee_code: string | null
  full_name: string | null
  role: UserRole
  manager_id: string | null
  zone: string | null
  last_seen_at: string | null
  onboarding_status: OnboardingStatus
  deactivated_at: string | null
  created_at: string
}

export interface Invite {
  id: string
  org_id: string
  email: string
  role: UserRole
  invited_by: string
  status: InviteStatus
  expires_at: string
  last_sent_at: string
  accepted_at: string | null
  accepted_user_id: string | null
  created_at: string
}

export interface Outlet {
  id: string
  org_id: string
  name: string
  address: string | null
  territory: string | null
  distributor_name: string | null
  gps_lat: number | null
  gps_lng: number | null
  created_at: string
}

export interface Visit {
  id: string
  org_id: string
  outlet_id: string
  rep_id: string
  visit_date: string
  status: VisitStatus
  gps_checkin_lat: number | null
  gps_checkin_lng: number | null
  notes: string | null
  submitted_at: string | null
  created_at: string
}

export interface VisitWithOutlet extends Visit {
  outlet: Pick<Outlet, 'id' | 'name' | 'territory'> | null
}

export interface VisitWithRep extends VisitWithOutlet {
  rep: Pick<Profile, 'id' | 'full_name'> | null
}

export interface StockReport {
  id: string
  org_id: string
  visit_id: string
  sku: string
  quantity: number | null
  price: number | null
  competitor_price: number | null
  photo_url: string | null
  ai_extracted: Record<string, unknown> | null
  created_at: string
}

export interface MerchandisingPhoto {
  id: string
  org_id: string
  visit_id: string
  photo_url: string
  ai_analysis: Record<string, unknown> | null
  compliance_score: number | null
  created_at: string
}

export interface Complaint {
  id: string
  org_id: string
  visit_id: string | null
  category: string | null
  description: string
  status: ComplaintStatus
  assigned_to: string | null
  resolved_at: string | null
  created_at: string
}

export interface VoiceNote {
  id: string
  org_id: string
  visit_id: string
  audio_transcript: string | null
  structured_data: Record<string, unknown> | null
  created_at: string
}

export interface ComplaintWithContext extends Complaint {
  assignee: Pick<Profile, 'id' | 'full_name'> | null
  visit: { id: string; outlet: Pick<Outlet, 'id' | 'name'> | null } | null
}

// Shape returned by the analyze-shelf-photo Edge Function (Claude vision).
export interface ShelfAnalysis {
  compliance_score: number | null
  summary: string
  detected_skus: { name: string; facings: number | null; notes?: string }[]
  issues: string[]
  ai_disabled?: boolean
}

// Shape returned by the structure-voice-note Edge Function (Claude).
export interface VoiceStructuring {
  summary: string
  stock_mentions: { sku: string; quantity: number | null; price: number | null }[]
  competitor_activity: string[]
  complaints: string[]
  action_items: string[]
  ai_disabled?: boolean
}
