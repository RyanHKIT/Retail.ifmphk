# IFMP Retail (pilot) — Phase 3 Implementation Plan: 主控台 + ETL

> **Spec:** `docs/superpowers/specs/2026-09-16-ifmp-flow-overview-design.md`
> **Prior handoff:** `docs/superpowers/handoffs/2026-09-16-flow-phase2-handoff.md`
> **Data decision (spec §3):** Option A — synthesize deterministic sample data now; importer contract stands when real DongQia export arrives.

## Execution strategy (model usage — infra plan §"model+key")

- **T1–T3 (ETL contract, SQL seed, api layer): `glm-5.3`** — wrong mapping wastes all widget work (infra plan's own warning).
- **T4–T8 (widget components + pages): `glm-5.3-flash`** — stable TS/SQL contracts by then, one widget page per subagent, **strictly sequential subagent commits** (Phase 2 lesson: parallel subagent commits raced the git index, T10's commit was lost).
- **T9 (review + smoke): `glm-5.3`** — column-name audit against migration + full regression + smoke doc.

## File map (all new; nothing in `/retail` changes)

| File | Purpose |
|---|---|
| `apps/web/src/lib/footfall/api.ts` | Typed SELECT-only data layer (8 fetchers, HK-day logic) |
| `apps/web/src/lib/footfall/api.test.ts` | Unit tests, column names asserted against schema |
| `apps/web/src/components/footfall/WidgetCard.tsx` | Shared card shell (title/loading/error/empty/retry) |
| `apps/web/src/components/footfall/OverviewWidgets.tsx` | Widgets 1–8 presentational components |
| `apps/web/src/pages/flow/Overview.tsx` | 主控台 page, 2-col grid |
| `apps/web/src/pages/flow/Overview.test.tsx` | Renders all 8 cards from mocked api |
| `apps/web/src/pages/flow/Entrances.tsx` (+test) | 出入口 drill |
| `apps/web/src/pages/flow/Audience.tsx` (+test) | 客群畫像 drill |
| `apps/web/src/pages/flow/Compare.tsx` (+test) | 同期對比 drill |
| `apps/web/src/pages/flow/Holidays.tsx` (+test) | 節假日 drill |
| `apps/web/src/pages/flow/Devices.tsx` (+test) | 設備 stub page |
| `apps/web/src/i18n/flowMessages.ts` | `overview.*`, `entrances.*`, `audience.*`, `compare.*`, `holidays.*`, `devices.*` keys |
| `apps/web/src/App.tsx` | Replace stub routes with real pages |
| `supabase/migrations/20260916000005_flow_footfall_seed.sql` | Deterministic sample dataset (16 months) |
| `scripts/footfall-etl.mjs` | CSV → Supabase importer (service role, upsert, --dry-run) |
| `scripts/fixtures/footfall-sample.csv` | Tiny fixture for ETL test |
| `docs/flow-pilot-phase3.md` | Smoke checklist + ETL README |

## Tasks

### T1 — ETL importer + fixture (`glm-5.3`)

- [ ] Document CSV contract in `docs/flow-pilot-phase3.md` (spec §3 table)
- [ ] Write `scripts/fixtures/footfall-sample.csv` (~20 rows covering all row types)
- [ ] Write `scripts/footfall-etl.mjs`: parse (zh/en headers), route rows → `entrance_hourly`/`footfall_hourly`/`audience_daily`, derive `footfall_daily`, HK-day aggregation, service-role upserts with `ON CONFLICT` idempotency, `--dry-run`
- [ ] Dry-run against fixture asserts per-table counts (manual via node; no vitest for scripts)
- [ ] Commit: `feat(flow): footfall ETL importer + CSV contract`

### T2 — Deterministic sample seed migration (`glm-5.3`)

- [ ] Write `20260916000005_flow_footfall_seed.sql`: generate_series over 16 months (2025-05-01 → 2026-09-15, yesterday capped), daily magnitudes 2,000–4,000 with weekend uplift ×1.35, holiday uplift ×1.5 (join `calendar_days`), lunch (13±) + after-work (19±) hourly peaks, two-gate split 70/30, age skew 18–34, gender 45/55. **No RNG** — `hash(day,hour)` style deterministic arithmetic so reruns are idempotent
- [ ] `footfall_daily` derived from hourly in same migration; `devices` seeded 3 rows (2 online, 1 offline)
- [ ] Verify via MCP `execute_sql`: row counts > 0, HK-day sums match hourly, holiday rows uplifted
- [ ] Commit: `feat(flow): deterministic sample footfall seed (16 months)`

### T3 — Footfall api layer + tests (`glm-5.3`)

- [ ] `apps/web/src/lib/footfall/api.ts` per spec §4 table — **before writing, print the column list of each table from migration `20260915000002` and hard-verify every select string** (T9 lesson)
- [ ] HK-day helpers (`hkToday()`, `hkMonthBounds()`, ISO weekday Mon-start)
- [ ] `api.test.ts` mocked-supabase unit tests; column assertions mirror real schema
- [ ] `tsc --noEmit` green
- [ ] Commit: `feat(flow): footfall read api layer with HK-day logic`

### T4 — Overview widgets 1–8 (`glm-5.3-flash`, subagent)

- [ ] `WidgetCard.tsx` (skeleton/error/empty/retry shell)
- [ ] `OverviewWidgets.tsx`: 8 presentational components, recharts dark theme, bilingual labels via `t()`
- [ ] `Overview.tsx` grid + honesty footnote; `branchResolved` gate pattern
- [ ] `Overview.test.tsx` (8 cards render, skeleton→data, retry path)
- [ ] i18n keys `overview.*`
- [ ] Commit: `feat(flow): overview 主控台 widgets 1-8`

### T5 — 出入口 + 客群畫像 drills (`glm-5.3-flash`, subagent)

- [ ] `Entrances.tsx` (+test): per-gate today bars + 7-day totals
- [ ] `Audience.tsx` (+test): gender split + age-group distribution
- [ ] i18n `entrances.*`, `audience.*`
- [ ] Commit: `feat(flow): entrances + audience drill pages`

### T6 — 同期對比 + 節假日 drills (`glm-5.3-flash`, subagent)

- [ ] `Compare.tsx` (+test): selected-day / last-week-same-weekday / YoY overlay lines
- [ ] `Holidays.tsx` (+test): holiday vs normal table
- [ ] i18n `compare.*`, `holidays.*`
- [ ] Commit: `feat(flow): compare + holidays drill pages`

### T7 — 設備 stub + App routes (`glm-5.3-flash`, subagent)

- [ ] `Devices.tsx` (+test): read-only device list, empty-state friendly
- [ ] `App.tsx`: swap stub routes for real pages (5 routes)
- [ ] Verify no `/retail` route touched
- [ ] Commit: `feat(flow): devices page + wire overview drill routes`

### T8 — Real-import dress rehearsal (inline, `glm-5.3`)

- [ ] Apply migration via MCP (or confirm applied); run `footfall-etl.mjs` dry-run + full against a 10-row hand-made CSV, then rerun → assert 0 new rows (idempotency)
- [ ] Confirm UI honesty footnote condition (`provenance = sample`) documented in phase3 doc
- [ ] Commit: `docs(flow): phase3 ETL rehearsal notes`

### T9 — Review + regression + smoke doc (`glm-5.3`)

- [ ] **Column-name audit:** every `.select()`/`.eq()`/`.gte()` string in `footfall/api.ts` diffed against migration DDL
- [ ] Full `npx vitest run` + `tsc --noEmit` green
- [ ] localhost smoke per spec §7 (8 widgets, 5 drills, zh/en, empty state)
- [ ] Write `docs/flow-pilot-phase3.md` smoke checklist + known deferrals; commit
- [ ] Handoff doc: `docs/superpowers/handoffs/2026-09-16-flow-phase3-handoff.md`

## Guardrails (all phases carry forward)

1. No writes to footfall tables from the browser — RLS has no client write policies; keep it that way
2. No hardcoded strings — every label through `t()`
3. No `/retail` changes; singleton supabase client only
4. Subagent commits sequential; main agent verifies `git log` after each
5. Real DongQia export arriving mid-phase → pause widget work, rerun T1 importer against it, resume
