// Rep visit capture: draft visits + their child records (stock reports,
// merchandising photos, voice notes, complaints) and submit.
//
// Text operations work offline: when navigator.onLine is false the mutation is
// pushed to the offline queue (src/lib/offline) and the matching query merges
// queued rows back in, so the rep sees their entry immediately. flushQueue
// replays them on reconnect. Photos are online-only.
// Author: Piyush Kapoor.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth/AuthContext'
import { uploadVisitPhoto } from '../storage'
import {
  enqueue,
  pendingComplaintRows,
  pendingStockRows,
  pendingVisitPatch,
  pendingVoiceRows,
  removeOp,
} from '../offline/queue'
import type { Coords } from '../geo'
import type {
  Complaint,
  MerchandisingPhoto,
  ShelfAnalysis,
  StockReport,
  Visit,
  VisitWithOutlet,
  VoiceNote,
  VoiceStructuring,
} from '../../types/database.types'

const VISIT_WITH_OUTLET = '*, outlet:outlets(id, name, territory)'

const offline = () => typeof navigator !== 'undefined' && !navigator.onLine
const isQueued = (id: string) => id.startsWith('q-')

export function useMyVisits() {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['my-visits', session?.user.id],
    enabled: !!session?.user.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select(VISIT_WITH_OUTLET)
        .eq('rep_id', session!.user.id)
        .order('visit_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as VisitWithOutlet[]
    },
  })
}

export function useVisit(visitId: string | undefined) {
  return useQuery({
    queryKey: ['visit', visitId],
    enabled: !!visitId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select(VISIT_WITH_OUTLET)
        .eq('id', visitId!)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      const patch = pendingVisitPatch(visitId!)
      return {
        ...(data as unknown as VisitWithOutlet),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        ...(patch.submitted ? { status: 'submitted' as const } : {}),
      }
    },
  })
}

export function useCreateVisit() {
  const queryClient = useQueryClient()
  const { organization, session } = useAuth()

  return useMutation({
    mutationFn: async ({ outletId, gps }: { outletId: string; gps?: Coords | null }) => {
      if (!organization || !session) throw new Error('Not ready.')
      const today = new Date().toISOString().slice(0, 10)

      // One visit per outlet/rep/day — reuse the existing draft if there is one.
      const { data: existing } = await supabase
        .from('visits')
        .select('*')
        .eq('rep_id', session.user.id)
        .eq('outlet_id', outletId)
        .eq('visit_date', today)
        .maybeSingle()
      if (existing) return existing as Visit

      const { data, error } = await supabase
        .from('visits')
        .insert({
          org_id: organization.id,
          outlet_id: outletId,
          rep_id: session.user.id,
          visit_date: today,
          gps_checkin_lat: gps?.lat ?? null,
          gps_checkin_lng: gps?.lng ?? null,
        })
        .select('*')
        .single()
      if (error) throw error
      return data as Visit
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-visits'] })
    },
  })
}

export function useUpdateVisitNotes() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: async ({ visitId, notes }: { visitId: string; notes: string }) => {
      if (offline()) {
        enqueue({ kind: 'notes', visitId, orgId: organization?.id ?? '', payload: { notes } })
        return
      }
      const { error } = await supabase.from('visits').update({ notes }).eq('id', visitId)
      if (error) throw error
    },
    onSuccess: (_d, { visitId }) => {
      queryClient.invalidateQueries({ queryKey: ['visit', visitId] })
    },
  })
}

export function useSubmitVisit() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: async (visitId: string) => {
      if (offline()) {
        enqueue({ kind: 'submit', visitId, orgId: organization?.id ?? '', payload: {} })
        return
      }
      const { error } = await supabase
        .from('visits')
        .update({ status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('id', visitId)
      if (error) throw error
    },
    onSuccess: (_d, visitId) => {
      queryClient.invalidateQueries({ queryKey: ['visit', visitId] })
      queryClient.invalidateQueries({ queryKey: ['my-visits'] })
    },
  })
}

// ---- stock reports -------------------------------------------------------

