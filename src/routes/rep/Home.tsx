import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Button } from '../../components/Button'
import { FormField } from '../../components/FormField'
import { Badge, Card, EmptyState, SectionTitle, SelectField, Spinner } from '../../components/primitives'
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
        <Spinner label="Loading outlets…" />
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
              Check in
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setShowNewOutlet((s) => !s)}
            className="mt-3 text-sm font-medium text-slate-500 underline hover:text-slate-800 dark:hover:text-slate-200"
          >
            {showNewOutlet ? 'Cancel' : '+ Add a new outlet'}
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
        <Spinner />
      ) : todaysVisits.length === 0 ? (
        <EmptyState>No visits yet today. Check in to an outlet above to get started.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {todaysVisits.map((v) => (
            <li key={v.id}>
              <button
                onClick={() => navigate(`/rep/visit/${v.id}`)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {v.outlet?.name ?? 'Outlet'}
                </span>
                <Badge tone={v.status === 'submitted' ? 'green' : 'amber'}>
                  {v.status === 'submitted' ? 'Submitted' : 'Draft'}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  )
}
