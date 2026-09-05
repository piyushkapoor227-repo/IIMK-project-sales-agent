// Thin helper around the Anthropic Messages API for the AI Edge Functions.
// Raw HTTP (fetch) keeps the function dependency-free. If ANTHROPIC_API_KEY is
// not configured the caller should short-circuit and return an `ai_disabled`
// payload rather than invoking this.
// Author: Piyush Kapoor.

const API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-opus-5'

export function aiConfigured(): boolean {
  return !!Deno.env.get('ANTHROPIC_API_KEY')
}

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

export async function askClaudeForJson<T>(
  systemPrompt: string,
  userBlocks: ContentBlock[],
  maxTokens = 1500,
): Promise<T> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: Deno.env.get('ANTHROPIC_MODEL') ?? DEFAULT_MODEL,
      max_tokens: maxTokens,
      system: `${systemPrompt}\n\nRespond with a single valid JSON object and nothing else — no prose, no markdown fences.`,
      messages: [{ role: 'user', content: userBlocks }],
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${detail.slice(0, 300)}`)
  }

  const body = await res.json()
  const text: string = (body.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('')
    .trim()

  return parseJsonLoosely<T>(text)
}

function parseJsonLoosely<T>(raw: string): T {
  const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T
    }
    throw new Error('Model did not return parseable JSON.')
  }
}
