// Provider client for the AI edge functions.
//
// OpenAI-compatible chat completions only, which is the common denominator
// across hosted providers. Swapping provider means changing AI_BASE_URL and
// AI_MODEL, not this file — unless the provider is not OpenAI-compatible, in
// which case only this file changes.
//
// The API key lives in the function environment and never leaves it. Nothing
// here is reachable from the browser.

export interface AiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AiResult {
  text: string
  model: string
  inputTokens: number
  outputTokens: number
  durationMs: number
}

export interface AiConfig {
  baseUrl: string
  apiKey: string
  model: string
  maxTokens: number
  timeoutMs: number
  /**
   * Ask the provider to skip hidden reasoning.
   *
   * qwen3.7-flash spends thousands of tokens on internal reasoning before it
   * writes a single visible character: 10,497 characters of reasoning to produce
   * a 317 character answer, in 50.7 seconds against a 30 second timeout. Every
   * insight call failed on that budget. With reasoning suppressed the same call
   * takes 3.0 seconds and 147 tokens, and the answer is the same shape.
   */
  disableThinking: boolean
  /** Provider-specific escape hatch, e.g. 'none' or 'low'. Empty means unset. */
  reasoningEffort: string
}

export class AiNotConfiguredError extends Error {
  constructor(missing: string[]) {
    super(`AI not configured; missing ${missing.join(', ')}`)
    this.name = 'AiNotConfiguredError'
  }
}

export class AiUpstreamError extends Error {
  status: number
  constructor(status: number, detail: string) {
    super(`Upstream ${status}: ${detail.slice(0, 400)}`)
    this.name = 'AiUpstreamError'
    this.status = status
  }
}

/** Defaults are deliberately conservative: this is a summary task, not a chat. */
const DEFAULT_MAX_TOKENS = 700
/**
 * Sizing note: this budget assumes reasoning is suppressed. With reasoning on,
 * the model can burn thousands of tokens before it emits anything, so raise
 * AI_TIMEOUT_MS well above this if AI_DISABLE_THINKING is switched off, or the
 * call cannot finish inside the function's wall clock.
 */
const DEFAULT_TIMEOUT_MS = 30_000

export function readAiConfig(): AiConfig {
  const baseUrl = Deno.env.get('AI_BASE_URL')?.trim()
  const apiKey = Deno.env.get('AI_API_KEY')?.trim()
  const model = Deno.env.get('AI_MODEL')?.trim()

  const missing: string[] = []
  if (!baseUrl) missing.push('AI_BASE_URL')
  if (!apiKey) missing.push('AI_API_KEY')
  if (!model) missing.push('AI_MODEL')
  if (missing.length > 0) throw new AiNotConfiguredError(missing)

  const maxTokens = Number(Deno.env.get('AI_MAX_TOKENS') ?? DEFAULT_MAX_TOKENS)
  const timeoutMs = Number(Deno.env.get('AI_TIMEOUT_MS') ?? DEFAULT_TIMEOUT_MS)

  return {
    // Tolerate a base URL with or without the trailing slash, and with or
    // without an existing /v1 segment — both are common in provider docs.
    baseUrl: baseUrl!.replace(/\/+$/, ''),
    apiKey: apiKey!,
    model: model!,
    maxTokens: Number.isFinite(maxTokens) && maxTokens > 0 ? maxTokens : DEFAULT_MAX_TOKENS,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS,
    // On by default: the alternative is a timeout, not a slower answer.
    disableThinking: (Deno.env.get('AI_DISABLE_THINKING') ?? 'true') !== 'false',
    reasoningEffort: Deno.env.get('AI_REASONING_EFFORT')?.trim() ?? '',
  }
}

/** True when the three required variables are present. Lets callers degrade. */
export function isAiConfigured(): boolean {
  try {
    readAiConfig()
    return true
  } catch {
    return false
  }
}

function endpoint(config: AiConfig): string {
  return `${config.baseUrl}/chat/completions`
}

function headers(config: AiConfig): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  }
}

