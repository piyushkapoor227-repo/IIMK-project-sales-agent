// Manager / admin views: dashboard rollups + complaint triage workflow.
// RLS decides the row scope (manager = direct reports, admin = whole org).
// Author: Piyush Kapoor.
import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth/AuthContext'
import { useOrgMembers } from './useOrgMembers'
import type { ComplaintWithContext, StockReport, VisitWithRep } from '../../types/database.types'

export interface DashboardFilters {
  days: number | null // null = all time
  zone: string // 'all' or a zone name
  repId: string // 'all' or a profile id
}

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = { days: 30, zone: 'all', repId: 'all' }

function mondayOf(input: Date): Date {
  const d = new Date(input)
  const day = (d.getDay() + 6) % 7 // Monday = 0
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

const DAY_MS = 86_400_000

export function useTeamVisits() {
  return useQuery({
    queryKey: ['team-visits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select('*, outlet:outlets(id, name, territory), rep:profiles(id, full_name)')
        .order('visit_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data as unknown as VisitWithRep[]
    },
  })
}

export function useTeamStockReports() {
  return useQuery({
    queryKey: ['team-stock-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000)
      if (error) throw error
      return data as StockReport[]
    },
  })
}

export interface SkuRollup {
  sku: string
  samples: number
  avgPrice: number | null
  avgCompetitorPrice: number | null
  priceGap: number | null
}

export function useDashboard(filters: DashboardFilters = DEFAULT_DASHBOARD_FILTERS) {
  const visits = useTeamVisits()
  const stock = useTeamStockReports()
  const complaints = useComplaints()
  const members = useOrgMembers()

  const { days, zone, repId } = filters

  const repZone = useMemo(() => {
    const map = new Map<string, string | null>()
    for (const m of members.data ?? []) map.set(m.id, m.zone)
    return map
  }, [members.data])

  const zones = useMemo(() => {
    const set = new Set<string>()
    for (const m of members.data ?? []) if (m.zone) set.add(m.zone)
    return [...set].sort()
  }, [members.data])

  const reps = useMemo(
    () =>
      (members.data ?? [])
        .filter((m) => m.role === 'rep' && (zone === 'all' || m.zone === zone))
        .map((m) => ({ id: m.id, name: m.full_name || m.employee_code || m.id.slice(0, 6) })),
    [members.data, zone],
  )

  const cutoff = days == null ? null : new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10)
  const windowLabel = days == null ? 'All time' : `Last ${days} days`

  const scopedVisits = useMemo(() => {
    return (visits.data ?? []).filter((v) => {
      if (cutoff && v.visit_date < cutoff) return false
      if (zone !== 'all' && repZone.get(v.rep_id) !== zone) return false
      if (repId !== 'all' && v.rep_id !== repId) return false
      return true
    })
  }, [visits.data, cutoff, zone, repId, repZone])

  const scopedVisitIds = useMemo(() => new Set(scopedVisits.map((v) => v.id)), [scopedVisits])

  // Zone/rep scoped but NOT date-limited — for the 6-week complaint trend.
  const zoneScopedComplaints = useMemo(() => {
    const zoneVisitIds = new Set(
      (visits.data ?? [])
        .filter(
          (v) =>
            (zone === 'all' || repZone.get(v.rep_id) === zone) &&
            (repId === 'all' || v.rep_id === repId),
        )
        .map((v) => v.id),
    )
    return (complaints.data ?? []).filter(
      (c) => !c.visit_id || zoneVisitIds.has(c.visit_id) || (zone === 'all' && repId === 'all'),
    )
  }, [complaints.data, visits.data, zone, repId, repZone])

  const scopedComplaints = useMemo(
    () =>
      zoneScopedComplaints.filter((c) => !cutoff || (c.created_at ?? '').slice(0, 10) >= cutoff),
    [zoneScopedComplaints, cutoff],
  )

  const scopedStock = useMemo(
    () => (stock.data ?? []).filter((s) => scopedVisitIds.has(s.visit_id)),
    [stock.data, scopedVisitIds],
  )

  const summary = useMemo(() => {
    const submitted = scopedVisits.filter((x) => x.status === 'submitted').length
    return {
      visitsThisWeek: scopedVisits.length,
      outletsCovered: new Set(scopedVisits.map((x) => x.outlet_id)).size,
      submitted,
      drafts: scopedVisits.length - submitted,
      openComplaints: scopedComplaints.filter((c) => c.status !== 'resolved').length,
    }
  }, [scopedVisits, scopedComplaints])

  const skuRollups = useMemo<SkuRollup[]>(() => {
    const rows = scopedStock
    const byKey = new Map<string, StockReport[]>()
    for (const r of rows) {
      const key = r.sku.trim().toLowerCase()
      if (!key) continue
      byKey.set(key, [...(byKey.get(key) ?? []), r])
    }
    const avg = (nums: number[]) =>
      nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null

    return [...byKey.values()]
      .map((group) => {
        const prices = group.map((g) => g.price).filter((n): n is number => n != null)
        const comp = group.map((g) => g.competitor_price).filter((n): n is number => n != null)
        const avgPrice = avg(prices)
        const avgCompetitorPrice = avg(comp)
        return {
          sku: group[0].sku,
          samples: group.length,
          avgPrice,
          avgCompetitorPrice,
          priceGap:
            avgPrice != null && avgCompetitorPrice != null
              ? avgPrice - avgCompetitorPrice
              : null,
        }
      })
      .sort((a, b) => b.samples - a.samples)
  }, [scopedStock])

  const charts = useMemo(() => {
    const v = scopedVisits
    const c = scopedComplaints
    const today = new Date()

    // Visits per day — over the selected window (capped at 30 daily bars).
    const dayCount = Math.min(days ?? 14, 30)
    const visitsByDay: { label: string; value: number }[] = []
    for (let i = dayCount - 1; i >= 0; i--) {
      const day = new Date(today.getTime() - i * DAY_MS)
      const iso = day.toISOString().slice(0, 10)
      visitsByDay.push({
        label: day.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
        value: v.filter((x) => x.visit_date === iso).length,
      })
    }

    // Visits by rep.
    const repAgg = new Map<string, { label: string; value: number; repId: string }>()
    for (const x of v) {
      const key = x.rep_id
      const cur = repAgg.get(key) ?? { label: x.rep?.full_name || 'Unassigned', value: 0, repId: key }
      cur.value++
      repAgg.set(key, cur)
    }
    const visitsByRep = [...repAgg.values()].sort((a, b) => b.value - a.value).slice(0, 12)

    // Outlet coverage by territory — distinct outlets visited.
    const territoryOutlets = new Map<string, Set<string>>()
    for (const x of v) {
      const t = x.outlet?.territory || 'Unassigned'
      if (!territoryOutlets.has(t)) territoryOutlets.set(t, new Set())
      territoryOutlets.get(t)!.add(x.outlet_id)
    }
    const coverageByTerritory = [...territoryOutlets.entries()]
      .map(([label, set]) => ({ label, value: set.size }))
      .sort((a, b) => b.value - a.value)

    // Complaints by status.
    const statusCount = (s: string) => c.filter((x) => x.status === s).length
    const complaintsByStatus = [
      { label: 'Open', value: statusCount('open'), color: 'var(--chart-warning)' },
      { label: 'Assigned', value: statusCount('assigned'), color: 'var(--chart-s1)' },
      { label: 'Resolved', value: statusCount('resolved'), color: 'var(--chart-good)' },
    ]

    // Complaints opened vs resolved — always the last 6 weeks (zone/rep scoped,
    // but not limited by the date filter — it is its own trend window).
    const complaintsByWeek: { label: string; values: [number, number] }[] = []
    const thisMonday = mondayOf(today)
    for (let i = 5; i >= 0; i--) {
      const start = new Date(thisMonday.getTime() - i * 7 * DAY_MS)
      const end = new Date(start.getTime() + 7 * DAY_MS)
      const inRange = (iso: string | null) => {
        if (!iso) return false
        const t = new Date(iso).getTime()
        return t >= start.getTime() && t < end.getTime()
      }
      complaintsByWeek.push({
        label: start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
        values: [
          zoneScopedComplaints.filter((x) => inRange(x.created_at)).length,
          zoneScopedComplaints.filter((x) => inRange(x.resolved_at)).length,
        ],
      })
    }

    // Price vs competitor — SKUs with the most samples.
    const priceCompare = skuRollups
      .filter((s) => s.avgPrice != null || s.avgCompetitorPrice != null)
      .slice(0, 6)
      .map((s) => ({ label: s.sku, ours: s.avgPrice, competitor: s.avgCompetitorPrice }))

    return {
      visitsByDay,
      visitsByRep,
      coverageByTerritory,
      complaintsByStatus,
      complaintsByWeek,
      priceCompare,
    }
  }, [scopedVisits, scopedComplaints, zoneScopedComplaints, skuRollups, days])

  return {
    isLoading: visits.isLoading || stock.isLoading || complaints.isLoading || members.isLoading,
    windowLabel,
    summary,
    skuRollups,
    charts,
    zones,
    reps,
    recentVisits: scopedVisits.slice(0, 15),
  }
}

// ---- complaint triage ---------------------------------------------------

export function useComplaints() {
  return useQuery({
    queryKey: ['complaints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('complaints')
        .select('*, assignee:profiles(id, full_name), visit:visits(id, outlet:outlets(id, name))')
        .order('status', { ascending: true })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as ComplaintWithContext[]
    },
  })
}

export function useAssignComplaint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, assigneeId }: { id: string; assigneeId: string | null }) => {
      const { error } = await supabase
        .from('complaints')
        .update({
          assigned_to: assigneeId,
          status: assigneeId ? 'assigned' : 'open',
          resolved_at: null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['complaints'] }),
  })
}

export function useResolveComplaint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, resolved }: { id: string; resolved: boolean }) => {
      const { error } = await supabase
        .from('complaints')
        .update({
          status: resolved ? 'resolved' : 'open',
          resolved_at: resolved ? new Date().toISOString() : null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['complaints'] }),
  })
}

export function useIsManagerOrAdmin() {
  const { profile } = useAuth()
  return profile?.role === 'manager' || profile?.role === 'admin'
}
