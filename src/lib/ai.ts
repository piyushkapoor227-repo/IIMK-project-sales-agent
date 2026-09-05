// Client callers for the AI Edge Functions (Phase 3). Both functions degrade
// gracefully: if ANTHROPIC_API_KEY is not set on the project they return
// `{ ai_disabled: true, ... }` with empty results rather than erroring, so the
// capture flow keeps working with manual entry only.
// Author: Piyush Kapoor.
import { supabase, functionsUrl } from './supabaseClient'
import { DEMO } from './demo/store'
import type { ShelfAnalysis, VoiceStructuring } from '../types/database.types'

// Canned AI output for demo mode (no ANTHROPIC_API_KEY / Edge Function needed).
const DEMO_SHELF: ShelfAnalysis = {
  compliance_score: 68,
  summary:
    'Cola holds eye-level share but chips are under-faced and two price tags are missing. Competitor stock is creeping onto the bottom shelf.',
  detected_skus: [
    { name: 'Acme Cola 500ml', facings: 5 },
    { name: 'Acme Juice 200ml', facings: 3 },
    { name: 'Acme Chips 50g', facings: 2, notes: 'Below 4-facing target' },
  ],
  issues: [
    'Chips facings below target',
    'Missing price tags on Juice 200ml and Water 1L',
    'Competitor SKUs on contracted bottom shelf',
  ],
}

const DEMO_VOICE: VoiceStructuring = {
  summary: 'Retailer flagged a stockout and a competitor promo; wants more shelf space next cycle.',
  stock_mentions: [{ sku: 'Acme Cola 1L', quantity: 0, price: null }],
  competitor_activity: ['Competitor running 10% off cola this week'],
  complaints: ['Cola 1L stocked out due to a missed delivery'],
  action_items: ['Escalate the delivery miss', 'Draft an end-cap proposal for next month'],
}

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
  if (DEMO) return delay(DEMO_SHELF)
  return authedPost<ShelfAnalysis>('analyze-shelf-photo', { image: imageBase64, mime_type: mimeType })
}

export function structureVoiceNote(transcript: string) {
  if (DEMO) return delay(DEMO_VOICE)
  return authedPost<VoiceStructuring>('structure-voice-note', { transcript })
}

function delay<T>(value: T, ms = 700): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
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
