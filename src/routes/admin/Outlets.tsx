import { useMemo, useRef, useState, useSyncExternalStore, type DragEvent, type FormEvent } from 'react'
import { AppShell } from '../../components/AppShell'
import { Button } from '../../components/Button'
import { FormField } from '../../components/FormField'
import { useAuth } from '../../lib/auth/AuthContext'
import { addOutlet, getOutlets, subscribeOrgStore } from '../../lib/auth/mockOrgStore'
import { adminNav } from './nav'

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file.'))
    reader.readAsDataURL(file)
  })
}

export function Outlets() {
  const { organization } = useAuth()
  const allOutlets = useSyncExternalStore(subscribeOrgStore, getOutlets)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [territoryFilter, setTerritoryFilter] = useState('all')
  const [visitFilter, setVisitFilter] = useState<'all' | 'visited' | 'due'>('all')
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const orgOutlets = useMemo(
    () => allOutlets.filter((o) => o.org_id === organization?.id),
    [allOutlets, organization],
  )

  const territories = useMemo(() => Array.from(new Set(orgOutlets.map((o) => o.territory))).sort(), [orgOutlets])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orgOutlets.filter((o) => {
      if (territoryFilter !== 'all' && o.territory !== territoryFilter) return false
      if (visitFilter === 'visited' && !o.visited_this_week) return false
      if (visitFilter === 'due' && o.visited_this_week) return false
      if (q && !(o.name.toLowerCase().includes(q) || o.address.toLowerCase().includes(q) || o.distributor.toLowerCase().includes(q))) {
        return false
      }
      return true
    })
  }, [orgOutlets, search, territoryFilter, visitFilter])

  async function handlePhoto(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) return
    setPhotoDataUrl(await readFileAsDataUrl(file))
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    handlePhoto(e.dataTransfer.files?.[0])
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!organization) return
    const form = new FormData(e.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    const territory = String(form.get('territory') ?? '').trim()
    const distributor = String(form.get('distributor') ?? '').trim()
    const address = String(form.get('address') ?? '').trim()
    if (!name) return
    addOutlet({ org_id: organization.id, name, territory, distributor, address, photo_url: photoDataUrl })
    setShowForm(false)
    setPhotoDataUrl(null)
    e.currentTarget.reset()
  }

  return (
    <AppShell nav={adminNav}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Outlets</h2>
        <Button variant="primary" className="w-auto" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : '+ Add outlet'}
        </Button>
      </div>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Outlets visited by field reps for {organization?.name}, with visit history and shop photos.
      </p>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-control border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-3">
            <FormField label="Outlet name" id="outlet_name" name="name" required placeholder="e.g. Big Bazaar -- Ahmedabad" />
          </div>
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Territory" id="outlet_territory" name="territory" placeholder="e.g. North Zone" />
            <FormField label="Distributor" id="outlet_distributor" name="distributor" placeholder="e.g. Greenline Agencies" />
          </div>
          <div className="mb-3">
            <FormField label="Address / location" id="outlet_address" name="address" placeholder="Street, city" />
          </div>

          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Shop photo (optional)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handlePhoto(e.target.files?.[0])}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`mb-4 flex cursor-pointer items-center gap-3 rounded-control border border-dashed px-4 py-4 text-sm transition-colors ${
              dragOver ? 'border-brand bg-brand/5' : 'border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600'
            }`}
          >
            {photoDataUrl ? (
              <img src={photoDataUrl} alt="Shop preview" className="h-14 w-14 rounded-control object-cover" />
            ) : (
              <span className="text-slate-500 dark:text-slate-400">Drop a shop photo here, or click to choose</span>
            )}
          </div>

          <Button type="submit" variant="primary" className="w-auto">
            Add outlet
          </Button>
        </form>
      )}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, address or distributor"
          className="flex-1 rounded-control border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-ring dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        <select
          value={territoryFilter}
          onChange={(e) => setTerritoryFilter(e.target.value)}
          className="rounded-control border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        >
          <option value="all">All territories</option>
          {territories.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={visitFilter}
          onChange={(e) => setVisitFilter(e.target.value as typeof visitFilter)}
          className="rounded-control border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        >
          <option value="all">All visit status</option>
          <option value="visited">Visited this week</option>
          <option value="due">Visit due</option>
        </select>
      </div>

      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
        {filtered.length} of {orgOutlets.length} outlets
      </p>

      <div className="space-y-2">
        {filtered.map((o) => (
          <div
            key={o.id}
            className="flex items-start gap-3 rounded-control border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
          >
            {o.photo_url ? (
              <img src={o.photo_url} alt={o.name} className="h-14 w-14 shrink-0 rounded-control object-cover" />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-control bg-slate-100 text-[10px] text-slate-400 dark:bg-slate-800">
                No photo
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900 dark:text-white">{o.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {o.territory} &middot; {o.distributor}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{o.address}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                o.visited_this_week
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
              }`}
            >
              {o.visited_this_week && o.last_visited_by ? `Visited by ${o.last_visited_by}` : 'Visit due'}
            </span>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No outlets match these filters.</p>}
      </div>
    </AppShell>
  )
}
