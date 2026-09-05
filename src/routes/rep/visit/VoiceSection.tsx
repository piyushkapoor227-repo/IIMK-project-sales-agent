import { useState } from 'react'
import { Button } from '../../../components/Button'
import { Card, EmptyState, SectionTitle } from '../../../components/primitives'
import { VoiceRecorder } from '../../../components/VoiceRecorder'
import { useAddVoiceNote, useVoiceNotes } from '../../../lib/queries/useVisits'
import { structureVoiceNote } from '../../../lib/ai'
import type { VoiceStructuring } from '../../../types/database.types'

export function VoiceSection({ visitId, readOnly }: { visitId: string; readOnly: boolean }) {
  const { data: notes } = useVoiceNotes(visitId)
  const add = useAddVoiceNote(visitId)

  const [transcript, setTranscript] = useState('')
  const [structured, setStructured] = useState<VoiceStructuring | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function analyze() {
    if (!transcript.trim()) return
    setBusy(true)
    setError(null)
    try {
      const result = await structureVoiceNote(transcript.trim())
      if (result.ai_disabled) {
        setStatus('AI structuring is not configured — the transcript will be saved as-is.')
        setStructured(null)
      } else {
        setStructured(result)
        setStatus(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not analyze the note.')
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (!transcript.trim()) return
    setBusy(true)
    setError(null)
    try {
      await add.mutateAsync({ transcript: transcript.trim(), structured })
      setTranscript('')
      setStructured(null)
      setStatus(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the note.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mb-8">
      <SectionTitle>Voice notes</SectionTitle>

      {notes?.length ? (
        <div className="mb-3 space-y-2">
          {notes.map((n) => {
            const s = n.structured_data as unknown as VoiceStructuring | null
            return (
              <Card key={n.id}>
                {(n as { _pending?: boolean })._pending && (
                  <p className="mb-1 text-[10px] text-amber-600 dark:text-amber-400">pending sync</p>
                )}
                <p className="text-sm text-slate-700 dark:text-slate-200">{n.audio_transcript}</p>
                {s?.summary && (
                  <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">AI: {s.summary}</p>
                )}
                {s?.action_items?.length ? (
                  <ul className="mt-1 list-disc pl-4 text-xs text-slate-500 dark:text-slate-400">
                    {s.action_items.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                ) : null}
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState>No voice notes yet.</EmptyState>
      )}

      {!readOnly && (
        <Card className="mt-3">
          <VoiceRecorder value={transcript} onChange={setTranscript} />

          {structured && (
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800">
              <p className="font-medium text-slate-700 dark:text-slate-200">{structured.summary}</p>
              {structured.competitor_activity?.length ? (
                <p className="mt-1 text-slate-500 dark:text-slate-400">
                  Competitor: {structured.competitor_activity.join('; ')}
                </p>
              ) : null}
              {structured.complaints?.length ? (
                <p className="mt-1 text-amber-700 dark:text-amber-300">
                  Complaints flagged: {structured.complaints.join('; ')}
                </p>
              ) : null}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-auto"
              loading={busy}
              onClick={analyze}
              disabled={!transcript.trim()}
            >
              Analyze with AI
            </Button>
            <Button
              type="button"
              className="w-auto"
              loading={add.isPending}
              onClick={save}
              disabled={!transcript.trim()}
            >
              Save note
            </Button>
          </div>
          {status && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{status}</p>}
          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </Card>
      )}
    </section>
  )
}
