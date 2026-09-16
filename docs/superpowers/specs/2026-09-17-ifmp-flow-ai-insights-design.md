# IFMP Retail — AI analysis and platform Q&A

> Date: 2026-09-17
> Status: awaiting approval
> Scope: `/flow` overview tabs (analysis) + global chrome (chat)

## 1. Problem

The six tabs under 數據總覽 render charts and numbers but say nothing about
them. A branch manager can see that 14:00 is the tallest bar and still not know
whether that is normal, whether it matters, or what to do about it. The reading
work is pushed onto the person least able to do it quickly — someone standing on
a shop floor with a phone.

Separately, there is no way to ask the platform a question. The specs, the
schema, and the semantics of each metric (what counts as a "unique visitor",
why one tab disagrees with another) live in documents the manager will never
read.

## 2. Non-goals

- Not a general-purpose assistant. It answers questions about this platform.
- Not an autonomous actor. It never writes data, never approves a swap, never
  publishes a roster.
- Not a chart generator. It interprets existing aggregates; it does not add new
  metrics.
- Not a data export path. It cannot be used to extract rows.

## 3. Security boundary (read this first)

The provider API key is a **server-side secret**. It must never reach the
browser.

Vite inlines every `VITE_*` variable into the public bundle. Putting
`VITE_AI_API_KEY` in `apps/web/.env` publishes the key to anyone who opens
devtools, and it is baked into the shipped JS. Therefore:

| Item | Where it lives | Reachable from browser |
|---|---|---|
| `AI_API_KEY` | Supabase Edge Function secret | no |
| `AI_BASE_URL` | Supabase Edge Function secret | no |
| `AI_MODEL` | Supabase Edge Function secret | no |
| Function name | `VITE_*` | yes (harmless) |

Set with `supabase secrets set AI_API_KEY=... AI_BASE_URL=... AI_MODEL=...`.

Three further constraints:

1. **Caller must be authenticated.** The function verifies the caller's Supabase
   JWT and requires a manager role. An unauthenticated request returns 401
   without touching the provider.
2. **Sender is not trusted.** The browser sends a tab key and a locale, nothing
   else. All numeric context is fetched server-side. A client cannot smuggle
   instructions into the prompt through the request body.
3. **The model has no write path and no row access.** It receives the schema
   digest and curated docs only (decision recorded in §5).

### 3.1 Known risk: prompt injection via data

Once aggregates are fed to the model, any free-text field inside them becomes an
injection vector. The six overview tabs are numeric footfall aggregates with no
free-text fields, so the current surface is clean. If analysis is later extended
to roster tabs, employee names and swap reasons are attacker-controllable by any
staff member and must be treated as untrusted input.

## 4. Analysis per tab

Six tabs, six different questions. The value is in picking the right question,
not in summarising the chart.

Every tab returns the same shape so one renderer serves all of them:

```ts
type Insight = {
  tabKey: string
  headline: string          // one sentence, the thing that matters
  observations: string[]    // 2-3, each grounded in a number on screen
  action?: string           // one concrete next step, or omitted
  confidence: 'low' | 'normal'
  model: string
  generatedAt: string
}
```

`confidence: 'low'` is required when the input is thin — a single day of data, a
holiday-distorted week, or a near-empty chart. The UI must show it. An
overconfident sentence on a sparse chart is worse than no sentence.

### 4.1 主控台 — Overview: "what happened today, and does it need me?"

Inputs: today's hourly in/out, peak hour and its count, 7-day daily trend,
unique-visitor count, repeat ratio, age/gender mix, last-week comparison.

- Headline: the single most decision-relevant fact — peak hour with its share,
  or the direction of the week if that is larger.
- Observations: peak hour vs. its 7-day average for that hour; whether the curve
  is front- or back-loaded; repeat vs. new balance.
- Action: only when warranted — for example staffing the identified peak.

### 4.2 動線熱力 — Journey: "where do people dwell, and what is being missed?"

Inputs: per-zone intensity, dwell ranking, cold zones, heat clipped by shop
walls, the mapping from zone to station.

- Headline: the dominant flow or dwell pattern.
- Observations: top and bottom zones by intensity; whether dwell concentrates or
  spreads; zones that read cold relative to their position on the path.
- Action: layout suggestion tied to a named zone.

Must respect that heat is clipped to the shop outline. The analysis should not
imply a zone is cold if the drawn polygon simply excludes it.

### 4.3 出入口 — Entrances: "are the gates and the staffing in balance?"

Inputs: per-gate today in/out totals, 7-day totals, share of total, in/out ratio.

- Headline: the load distribution across gates.
- Observations: gate ranking with share; an imbalance flag when one gate carries
  a disproportionate share; whether a gate's in/out ratio suggests it is being
  used one-directionally.
- Action: reallocation suggestion, phrased as a question for the manager rather
  than an instruction.

