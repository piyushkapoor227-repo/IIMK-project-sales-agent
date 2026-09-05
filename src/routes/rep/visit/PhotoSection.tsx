import { useRef, useState } from 'react'
import { Button } from '../../../components/Button'
import { Badge, Card, EmptyState, SectionTitle } from '../../../components/primitives'
import { SignedImage } from '../../../components/SignedImage'
import { useAddMerchPhoto, useDeleteMerchPhoto, useMerchPhotos } from '../../../lib/queries/useVisits'
import { analyzeShelfPhoto, fileToBase64 } from '../../../lib/ai'
import { useOnline } from '../../../lib/useOnline'
import type { ShelfAnalysis } from '../../../types/database.types'

export function PhotoSection({ visitId, readOnly }: { visitId: string; readOnly: boolean }) {
  const online = useOnline()
  const { data: photos } = useMerchPhotos(visitId)
  const add = useAddMerchPhoto(visitId)
  const remove = useDeleteMerchPhoto(visitId)
  const inputRef = useRef<HTMLInputElement>(null)

  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFile() {
    const file = inputRef.current?.files?.[0]
    if (!file) return
    setError(null)
    setBusy(true)
    let analysis: ShelfAnalysis | null = null
    try {
      setStatus('Analyzing shelf photo with AI…')
      try {
        const base64 = await fileToBase64(file)
        analysis = await analyzeShelfPhoto(base64, file.type || 'image/jpeg')
        if (analysis.ai_disabled) {
          setStatus('AI analysis is not configured — photo saved without a compliance score.')
          analysis = null
        }
      } catch {
        setStatus('AI analysis unavailable — saving the photo anyway.')
        analysis = null
      }
      setStatus('Uploading…')
      await add.mutateAsync({ file, analysis })
      setStatus(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
      setStatus(null)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <section className="mb-8">
      <SectionTitle>Merchandising photos</SectionTitle>

      {photos?.length ? (
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          {photos.map((p) => {
            const ai = p.ai_analysis as unknown as ShelfAnalysis | null
            return (
              <Card key={p.id}>
                <SignedImage
                  path={p.photo_url}
                  alt="Shelf"
                  className="mb-2 h-40 w-full rounded-lg object-cover"
                />
                {p.compliance_score != null && (
                  <div className="mb-1">
                    <Badge tone={p.compliance_score >= 70 ? 'green' : p.compliance_score >= 40 ? 'amber' : 'red'}>
                      Compliance {Math.round(p.compliance_score)}%
                    </Badge>
                  </div>
                )}
                {ai?.summary && <p className="text-xs text-slate-500 dark:text-slate-400">{ai.summary}</p>}
                {ai?.issues?.length ? (
                  <ul className="mt-1 list-disc pl-4 text-xs text-amber-700 dark:text-amber-300">
                    {ai.issues.map((i, idx) => (
                      <li key={idx}>{i}</li>
                    ))}
                  </ul>
                ) : null}
                {!readOnly && (
                  <button
                    onClick={() => remove.mutate(p.id)}
                    className="mt-2 text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState>No photos yet.</EmptyState>
      )}

      {!readOnly && (
        <div className="mt-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            id="merch_photo"
            onChange={handleFile}
          />
          <Button
            type="button"
            variant="outline"
            className="w-auto"
            loading={busy}
            disabled={!online}
            onClick={() => inputRef.current?.click()}
          >
            Add shelf photo
          </Button>
          {!online && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Photos need a connection — reconnect to add one. Stock, notes and complaints still work offline.
            </p>
          )}
          {status && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{status}</p>}
          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </section>
  )
}
