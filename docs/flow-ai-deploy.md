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
| `smoke-llm.mjs` | `node supabase/.temp/smoke-llm.mjs` | Live provider, prompts, both contracts |
| `smoke-insight.mjs` | `node supabase/.temp/smoke-insight.mjs` | Live latency and reasoning controls |

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

## 4. Not yet proven

- **Neither function is deployed.** `list_edge_functions` returns empty, so
  there is no HTTP endpoint to call. The client, the RLS policies and the
  `private.ai_calls_in_window` rate limiter have therefore never executed.
- **`ai_insights` and `ai_usage` have no rows.** Cache hits, cache writes and
  usage accounting are untested at runtime.
- **The Deno runtime is untested.** Everything above ran under Node. The
  import-map alias (`shared/`), `Deno.serve` and `Deno.env` are exercised for
  the first time on deploy.
- **Cantonese quality is unverified by a human reader.** The sampled answers were
  fluent and cited the correct figures, but a manager should read a few.

## 5. Deploy sequence

```powershell
npx supabase login
npx supabase link --project-ref dntmvxfgqmqremdrswij
npx supabase functions deploy ai-insight --project-ref dntmvxfgqmqremdrswij
npx supabase functions deploy ai-ask --project-ref dntmvxfgqmqremdrswij
```

Then, in the browser: open `/flow`, confirm the analysis block resolves rather
than showing 暫時無法產生分析, and ask the chat one question. Watch the tail of
the answer for a stray `<<<META>>>`.

## 6. Pre-existing security findings

Unrelated to this work, surfaced while inspecting the project:

- 33 tables have RLS enabled with no policies.
- Leaked-password protection is off.
