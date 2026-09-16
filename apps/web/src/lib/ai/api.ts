import { createFlowSupabase } from '@/lib/supabase'

export type TabKey =
  | 'overview'
  | 'journey'
  | 'entrances'
  | 'audience'
  | 'compare'
  | 'holidays'

export interface Insight {
  headline: string
  observations: string[]
  action: string | null
  confidence: 'low' | 'normal'
}

export interface InsightResponse {
  insight: Insight
  model: string
  generatedAt: string
  cached: boolean
}

export interface AskMeta {
  suggestedRoute: string | null
  definitionRefs: string[]
}

export class AiUnavailableError extends Error {
  constructor() {
    super('AI features are not configured on this deployment')
    this.name = 'AiUnavailableError'
  }
}

export class AiRequestError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'AiRequestError'
    this.code = code
  }
}

/**
 * Whether AI is switched on for this deployment.
 *
 * The env var holds a flag, never a key. Gating on the client means a
 * deployment without the feature configured simply does not render the
 * analysis block or the chat, rather than showing controls that fail.
 */
export function isAiEnabled(): boolean {
  const flag = import.meta.env.VITE_AI_ENABLED
  return flag === '1' || flag === 'true'
}

function functionUrl(name: string): string {
  const url = import.meta.env.VITE_SUPABASE_URL
  if (!url) throw new AiUnavailableError()
  return `${url.replace(/\/+$/, '')}/functions/v1/${name}`
}

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = createFlowSupabase()
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new AiRequestError('UNAUTHENTICATED', 'Not signed in')
  return {
    Authorization: `Bearer ${token}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
    'Content-Type': 'application/json',
  }
}

/**
 * Fetch the analysis for one tab.
 *
 * `day` is the day the tab is displaying, which for the pilot is the pinned
 * demo day rather than the wall-clock date. The server validates its format and
 * derives every number itself.
 */
export async function fetchInsight(options: {
  tabKey: TabKey
  day: string
  locale: string
  /** Bypass the server cache and generate a fresh analysis. */
  force?: boolean
  signal?: AbortSignal
}): Promise<InsightResponse> {
  if (!isAiEnabled()) throw new AiUnavailableError()

  const headers = await authHeaders()
  const response = await fetch(functionUrl('ai-insight'), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      tabKey: options.tabKey,
      day: options.day,
      locale: options.locale,
      force: options.force === true,
    }),
    signal: options.signal,
  })

  if (response.status === 503) throw new AiUnavailableError()

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new AiRequestError(
      payload?.error ?? 'REQUEST_FAILED',
      payload?.message ?? `Analysis request failed (${response.status})`,
    )
  }

  return (await response.json()) as InsightResponse
}

export interface AskHandlers {
  onDelta: (text: string) => void
  onMeta: (meta: AskMeta) => void
  onError: (error: AiRequestError) => void
  onDone: () => void
}

/**
 * Ask a question and stream the answer.
 *
 * The response is SSE with four event types. `delta` carries answer prose only;
 * the metadata trailer is held back server-side so it never reaches the reader.
 */
export async function askQuestion(options: {
  question: string
  locale: string
  history: { role: 'user' | 'assistant'; content: string }[]
  signal?: AbortSignal
  handlers: AskHandlers
}): Promise<void> {
  if (!isAiEnabled()) throw new AiUnavailableError()

  const headers = await authHeaders()
  const response = await fetch(functionUrl('ai-ask'), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      question: options.question,
      locale: options.locale,
      history: options.history,
    }),
    signal: options.signal,
  })

  if (response.status === 503) throw new AiUnavailableError()

  if (!response.ok || !response.body) {
    const payload = await response.json().catch(() => null)
    throw new AiRequestError(
      payload?.error ?? 'REQUEST_FAILED',
      payload?.message ?? `Chat request failed (${response.status})`,
    )
  }

  return await consumeSse(response.body, options.handlers)
}

async function consumeSse(
  body: ReadableStream<Uint8Array>,
  handlers: AskHandlers,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // Frames are separated by a blank line; a chunk can split one in half.
      const frames = buffer.split('\n\n')
      buffer = frames.pop() ?? ''

      for (const frame of frames) {
        let event = 'message'
        let data = ''
        for (const line of frame.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim()
          else if (line.startsWith('data:')) data += line.slice(5).trim()
        }
        if (!data) continue

        let parsed: unknown = null
        try {
          parsed = JSON.parse(data)
        } catch {
          continue
        }

        if (event === 'delta') {
          const text = (parsed as { text?: string }).text
          if (typeof text === 'string') handlers.onDelta(text)
        } else if (event === 'meta') {
          const meta = parsed as Partial<AskMeta>
          handlers.onMeta({
            suggestedRoute: meta.suggestedRoute ?? null,
            definitionRefs: Array.isArray(meta.definitionRefs) ? meta.definitionRefs : [],
          })
        } else if (event === 'error') {
          const payload = parsed as { error?: string; message?: string }
          handlers.onError(
            new AiRequestError(payload.error ?? 'UPSTREAM', payload.message ?? 'Chat failed'),
          )
        } else if (event === 'done') {
          handlers.onDone()
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {})
  }
}
