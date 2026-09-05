// Phase 3 AI: shelf/merchandising photo analysis via Claude vision.
// verify_jwt = true (see supabase/config.toml) — only signed-in users of the
// app can call this. Degrades gracefully: with no ANTHROPIC_API_KEY set it
// returns `{ ai_disabled: true }` and empty results so the capture flow keeps
// working with manual entry.
// Author: Piyush Kapoor.
import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import { aiConfigured, askClaudeForJson } from '../_shared/anthropic.ts'

interface ShelfAnalysis {
  compliance_score: number | null
  summary: string
  detected_skus: { name: string; facings: number | null; notes?: string }[]
  issues: string[]
  ai_disabled?: boolean
}

const EMPTY: ShelfAnalysis = {
  compliance_score: null,
  summary: '',
  detected_skus: [],
  issues: [],
}

const SYSTEM = `You are a retail execution auditor for a consumer goods company.
Analyse the shelf photo and report:
- compliance_score: 0-100 estimate of planogram/merchandising compliance (shelf share, blocking, cleanliness, pricing visibility). null if you cannot tell.
- summary: one or two sentences a field sales rep can act on.
- detected_skus: list of visible products with an approximate facing count.
- issues: concrete merchandising problems (out-of-stock gaps, competitor encroachment, damaged POSM, missing price tags).
Keys exactly: compliance_score (number|null), summary (string), detected_skus (array of {name, facings, notes}), issues (array of string).`

Deno.serve(async (req) => {
  const preflight = handleOptions(req)
  if (preflight) return preflight

  try {
    if (!aiConfigured()) {
      return json({ ...EMPTY, ai_disabled: true })
    }

    const { image, mime_type } = await req.json()
    if (!image || typeof image !== 'string') {
      return json({ error: 'image (base64) is required.' }, 400)
    }

    const result = await askClaudeForJson<ShelfAnalysis>(
      SYSTEM,
      [
        {
          type: 'image',
          source: { type: 'base64', media_type: mime_type || 'image/jpeg', data: image },
        },
        { type: 'text', text: 'Audit this shelf.' },
      ],
      1500,
    )

    return json({
      compliance_score:
        typeof result.compliance_score === 'number' ? clamp(result.compliance_score, 0, 100) : null,
      summary: String(result.summary ?? ''),
      detected_skus: Array.isArray(result.detected_skus) ? result.detected_skus.slice(0, 40) : [],
      issues: Array.isArray(result.issues) ? result.issues.slice(0, 20) : [],
    })
  } catch (err) {
    console.error('analyze-shelf-photo:', err)
    return json({ error: 'Photo analysis failed.' }, 502)
  }
})

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
