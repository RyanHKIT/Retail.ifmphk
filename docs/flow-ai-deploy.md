# IFMP Retail — AI insights & platform Q&A: deployment and smoke record

> Date: 2026-09-17
> Provider: `toai.hk` (OpenAI-compatible), model `qwen3.7-flash-2026-07-15`
> Endpoints: `ai-insight`, `ai-ask`

This doc records what has been proven locally, what has not, and what must
happen before the feature can be called working.

## 1. What is proven, and how

The provider contract was validated **before deployment** by running the real
shared modules out of Node instead of Deno, with a `Deno.env.get` shim. This
matters because the prompts and the stream parser are the parts most likely to
be wrong, and a deploy would have conflated prompt errors with runtime errors.

Harnesses live in `supabase/.temp/` (gitignored, not shipped):

| Harness | Run | Covers |
|---------|-----|--------|
| `smoke-split.mjs` | `node supabase/.temp/smoke-split.mjs` | Delimiter hold-back, offline, no key |
| `smoke-wire.mjs` | `node supabase/.temp/smoke-wire.mjs` | Outbound request shape, offline, no key |
| `smoke-api.mjs` | `node supabase/.temp/smoke-api.mjs` | The deployed endpoints, over HTTPS as a signed-in manager |
| `smoke-llm.mjs` | `node supabase/.temp/smoke-llm.mjs` | Live provider prompts, straight to the provider |
| `smoke-insight.mjs` | `node supabase/.temp/smoke-insight.mjs` | Provider latency and reasoning controls |

`smoke-api.mjs` reads the project URL and anon key from `apps/web/.env` and the
account from `supabase/.env.local`, so those values are not duplicated.

Results on 2026-09-17:

- **Delimiter hold-back: 14 checks pass.** No fragment of `<<<META>>>` reached
  the client at any chunk size from 1 to 200 characters, nor at any two-chunk
  split boundary.
- **Request wiring: 22 checks pass.** `enable_thinking: false` is sent on both
  the completion and the streaming path; the escape hatch and the numeric
  overrides behave.
- **Live provider: reachable.** Non-streaming answered in 3.3s, streaming
  yielded deltas, `response_format: json_object` was accepted, and the model
  echoed back as `qwen3.7-flash-2026-07-15`.
- **Chat contract: pass.** The trailer was parsed, `suggestedRoute` resolved to a
  known route, and no delimiter leaked.
- **Insight contract: pass** once reasoning was suppressed. Headline, 3
  observations and a concrete action, all citing figures present in the input.

## 2. Two defects found and fixed before deploy

**Truncated answers.** `splitAskStream` withholds the last 9 characters while a
stream is live, so a delimiter split across two provider chunks cannot leak as
literal text. `ai-ask` never released those characters when the stream ended
without a delimiter, so an answer whose trailer was missing lost its tail. Fixed
in `2360f6f`; the harness now reconstructs the full sentence.

**Every insight call would have timed out.** `qwen3.7-flash` is a reasoning
model. Against the insight prompt it emitted 10,497 characters of internal
reasoning to write a 317 character answer, taking **50.7 seconds** against a
**30 second** timeout. Fixed in `256757b` by sending `enable_thinking: false`.

| Setting | Latency | Completion tokens |
|---------|---------|-------------------|
| reasoning on | 50,700 ms | 3,832 |
| `enable_thinking: false` | 3,219 ms | 159 |
| `reasoning_effort: none` | 2,355 ms | 124 |
| both, together | 3,046 ms | 147 |

Chat latency fell from 24,697 ms to 3,121 ms on the same question. Output shape,
observation count and cited figures were unchanged.

## 3. Required secrets

Server-side only. Set on the hosted project, never in `apps/web/.env`:

```powershell
npx supabase secrets set --project-ref dntmvxfgqmqremdrswij `
  AI_BASE_URL=https://toai.hk/v1 `
  AI_MODEL=qwen3.7-flash-2026-07-15 `
  AI_API_KEY=<key>
```

See `supabase/.env.example` for the full list. `AI_DISABLE_THINKING` defaults to
true. Switching it off requires raising `AI_TIMEOUT_MS`, or the function will be
killed mid-generation.

The browser side needs a flag and no key:

```
# apps/web/.env
VITE_AI_ENABLED=1
```

`rg "AI_API_KEY" apps/web` must produce no output. Vite inlines every `VITE_*`
variable into the public bundle, so a key placed there is published.

## 4. Deployed 2026-09-17 — verified live

