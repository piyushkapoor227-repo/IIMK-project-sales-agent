import { useState, type FormEvent } from 'react'
import { AppShell } from '../../components/AppShell'
import { Button } from '../../components/Button'
import { FormField } from '../../components/FormField'
import { Card, EmptyState, SectionTitle, Spinner } from '../../components/primitives'
import { useCreateOutlet, useOutlets } from '../../lib/queries/useOutlets'
import { adminNav } from './nav'

const EMPTY = { name: '', territory: '', address: '', distributor_name: '' }

export function Outlets() {
  const { data: outlets, isLoading } = useOutlets()
  const create = useCreateOutlet()
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await create.mutateAsync(form)
      setForm(EMPTY)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the outlet.')
    }
  }

  return (
    <AppShell nav={adminNav}>
      <SectionTitle>Outlets</SectionTitle>

      <Card className="mb-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <FormField
            label="Outlet name"
            id="outlet_name"
            required
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Territory"
              id="outlet_territory"
              value={form.territory}
              onChange={(e) => setForm((s) => ({ ...s, territory: e.target.value }))}
            />
            <FormField
              label="Distributor"
              id="outlet_distributor"
              value={form.distributor_name}
              onChange={(e) => setForm((s) => ({ ...s, distributor_name: e.target.value }))}
            />
          </div>
          <FormField
            label="Address"
            id="outlet_address"
            value={form.address}
            onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
          />
          <Button type="submit" className="sm:w-auto" loading={create.isPending}>
            Add outlet
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </Card>

      {isLoading ? (
        <Spinner />
      ) : !outlets?.length ? (
        <EmptyState>No outlets yet. Add your first one above.</EmptyState>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {outlets.map((o) => (
            <li key={o.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>
                <span className="block font-medium text-slate-900 dark:text-white">{o.name}</span>
                <span className="block text-xs text-slate-400">
                  {[o.territory, o.distributor_name, o.address].filter(Boolean).join(' · ') || '—'}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  )
}