### 4.4 客群畫像 — Audience: "who is coming, and is that shifting?"

Inputs: age buckets with counts, gender split, unique vs. total visits.

- Headline: the dominant segment with its share.
- Observations: the second segment, and the weakest; repeat-visit intensity.
- Explicitly avoid: inferring intent, spend, or identity from demographics.
  Report composition, never motive.

### 4.5 同期對比 — Compare: "up or down, and is the gap closing?"

Inputs: selected period vs. last week vs. year-on-year series.

- Headline: net direction with magnitude.
- Observations: the widest divergence day; whether the gap is widening or
  closing across the period; YoY divergence where the two disagree.
- Must state the comparison basis, because "down 12%" is meaningless without
  knowing against what.

### 4.6 節假日 — Holidays: "how do holidays differ, and what is coming?"

Inputs: holiday vs. matched normal-day counts, per-holiday lift percentage,
upcoming holiday dates.

- Headline: the strongest lift or the most anomalous holiday.
- Observations: lift ranking; whether a holiday underperformed its normal day
  (the genuinely interesting case).
- Action: forward-looking note naming the next holiday on the calendar.

## 5. Q&A scope: docs and schema only

The chat can explain how the platform works. It **cannot** report live numbers.

Included in context: the database schema digest (table and column names with
types and comments), the flow specs, the glossary of metric definitions, and the
tab structure.

Excluded: every row of data. No footfall counts, no employee records, no
rosters, no swap reasons, no PII.

Consequence, stated plainly: "今日幾多人入嚟?" cannot be answered with a number
by the chat. This is a deliberate trade. Options (b) read-only whitelisted RPCs
and (c) raw read-only SQL were rejected: both turn the model into a query engine
over tenant data, which is the single largest exfiltration risk in the feature,
and neither is needed for the stated purpose — the numbers are already on screen.

To keep the chat useful despite this, it returns a `suggestedRoute` so it can
send the user to the tab holding the answer:

```ts
type Answer = {
  text: string
  suggestedRoute?: string   // e.g. '/flow/entrances'
  definitionRefs: string[]  // specs the answer drew on
}
```

So "今日幾多人入嚟?" answers with the definition of the metric and a link to
主控台, instead of a fabricated number. The empty state says this before the
first question, so the limitation is never a surprise.

## 6. Architecture

```
browser                 Supabase Edge Function              provider
-------                 -----------------------             --------
POST /ai-insight  --->  verify JWT + manager role
 {tabKey, locale}       check cache (ai_insights)
                        miss: fetch aggregates as service role
                              build prompt (schema + numbers)
                        call provider (OpenAI-compatible SSE)
                        validate JSON, write cache
                  <---  stream / return Insight
```

Two functions, one shared core:

| Path | Purpose |
|---|---|
| `supabase/functions/_shared/aiClient.ts` | Provider call. OpenAI-compatible chat completions, SSE streaming, timeout and retry. |
| `supabase/functions/_shared/prompts.ts` | One prompt builder per tab, plus the chat system prompt. |
| `supabase/functions/_shared/schemaDigest.ts` | Generated schema text, checked in. |
| `supabase/functions/_shared/guards.ts` | JWT verification, manager role check, per-user rate limit. |
| `supabase/functions/ai-insight/index.ts` | Analysis endpoint, cache-first. |
| `supabase/functions/ai-ask/index.ts` | Chat endpoint, streams. |

Provider-agnostic by design: `AI_BASE_URL` + `AI_MODEL` cover any
OpenAI-compatible endpoint, which includes the major hosted options. If the
chosen provider is not OpenAI-compatible, only `aiClient.ts` changes.

### 6.1 Caching

```sql
create table public.ai_insights (
  id             uuid primary key default gen_random_uuid(),
  branch_id      uuid not null references public.branches(id) on delete cascade,
  tab_key        text not null,
  day            date not null,
  locale         text not null,
  prompt_version int  not null default 1,
  input_digest   text not null,
  body           jsonb not null,
  model          text not null,
  created_at     timestamptz not null default now(),
  unique (branch_id, tab_key, day, locale, prompt_version)
);
```

Cache key is branch + tab + day + locale + prompt version. `input_digest` is a
hash of the aggregate payload: when the underlying numbers change, the digest
changes and the entry is regenerated rather than serving stale prose.
`prompt_version` is bumped by hand whenever a prompt changes, which is what
makes editing a prompt safe.

Chosen over precomputation because a scheduled job pays for six tabs every day
whether or not anyone looks, and the demo day is pinned, so on-demand is both
cheaper and fresher.

### 6.2 Cost and abuse control

A per-user hourly counter (analysis and chat counted separately) enforced in
`guards.ts`. `AI_MAX_TOKENS` caps every call. Every call logs
`{user_id, tab_key, model, input_tokens, output_tokens, duration_ms}` to
`ai_usage` so spend is attributable. Non-manager or unauthenticated callers are
rejected before any provider call, so an exposed function cannot be used as a
free model proxy.