Both functions are deployed to `dntmvxfgqmqremdrswij` and were exercised over
HTTPS as the browser calls them. Harness: `supabase/.temp/smoke-api.mjs`.

| Check | Result |
|-------|--------|
| Sign in as the manager | pass |
| No token / forged token | 401 |
| `ai-insight` first call | 200, generated, 5.4s |
| `ai-insight` second call | `cached: true`, 1.7s |
| Invalid `tabKey`, malformed `day`, bad `locale` | 400 |
| `ai-ask` | 200, `text/event-stream`, 38 deltas |
| Delimiter leaked into the streamed answer | no |
| `suggestedRoute` | `/flow`, a known route |
| `ai_insights` / `ai_usage` rows | 3 insight rows, 4 usage rows, 0 errors |

The tunnel was verified end to end as well: `retail.ifmphk.com` served the app,
the manager signed in through it, the Overview rendered, and the Q&A panel
streamed an answer with no delimiter leak in the DOM.

### Deployment blocker that had to be fixed first

The first deploy failed:

```
Failed to bundle the function (reason: Relative import path "shared/prompts.ts"
not prefixed with / or ./ or ../)
```

`deno.json`'s import map alias was not applied by the CLI, so only `index.ts`
was uploaded and none of `_shared` was bundled. Two fixes were needed:

1. The entrypoints import `../_shared/...` relatively, so the CLI can follow the
   dependency graph. The `shared/` alias is gone from `deno.json`.
2. `guards.ts` and `aggregates.ts` import `npm:@supabase/supabase-js@2` directly
   rather than a bare specifier, since a bare specifier depends on the same
   import map that did not apply.

This is also why the CLI is required to deploy. The MCP deploy tool takes each
file's contents inline and would have hidden the problem.

### Defect found by reading the generated analysis

The first live insight cited **2630** as the weekday average. The real value is
**2637**; the all-days average is 2955. It also wrote **約1000人** for a
difference of 956.

The prompt already forbade inventing numbers. The root cause was partly in the
aggregates: only an all-days average was offered, which includes a weekend that
runs about 36% busier, so the model needed a weekday baseline and had none.
Fixing the prompt alone would not have been enough.

Two rounds, each verified by regex-searching the stored output for every number:

| Version | Added | Remaining problem |
|---------|-------|-------------------|
| 1 | — | `2630` invented; `約1000人` rounded |
| 2 | `priorWeekdayAverageInCount`, `priorPeakInCount` | `2630` gone; `約1000人` remained |
| 3 | `changeFromPriorWeekdayPercent`, `changeFromPriorPeakPercent` | none found |

Version 3 cites only values present in the input: `2642`, `2637`, `3598`, `288`,
`10.9%`, `0.2%`, `26.6%`. The percentages come from the precomputed fields, and
the hedge word 約 is gone.

`PROMPT_VERSION` is now 3, which invalidates every v1 and v2 cache entry
automatically.

This remains a probabilistic control. The prompt forbids invented numbers and
the aggregates now supply every figure the analysis needs, but a future run
should still be spot-checked. `supabase/.temp/smoke-api.mjs` can be extended to
assert it automatically by checking the stored `body` for numbers that do not
appear in the aggregates.

### Minor, unresolved

The chat sometimes wraps a table name in backticks, which render as literal
characters because the answer is inserted as text nodes, never as HTML. Harmless
but slightly untidy. Stripping backticks client-side would fix it.

## 5. Superseded: what was unproven before deploy

Kept as a record of what the deploy had to prove. All four items are now covered
by section 4.

- Neither function was deployed, so the client, the RLS policies and the
  `private.ai_calls_in_window` rate limiter had never executed.
- `ai_insights` and `ai_usage` had no rows.
- The Deno runtime was untested; everything ran under Node first.
- Cantonese quality was unverified by a human reader.

## 6. Deploy sequence

```powershell
npx supabase login
npx supabase functions deploy ai-insight --project-ref dntmvxfgqmqremdrswij
npx supabase functions deploy ai-ask --project-ref dntmvxfgqmqremdrswij
```

`supabase link` is not required when `--project-ref` is passed.

Then, in the browser: open `/flow`, confirm the analysis block resolves rather
than showing 暫時無法產生分析, and ask the chat one question. Watch the tail of
the answer for a stray `<<<META>>>`.

## 7. Pre-existing security findings

Unrelated to this work, surfaced while inspecting the project:

- 33 tables have RLS enabled with no policies.
- Leaked-password protection is off.
