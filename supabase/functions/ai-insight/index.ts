// POST /functions/v1/ai-insight
//
// Returns the cached analysis for one overview tab, generating it on a miss.
//
// Body: { tabKey: TabKey, day: 'YYYY-MM-DD', locale: 'zh-HK' | 'en' }
//
// The body carries no numbers. Aggregates are fetched here under the service
// role, so a caller cannot influence the prompt content ??only which tab and
// which day it is about.

import { complete, isAiConfigured } from 'shared/aiClient.ts'
import { fetchTabAggregates } from 'shared/aggregates.ts'
import {
  authorize,
  digestInput,
  enforceRateLimit,
  errorResponse,
  handlePreflight,
  jsonResponse,
  recordUsage,
  serviceClient,
} from 'shared/guards.ts'
import {
  buildInsightMessages,
  isLocale,
  isTabKey,
  parseInsight,
  PROMPT_VERSION,
} from 'shared/prompts.ts'

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

Deno.serve(async (req) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405)
  }

  try {
    const caller = await authorize(req)

    // The browser must not reveal a key, but it also must not be told the
    // feature is broken. Report the unconfigured state as such so the UI can
    // simply hide the block.
    if (!isAiConfigured()) {
      return jsonResponse({ error: 'AI_NOT_CONFIGURED' }, 503)
    }

    const payload = await req.json().catch(() => null)
    const tabKey = payload?.tabKey
    const locale = payload?.locale
    const day = payload?.day
    // Explicit regeneration. Without this the cache-first path would make the
    // UI's regenerate control a no-op.
    const force = payload?.force === true

    if (!isTabKey(tabKey)) {
      return jsonResponse({ error: 'BAD_TAB', message: 'Unknown tabKey' }, 400)
    }
    if (!isLocale(locale)) {
      return jsonResponse({ error: 'BAD_LOCALE' }, 400)
    }
    if (typeof day !== 'string' || !DAY_PATTERN.test(day)) {
      return jsonResponse({ error: 'BAD_DAY', message: 'day must be YYYY-MM-DD' }, 400)
    }

    const branchId = caller.branchId
    if (!branchId) {
      return jsonResponse({ error: 'NO_BRANCH', message: 'No managed branch' }, 403)
    }

    await enforceRateLimit(serviceClient(), caller.userId, 'insight')

    const service = serviceClient()

    // Aggregates first, because their digest is part of the cache key: prose
    // derived from different numbers must not be served from cache.
    const data = await fetchTabAggregates(service, tabKey, branchId, day)
    const inputDigest = await digestInput(data)

    const { data: cached } = await service
      .from('ai_insights')
      .select('body, input_digest, model, created_at')
      .eq('branch_id', branchId)
      .eq('tab_key', tabKey)
      .eq('day', day)
      .eq('locale', locale)
      .eq('prompt_version', PROMPT_VERSION)
      .maybeSingle()

    if (!force && cached && cached.input_digest === inputDigest) {
      // Recorded so the ratio of views to paid calls stays visible. `cached`
      // is excluded from the rate-limit count, since it cost nothing.
      await recordUsage(service, {
        user_id: caller.userId,
        branch_id: branchId,
        kind: 'insight',
        tab_key: tabKey,
        model: cached.model as string,
        input_tokens: 0,
        output_tokens: 0,
        duration_ms: 0,
        outcome: 'cached',
      })

      return jsonResponse({
        insight: cached.body,
        model: cached.model,
        generatedAt: cached.created_at,
        cached: true,
      })
    }

    const result = await complete(
      buildInsightMessages({ tabKey, locale, day, data }),
      { json: true, temperature: 0.2 },
    )

    const insight = parseInsight(result.text)

    if (!insight) {
      // A paid call that produced nothing usable is recorded as an error so it
      // does not silently consume the hourly allowance.
      await recordUsage(service, {
        user_id: caller.userId,
        branch_id: branchId,
        kind: 'insight',
        tab_key: tabKey,
        model: result.model,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        duration_ms: result.durationMs,
        outcome: 'error',
      })
      return jsonResponse({ error: 'BAD_MODEL_OUTPUT' }, 502)
    }

    const { error: upsertError } = await service.from('ai_insights').upsert(
      {
        branch_id: branchId,
        tab_key: tabKey,
        day,
        locale,
        prompt_version: PROMPT_VERSION,
        input_digest: inputDigest,
        body: insight,
        model: result.model,
      },
      { onConflict: 'branch_id,tab_key,day,locale,prompt_version' },
    )
    if (upsertError) console.error('ai_insights upsert failed', upsertError.message)

    await recordUsage(service, {
      user_id: caller.userId,
      branch_id: branchId,
      kind: 'insight',
      tab_key: tabKey,
      model: result.model,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      duration_ms: result.durationMs,
      outcome: 'ok',
    })

    return jsonResponse({
      insight,
      model: result.model,
      generatedAt: new Date().toISOString(),
      cached: false,
    })
  } catch (error) {
    return errorResponse(error)
  }
})