### 6.3 Output handling

The model returns JSON; it is parsed and shape-checked, with a text fallback if
parsing fails. All model output renders as **text nodes**, never through
`dangerouslySetInnerHTML`. A malformed response degrades to an inline error — it
never breaks the tab.

## 7. UI

### 7.1 Analysis block

Sits at the top of each overview tab, above the charts, because it is the
conclusion and the charts are the evidence.

Visual treatment must make clear this is machine-written interpretation, not
measured fact. It is a distinct block: `AI 分析` label, accent left rule, the
headline at 14px, observations as a list, and a footer carrying the model name,
timestamp, and a 重新產生 control. `confidence: 'low'` renders a visible
低可信度 marker.

This matters because a manager may reallocate staff on the strength of this
text. It must never be mistaken for a reading from the data.

States: skeleton while generating, inline error with retry, and a
not-enough-data state when a widget is empty rather than a fabricated summary.

### 7.2 Chat

Floating control bottom-right, expanding to a panel. Streaming text, transcript
kept in component state only, no persistence. Header carries the same honesty
framing as §5 and a link to the relevant tab when `suggestedRoute` is present.
Keyboard: `Esc` closes, focus returns to the trigger. Respects
`prefers-reduced-motion`.

## 8. Environment preparation

Mechanical work that does not need the key:

1. `supabase/functions/` scaffold with the five files above and `deno.json`.
2. Migration `20260917000001_flow_ai_insights.sql`: `ai_insights`, `ai_usage`,
   rate-limit counters, RLS policies, and indexes.
3. `apps/web/.env.example` gains `VITE_AI_ENABLED` (function name and toggle
   only — no secrets).
4. Client module `apps/web/src/lib/ai/api.ts` with typed calls and an
   `isAiEnabled()` guard, so the UI degrades to hidden when unconfigured.
5. Local smoke path using `supabase functions serve` with secrets in
   `supabase/.env.local` (gitignored).

Blocked on the user: `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`, and confirmation
that the provider speaks OpenAI-compatible SSE.

## 9. Acceptance

- Static: `rg "AI_API_KEY" apps/web` returns nothing. The key cannot appear in
  the bundle.
- Unauthenticated and non-manager calls to both functions return 401/403 without
  a provider call.
- Second view of a tab with unchanged data hits the cache: no provider call,
  verified by absence of a new `ai_usage` row.
- Changed data invalidates: alter an aggregate, confirm the digest changes the
  row.
- Each of the six tabs produces an `Insight` passing the shape check, in both
  locales.
- Chat answers a platform question, returns `suggestedRoute` for a
  data question, and never emits a number it was not given.
- `prefers-reduced-motion` and keyboard-only paths verified.
- Tests: prompt builders, the cache-key and digest logic, `guards.ts` rejection
  paths, and the insight block's states. Provider calls are mocked — no test
  makes a live request.

## 10. Build status

Implemented and verified:

- Migration applied to the Supabase project (`dntmvxfgqmqremdrswij`). Both
  `ai_insights` and `ai_usage` have RLS enabled with policies, and neither
  appears in the security advisor's `rls_enabled_no_policy` list.
- Client, analysis block, and chat panel built: `tsc` clean, 161 tests passing,
  production build clean. With `VITE_AI_ENABLED` unset the block and the panel
  both render nothing, which is the intended degradation and is covered by test.

Not yet verified:

- **The Deno functions have never been executed.** Neither `deno` nor the
  `supabase` CLI is on PATH in the build environment, so the shared modules and
  both endpoints have not been parsed, type-checked, or run. Deployment is their
  first real validation. Treat any bug there as un-surfaced rather than absent.
- No live provider call has been made. The provider contract (OpenAI-compatible
  SSE, `response_format` support) is assumed from the provider's docs.

### 10.1 Deviations from the design above

1. **Chat output shape.** §5 specified JSON. Streaming JSON to a chat UI shows
   braces forming, so the model instead emits prose, then a
   `<<<META>>>` line, then the metadata JSON. The endpoint streams the prose and
   holds the trailer back, including when the delimiter is split across two
   chunks. The metadata still parses into the same `suggestedRoute` and
   `definitionRefs` fields.
2. **`force` flag.** Not in the original design. Without it the cache-first path
   would make the UI's regenerate control a no-op.
3. **Schema-qualified helpers.** The design's policy examples followed the
   existing migrations' unqualified `get_user_role(...)`. That fails:
   `search_path` is `"$user", public, extensions`, which excludes `private`. The
   policies use `private.get_user_role` and `private.user_manages_branch`.
4. **No function tests.** §9 called for tests of `prompts.ts` and `guards.ts`.
   Those need a Deno runtime, which is unavailable here, so only the React
   surface is tested. The prompt builders and the delimiter hold-back are the
   highest-value untested code in this change.

