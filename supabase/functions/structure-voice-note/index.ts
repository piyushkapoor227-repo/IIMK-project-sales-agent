// Phase 3 AI: turns a free-text visit transcript into structured fields via
// Claude. verify_jwt = true. Degrades gracefully when ANTHROPIC_API_KEY is
// unset (`ai_disabled: true`, empty results).
// Author: Piyush Kapoor.
import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import { aiConfigured, askClaudeForJson } from '../_shared/anthropic.ts'

interface VoiceStructuring {
  summary: string
  stock_mentions: { sku: string; quantity: number | null; price: number | null }[]
  competitor_activity: string[]
  complaints: string[]
  action_items: string[]
  ai_disabled?: boolean
}

const EMPTY: VoiceStructuring = {
  summary: '',
  stock_mentions: [],
  competitor_activity: [],
  complaints: [],
  action_items: [],
}

const SYSTEM = `You structure field sales visit notes for a consumer goods company.
From the rep's transcript extract:
- summary: 1-2 sentence recap.
- stock_mentions: products discussed with quantity/price if stated ({sku, quantity, price}; use null when not stated).
- competitor_activity: competitor promos, pricing, new listings, extra shelf space.
- complaints: retailer or distributor issues that need follow-up.
- action_items: concrete next steps for the rep or manager.
Keys exactly: summary (string), stock_mentions (array), competitor_activity (array of string), complaints (array of string), action_items (array of string).`

Deno.serve(async (req) => {
  const preflight = handleOptions(req)
  if (preflight) return preflight

  try {
    if (!aiConfigured()) {
      return json({ ...EMPTY, ai_disabled: true })
    }

    const { transcript } = await req.json()
    if (!transcript || typeof transcript !== 'string') {
      return json({ error: 'transcript is required.' }, 400)
    }

    const result = await askClaudeForJson<VoiceStructuring>(
      SYSTEM,
      [{ type: 'text', text: transcript.slice(0, 8000) }],
      1200,
    )

    return json({
      summary: String(result.summary ?? ''),
      stock_mentions: Array.isArray(result.stock_mentions) ? result.stock_mentions.slice(0, 30) : [],
      competitor_activity: Array.isArray(result.competitor_activity)
        ? result.competitor_activity.slice(0, 20)
        : [],
      complaints: Array.isArray(result.complaints) ? result.complaints.slice(0, 20) : [],
      action_items: Array.isArray(result.action_items) ? result.action_items.slice(0, 20) : [],
    })
  } catch (err) {
    console.error('structure-voice-note:', err)
    return json({ error: 'Voice structuring failed.' }, 502)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
