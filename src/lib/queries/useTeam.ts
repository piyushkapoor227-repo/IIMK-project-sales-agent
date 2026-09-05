// Manager / admin views: dashboard rollups + complaint triage workflow.
// RLS decides the row scope (manager = direct reports, admin = whole org).
// Author: Piyush Kapoor.
import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth/AuthContext'
import type { ComplaintWithContext, StockReport, VisitWithRep } from '../../types/database.types'

function startOfWeekISO(): string {
  return mondayOf(new Date()).toISOString().slice(0, 10)
}

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

export function useDashboard() {
  const visits = useTeamVisits()
  const stock = useTeamStockReports()
  const complaints = useComplaints()

  const weekStart = startOfWeekISO()

  const summary = useMemo(() => {
    const v = visits.data ?? []
    const thisWeek = v.filter((x) => x.visit_date >= weekStart)
    const outletsCovered = new Set(thisWeek.map((x) => x.outlet_id)).size
    const submitted = thisWeek.filter((x) => x.status === 'submitted').length
    const openComplaints = (complaints.data ?? []).filter((c) => c.status !== 'resolved').length

    return {
      visitsThisWeek: thisWeek.length,
      outletsCovered,
      submitted,
      drafts: thisWeek.length - submitted,
      openComplaints,
    }
  }, [visits.data, complaints.data, weekStart])

  const skuRollups = useMemo<SkuRollup[]>(() => {
    const rows = stock.data ?? []
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
  }, [stock.data])

  const charts = useMemo(() => {
    const v = visits.data ?? []
    const c = complaints.data ?? []
    const today = new Date()

    // Visits per day — last 14 days.
    const visitsByDay: { label: string; value: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const day = new Date(today.getTime() - i * DAY_MS)
      const iso = day.toISOString().slice(0, 10)
      visitsByDay.push({
        label: day.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
        value: v.filter((x) => x.visit_date === iso).length,
      })
    }

    // Visits by rep.
    const repCounts = new Map<string, number>()
    for (const x of v) {
      const name = x.rep?.full_name || 'Unassigned'
      repCounts.set(name, (repCounts.get(name) ?? 0) + 1)
    }
    const visitsByRep = [...repCounts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)

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

    // Complaints opened vs resolved — last 6 weeks.
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
          c.filter((x) => inRange(x.created_at)).length,
          c.filter((x) => inRange(x.resolved_at)).length,
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
  }, [visits.data, complaints.data, skuRollups])

  return {
    isLoading: visits.isLoading || stock.isLoading || complaints.isLoading,
    summary,
    skuRollups,
    charts,
    recentVisits: (visits.data ?? []).slice(0, 15),
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
