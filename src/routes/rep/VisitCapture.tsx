import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { Button } from '../../components/Button'
import { Badge, Card, TextArea } from '../../components/primitives'
import { Skeleton } from '../../components/Skeleton'
import { useSubmitVisit, useUpdateVisitNotes, useVisit } from '../../lib/queries/useVisits'
import { useToast } from '../../components/Toast'
import { useOnline } from '../../lib/useOnline'
import { StockSection } from './visit/StockSection'
import { PhotoSection } from './visit/PhotoSection'
import { VoiceSection } from './visit/VoiceSection'
import { ComplaintSection } from './visit/ComplaintSection'
import { repNav } from './nav'

function draftKey(visitId: string) {
  return `visit-notes-draft:${visitId}`
}

export function VisitCapture() {
  const { visitId } = useParams<{ visitId: string }>()
  const { data: visit, isLoading } = useVisit(visitId)
  const saveNotes = useUpdateVisitNotes()
  const submit = useSubmitVisit()
  const toast = useToast()
  const online = useOnline()

  const [notes, setNotes] = useState('')
  const [notesLoaded, setNotesLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Hydrate notes once: prefer an unsaved local draft, else the saved value.
  useEffect(() => {
    if (!visit || notesLoaded) return
    let draft: string | null = null
    try {
      draft = localStorage.getItem(draftKey(visit.id))
    } catch {
      /* storage may be unavailable */
    }
    setNotes(draft ?? visit.notes ?? '')
    setNotesLoaded(true)
  }, [visit, notesLoaded])

  useEffect(() => {
    if (!visit || !notesLoaded) return
    try {
      localStorage.setItem(draftKey(visit.id), notes)
    } catch {
      /* ignore */
    }
  }, [notes, visit, notesLoaded])

  if (isLoading) {
    return (
      <AppShell nav={repNav}>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </AppShell>
    )
  }

  if (!visit) {
    return (
      <AppShell nav={repNav}>
        <p className="text-sm text-slate-500">Visit not found.</p>
        <Link to="/rep" className="text-sm underline">
          Back to today
        </Link>
      </AppShell>
    )
  }

  const readOnly = visit.status === 'submitted'

  async function persistNotes() {
    if (!visit) return
    setError(null)
    try {
      await saveNotes.mutateAsync({ visitId: visit.id, notes })
      try {
        localStorage.removeItem(draftKey(visit.id))
      } catch {
        /* ignore */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save notes.')
    }
  }

  async function handleSubmit() {
    if (!visit) return
    setError(null)
    try {
      if (notes !== (visit.notes ?? '')) {
        await saveNotes.mutateAsync({ visitId: visit.id, notes })
      }
      await submit.mutateAsync(visit.id)
      try {
        localStorage.removeItem(draftKey(visit.id))
      } catch {
        /* ignore */
      }
      toast.success(online ? 'Visit submitted.' : 'Visit will be submitted when you reconnect.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the visit.')
    }
  }

  return (
    <AppShell nav={repNav}>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <Link to="/rep" className="text-xs text-slate-400 hover:underline">
            ← Today
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
            {visit.outlet?.name ?? 'Outlet visit'}
          </h1>
          <p className="text-xs text-slate-400">
            {visit.visit_date}
            {visit.outlet?.territory ? ` · ${visit.outlet.territory}` : ''}
          </p>
        </div>
        <Badge tone={readOnly ? 'green' : 'amber'}>{readOnly ? 'Submitted' : 'Draft'}</Badge>
      </div>

      {readOnly && (
        <Card className="mb-6 border-emerald-200 bg-emerald-50 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          This visit has been submitted and is now read-only.
        </Card>
      )}

      <StockSection visitId={visit.id} readOnly={readOnly} />
      <PhotoSection visitId={visit.id} readOnly={readOnly} />
      <VoiceSection visitId={visit.id} readOnly={readOnly} />
      <ComplaintSection visitId={visit.id} readOnly={readOnly} />

      <section className="mb-8">
        <TextArea
          label="Visit summary notes"
          id="visit_notes"
          rows={3}
          value={notes}
          disabled={readOnly}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => !readOnly && persistNotes()}
        />
      </section>

      {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!readOnly && (
        <Button loading={submit.isPending || saveNotes.isPending} onClick={handleSubmit}>
          <Check size={16} /> Submit visit
        </Button>
      )}
    </AppShell>
  )
}
