import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, MapPin, Plus } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { Button } from '../../components/Button'
import { FormField } from '../../components/FormField'
import { Badge, Card, EmptyState, SectionTitle, SelectField } from '../../components/primitives'
import { Skeleton } from '../../components/Skeleton'
import { useOutlets, useCreateOutlet } from '../../lib/queries/useOutlets'
import { useCreateVisit, useMyVisits } from '../../lib/queries/useVisits'
import { getCurrentPosition } from '../../lib/geo'
import { repNav } from './nav'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function RepHome() {
  const navigate = useNavigate()
  const { data: outlets, isLoading: outletsLoading } = useOutlets()
  const { data: visits, isLoading: visitsLoading } = useMyVisits()
  const createOutlet = useCreateOutlet()
  const createVisit = useCreateVisit()

  const [outletId, setOutletId] = useState('')
  const [showNewOutlet, setShowNewOutlet] = useState(false)
  const [newOutlet, setNewOutlet] = useState({ name: '', territory: '', address: '', distributor_name: '' })
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  const todaysVisits = useMemo(
    () => (visits ?? []).filter((v) => v.visit_date === today()),
    [visits],
  )

  async function startVisit(id: string) {
    setError(null)
    setStarting(true)
    try {
      let gps = null
      try {
        gps = await getCurrentPosition()
      } catch {
        /* location optional */
      }
      const visit = await createVisit.mutateAsync({ outletId: id, gps })
      navigate(`/rep/visit/${visit.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the visit.')
    } finally {
      setStarting(false)
    }
  }

  async function handleStartExisting(e: FormEvent) {
    e.preventDefault()
    if (!outletId) {
      setError('Pick an outlet first.')
      return
    }
    await startVisit(outletId)
  }

  async function handleCreateOutlet(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      let gps = null
      try {
        gps = await getCurrentPosition()
      } catch {
        /* optional */
      }
      const outlet = await createOutlet.mutateAsync({ ...newOutlet, gps })
      setShowNewOutlet(false)
      setNewOutlet({ name: '', territory: '', address: '', distributor_name: '' })
      await startVisit(outlet.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the outlet.')
    }
  }

  return (
    <AppShell nav={repNav}>
      <SectionTitle>Start a visit</SectionTitle>

      {outletsLoading ? (
        <Skeleton className="mb-6 h-28 w-full" />
      ) : (
        <Card className="mb-6">
          <form onSubmit={handleStartExisting} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <SelectField
                label="Outlet"
                id="outlet_pick"
                value={outletId}
                onChange={(e) => setOutletId(e.target.value)}
              >
                <option value="">Select an outlet…</option>
                {outlets?.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                    {o.territory ? ` — ${o.territory}` : ''}
                  </option>
                ))}
              </SelectField>
            </div>
            <Button type="submit" className="sm:w-auto" loading={starting}>
              <MapPin size={16} /> Check in
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setShowNewOutlet((s) => !s)}
            className="mt-3 flex items-center gap-1 text-sm font-medium text-accent-600 hover:underline dark:text-accent-400"
          >
            {showNewOutlet ? 'Cancel' : (<><Plus size={14} /> Add a new outlet</>)}
          </button>

          {showNewOutlet && (
            <form onSubmit={handleCreateOutlet} className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <FormField
                label="Outlet name"
                id="new_outlet_name"
                required
                value={newOutlet.name}
                onChange={(e) => setNewOutlet((s) => ({ ...s, name: e.target.value }))}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  label="Territory"
                  id="new_outlet_territory"
                  value={newOutlet.territory}
                  onChange={(e) => setNewOutlet((s) => ({ ...s, territory: e.target.value }))}
                />
                <FormField
                  label="Distributor"
                  id="new_outlet_distributor"
                  value={newOutlet.distributor_name}
                  onChange={(e) => setNewOutlet((s) => ({ ...s, distributor_name: e.target.value }))}
                />
              </div>
              <FormField
                label="Address"
                id="new_outlet_address"
                value={newOutlet.address}
                onChange={(e) => setNewOutlet((s) => ({ ...s, address: e.target.value }))}
              />
              <Button type="submit" loading={createOutlet.isPending || starting}>
                Add outlet & check in
              </Button>
            </form>
          )}
        </Card>
      )}

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <SectionTitle>Today&apos;s visits</SectionTitle>
      {visitsLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : todaysVisits.length === 0 ? (
        <EmptyState>No visits yet today. Check in to an outlet above to get started.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {todaysVisits.map((v) => (
            <li key={v.id}>
              <button
                onClick={() => navigate(`/rep/visit/${v.id}`)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-accent-300 hover:bg-accent-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-accent-700 dark:hover:bg-slate-800/50"
              >
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {v.outlet?.name ?? 'Outlet'}
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone={v.status === 'submitted' ? 'green' : 'amber'}>
                    {v.status === 'submitted' ? 'Submitted' : 'Draft'}
                  </Badge>
                  <ChevronRight size={16} className="text-slate-400" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  )
}
