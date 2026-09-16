// POST /functions/v1/ai-ask
//
// Streams an answer about how the platform works.
//
// Body: { question: string, locale: 'zh-HK' | 'en', history: AiMessage[] }
//
// Response is SSE:
//   event: delta  data: {"text":"..."}     repeated, the answer so far
//   event: meta   data: {"suggestedRoute":..., "definitionRefs":[...]}
//   event: done   data: {}
//   event: error  data: {"error":"CODE","message":"..."}
//
// Scope is docs and schema only. The model receives no rows, so it cannot
// report a figure, and a question about live numbers is answered with a
// definition plus a route to the tab that holds the answer.

import { stream } from '../_shared/aiClient.ts'
import { isAiConfigured } from '../_shared/aiClient.ts'
import {
  authorize,
  enforceRateLimit,
  errorResponse,
  handlePreflight,
  jsonResponse,
  recordUsage,
  serviceClient,
  streamResponse,
} from '../_shared/guards.ts'
import {
  buildAskMessages,
  isLocale,
  parseAskMeta,
  splitAskStream,
} from '../_shared/prompts.ts'
import { SCHEMA_DIGEST } from '../_shared/schemaDigest.ts'
import type { AiMessage } from '../_shared/aiClient.ts'

const MAX_QUESTION_LENGTH = 500
const MAX_HISTORY_TURNS = 8

function sse(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405)
  }

  try {
    const caller = await authorize(req)

    if (!isAiConfigured()) {
      return jsonResponse({ error: 'AI_NOT_CONFIGURED' }, 503)
    }

    const payload = await req.json().catch(() => null)
    const question = typeof payload?.question === 'string' ? payload.question.trim() : ''
    const locale = payload?.locale

    if (!question) {
      return jsonResponse({ error: 'EMPTY_QUESTION' }, 400)
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      return jsonResponse(
        { error: 'QUESTION_TOO_LONG', message: `Max ${MAX_QUESTION_LENGTH} characters` },
        400,
      )
    }
    if (!isLocale(locale)) {
      return jsonResponse({ error: 'BAD_LOCALE' }, 400)
    }

    // Sanitised rather than trusted: history comes from the browser, and a
    // caller could otherwise inject an arbitrary system turn into the prompt.
    const history: AiMessage[] = Array.isArray(payload?.history)
      ? payload.history
          .filter(
            (turn: unknown): turn is { role: string; content: string } =>
              typeof turn === 'object' &&
              turn !== null &&
              typeof (turn as { content?: unknown }).content === 'string',
          )
          .map((turn: { role: string; content: string }) => ({
            // Only user and assistant are accepted. A client-supplied 'system'
            // turn would let the caller rewrite the instructions.
            role: turn.role === 'assistant' ? ('assistant' as const) : ('user' as const),
            content: turn.content.slice(0, MAX_QUESTION_LENGTH),
          }))
          .slice(-MAX_HISTORY_TURNS)
      : []

    const service = serviceClient()
    await enforceRateLimit(service, caller.userId, 'ask')

    const messages = buildAskMessages({
      question,
      locale,
      schemaDigest: SCHEMA_DIGEST,
      history,
    })

    const startedAt = Date.now()

    const body = new ReadableStream({
      async start(controller) {
        let accumulated = ''
        let sentLength = 0
        let failed = false

        try {
          for await (const delta of stream(messages, { temperature: 0.3 })) {
            accumulated += delta
            const { emitted } = splitAskStream(accumulated)
            if (emitted.length > sentLength) {
              controller.enqueue(sse('delta', { text: emitted.slice(sentLength) }))
              sentLength = emitted.length
            }
          }

          const { prose, metadata } = splitAskStream(accumulated)
          const meta = parseAskMeta(metadata)
          const answer = prose.trim()

          if (answer.length === 0) {
            failed = true
            controller.enqueue(
              sse('error', { error: 'EMPTY_ANSWER', message: 'Model returned no answer' }),
            )
          } else {
            controller.enqueue(
              sse('meta', {
                suggestedRoute: meta.suggestedRoute,
                definitionRefs: meta.definitionRefs,
                // Exposed so the UI can label the answer as machine-written.
                delimiterPresent: metadata !== null,
              }),
            )
            controller.enqueue(sse('done', {}))
          }
        } catch (error) {
          failed = true
          const message = error instanceof Error ? error.message : 'Stream failed'
          controller.enqueue(sse('error', { error: 'UPSTREAM', message }))
        } finally {
          // Streaming responses do not carry usage reliably, so token counts are
          // left at zero: the row exists to meter calls, not to bill precisely.
          await recordUsage(service, {
            user_id: caller.userId,
            branch_id: caller.branchId,
            kind: 'ask',
            tab_key: null,
            model: Deno.env.get('AI_MODEL') ?? 'unknown',
            input_tokens: 0,
            output_tokens: 0,
            duration_ms: Date.now() - startedAt,
            outcome: failed ? 'error' : 'ok',
          }).catch(() => {})
          controller.close()
        }
      },
    })

    return streamResponse(body)
  } catch (error) {
    return errorResponse(error)
  }
})