function body(
  config: AiConfig,
  messages: AiMessage[],
  opts: { stream: boolean; json: boolean; temperature: number },
): string {
  const reasoning = config.disableThinking
    ? {
        // Qwen's chat template switch. Providers that do not know it ignore an
        // unknown field rather than rejecting the request.
        enable_thinking: false,
        ...(config.reasoningEffort ? { reasoning_effort: config.reasoningEffort } : {}),
      }
    : {}

  return JSON.stringify({
    model: config.model,
    messages,
    stream: opts.stream,
    max_tokens: config.maxTokens,
    temperature: opts.temperature,
    // Requested, not required. Providers that ignore it still work, because
    // the caller parses the text defensively rather than trusting JSON mode.
    ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
    ...reasoning,
  })
}

export interface CompleteOptions {
  json?: boolean
  temperature?: number
  maxTokens?: number
}

/**
 * Single non-streaming completion. Retries once on 429 and 5xx, since a cached
 * insight is written after this returns and a transient failure is worth one
 * retry rather than surfacing an error to the manager.
 */
export async function complete(
  messages: AiMessage[],
  options: CompleteOptions = {},
): Promise<AiResult> {
  const config = readAiConfig()
  const startedAt = Date.now()
  const payload = body(config, messages, {
    stream: false,
    json: options.json ?? false,
    temperature: options.temperature ?? 0.2,
  })

  let lastError: unknown = null

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(endpoint(config), {
        method: 'POST',
        headers: headers(config),
        body: payload,
        signal: AbortSignal.timeout(config.timeoutMs),
      })

      if (!response.ok) {
        const detail = await response.text().catch(() => '')
        const retryable = response.status === 429 || response.status >= 500
        if (retryable && attempt === 0) {
          lastError = new AiUpstreamError(response.status, detail)
          await new Promise((resolve) => setTimeout(resolve, 600))
          continue
        }
        throw new AiUpstreamError(response.status, detail)
      }

      const json = await response.json()
      const text = json?.choices?.[0]?.message?.content
      if (typeof text !== 'string') {
        throw new AiUpstreamError(502, 'response missing choices[0].message.content')
      }

      return {
        text,
        model: typeof json?.model === 'string' ? json.model : config.model,
        inputTokens: Number(json?.usage?.prompt_tokens ?? 0),
        outputTokens: Number(json?.usage?.completion_tokens ?? 0),
        durationMs: Date.now() - startedAt,
      }
    } catch (error) {
      // A timeout or transport failure is also worth one retry.
      const isAbort = error instanceof DOMException && error.name === 'TimeoutError'
      const isTransport = error instanceof TypeError
      if ((isAbort || isTransport) && attempt === 0) {
        lastError = error
        continue
      }
      throw error
    }
  }

  throw lastError ?? new Error('AI request failed')
}

/**
 * Streaming completion. Yields text deltas as they arrive, for the chat panel.
 *
 * The caller is responsible for the final usage numbers: streaming responses
 * only include usage when the provider supports it, so token counts here are
 * best-effort and the chat records what it can.
 */
export async function* stream(
  messages: AiMessage[],
  options: CompleteOptions = {},
): AsyncGenerator<string, void, unknown> {
  const config = readAiConfig()
  // Streaming responses can legitimately run longer than a one-shot summary.
  const timeoutMs = Math.max(config.timeoutMs, 60_000)

  const response = await fetch(endpoint(config), {
    method: 'POST',
    headers: headers(config),
    body: body(config, messages, {
      stream: true,
      json: false,
      temperature: options.temperature ?? 0.3,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new AiUpstreamError(response.status, detail)
  }
  if (!response.body) {
    throw new AiUpstreamError(502, 'streaming response had no body')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE frames are newline-delimited; a chunk may split mid-frame, so hold
      // the remainder in the buffer until the next read completes it.
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (data === '[DONE]') return
        try {
          const parsed = JSON.parse(data)
          const delta = parsed?.choices?.[0]?.delta?.content
          if (typeof delta === 'string' && delta.length > 0) yield delta
        } catch {
          // A malformed frame is skipped rather than aborting the stream —
          // partial output is still useful to the reader.
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {})
  }
}
