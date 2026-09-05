import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/Button'
import { FormField } from '../../../components/FormField'
import { TextArea, Badge, Card, EmptyState, SectionTitle } from '../../../components/primitives'
import { useAddComplaint, useVisitComplaints } from '../../../lib/queries/useVisits'

export function ComplaintSection({ visitId, readOnly }: { visitId: string; readOnly: boolean }) {
  const { data: complaints } = useVisitComplaints(visitId)
  const add = useAddComplaint(visitId)
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await add.mutateAsync({ category, description })
      setCategory('')
      setDescription('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log the complaint.')
    }
  }

  return (
    <section className="mb-8">
      <SectionTitle>Complaints &amp; issues</SectionTitle>

      {complaints?.length ? (
        <ul className="mb-3 space-y-2">
          {complaints.map((c) => (
            <li key={c.id}>
              <Card>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {c.category || 'General'}
                  </span>
                  <Badge tone={c.status === 'resolved' ? 'green' : c.status === 'assigned' ? 'blue' : 'amber'}>
                    {c.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{c.description}</p>
                {(c as { _pending?: boolean })._pending && (
                  <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">pending sync</p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState>No complaints logged for this visit.</EmptyState>
      )}

      {!readOnly && (
        <Card className="mt-3">
          <form onSubmit={handleAdd} className="space-y-3">
            <FormField
              label="Category"
              id="complaint_category"
              placeholder="e.g. Supply delay, Damaged stock, Scheme dispute"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <TextArea
              label="Description"
              id="complaint_description"
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Button type="submit" loading={add.isPending}>
              Log complaint
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </Card>
      )}
    </section>
  )
}
