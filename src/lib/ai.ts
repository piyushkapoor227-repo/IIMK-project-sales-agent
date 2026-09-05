// Client callers for the AI Edge Functions (Phase 3). Both functions degrade
// gracefully: if ANTHROPIC_API_KEY is not set on the project they return
// `{ ai_disabled: true, ... }` with empty results rather than erroring, so the
// capture flow keeps working with manual entry only.
// Author: Piyush Kapoor.
import { supabase, functionsUrl } from './supabaseClient'
import type { ShelfAnalysis, VoiceStructuring } from '../types/database.types'

async function authedPost<T>(fn: string, body: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not authenticated.')

  const res = await fetch(`${functionsUrl}/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? `${fn} failed.`)
  return json as T
}

export function analyzeShelfPhoto(imageBase64: string, mimeType: string) {
  return authedPost<ShelfAnalysis>('analyze-shelf-photo', { image: imageBase64, mime_type: mimeType })
}

export function structureVoiceNote(transcript: string) {
  return authedPost<VoiceStructuring>('structure-voice-note', { transcript })
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = () => reject(new Error('Could not read file.'))
    reader.readAsDataURL(file)
  })
}