export function useStockReports(visitId: string | undefined) {
  return useQuery({
    queryKey: ['stock-reports', visitId],
    enabled: !!visitId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_reports')
        .select('*')
        .eq('visit_id', visitId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return [...(data as StockReport[]), ...(pendingStockRows(visitId!) as unknown as StockReport[])]
    },
  })
}

export interface NewStockReport {
  sku: string
  quantity: number | null
  price: number | null
  competitor_price: number | null
  ai_extracted?: Record<string, unknown> | null
}

export function useAddStockReport(visitId: string) {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: async (input: NewStockReport) => {
      if (!organization) throw new Error('No organization.')
      if (offline()) {
        enqueue({ kind: 'stock', visitId, orgId: organization.id, payload: { ...input } })
        return
      }
      const { error } = await supabase.from('stock_reports').insert({
        org_id: organization.id,
        visit_id: visitId,
        sku: input.sku,
        quantity: input.quantity,
        price: input.price,
        competitor_price: input.competitor_price,
        ai_extracted: input.ai_extracted ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock-reports', visitId] }),
  })
}

export function useDeleteStockReport(visitId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      if (isQueued(id)) {
        removeOp(id)
        return
      }
      const { error } = await supabase.from('stock_reports').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock-reports', visitId] }),
  })
}

// ---- merchandising photos ---------------------------------------------------

export function useMerchPhotos(visitId: string | undefined) {
  return useQuery({
    queryKey: ['merch-photos', visitId],
    enabled: !!visitId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchandising_photos')
        .select('*')
        .eq('visit_id', visitId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as MerchandisingPhoto[]
    },
  })
}

export function useAddMerchPhoto(visitId: string) {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: async ({ file, analysis }: { file: File; analysis?: ShelfAnalysis | null }) => {
      if (!organization) throw new Error('No organization.')
      const path = await uploadVisitPhoto(organization.id, visitId, file)
      const { error } = await supabase.from('merchandising_photos').insert({
        org_id: organization.id,
        visit_id: visitId,
        photo_url: path,
        ai_analysis: analysis ? (analysis as unknown as Record<string, unknown>) : null,
        compliance_score: analysis?.compliance_score ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merch-photos', visitId] }),
  })
}

export function useDeleteMerchPhoto(visitId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('merchandising_photos').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merch-photos', visitId] }),
  })
}

// ---- voice notes ----------------------------------------------------------

export function useVoiceNotes(visitId: string | undefined) {
  return useQuery({
    queryKey: ['voice-notes', visitId],
    enabled: !!visitId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('voice_notes')
        .select('*')
        .eq('visit_id', visitId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return [...(data as VoiceNote[]), ...(pendingVoiceRows(visitId!) as unknown as VoiceNote[])]
    },
  })
}

export function useAddVoiceNote(visitId: string) {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: async ({
      transcript,
      structured,
    }: {
      transcript: string
      structured?: VoiceStructuring | null
    }) => {
      if (!organization) throw new Error('No organization.')
      if (offline()) {
        enqueue({ kind: 'voice', visitId, orgId: organization.id, payload: { transcript, structured } })
        return
      }
      const { error } = await supabase.from('voice_notes').insert({
        org_id: organization.id,
        visit_id: visitId,
        audio_transcript: transcript,
        structured_data: structured ? (structured as unknown as Record<string, unknown>) : null,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['voice-notes', visitId] }),
  })
}

// ---- complaints (visit-scoped) ------------------------------------------

export function useVisitComplaints(visitId: string | undefined) {
  return useQuery({
    queryKey: ['visit-complaints', visitId],
    enabled: !!visitId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('visit_id', visitId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return [...(data as Complaint[]), ...(pendingComplaintRows(visitId!) as unknown as Complaint[])]
    },
  })
}

export function useAddComplaint(visitId: string) {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: async ({ category, description }: { category: string; description: string }) => {
      if (!organization) throw new Error('No organization.')
      if (offline()) {
        enqueue({ kind: 'complaint', visitId, orgId: organization.id, payload: { category, description } })
        return
      }
      const { error } = await supabase.from('complaints').insert({
        org_id: organization.id,
        visit_id: visitId,
        category: category || null,
        description,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-complaints', visitId] })
      queryClient.invalidateQueries({ queryKey: ['complaints'] })
    },
  })
}
