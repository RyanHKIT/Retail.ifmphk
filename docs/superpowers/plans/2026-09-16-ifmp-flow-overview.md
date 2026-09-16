# IFMP Retail (pilot) — Phase 3 Implementation Plan: 主控台 + DongQia ETL

> **Spec:** `docs/superpowers/specs/2026-09-16-ifmp-flow-overview-design.md`
> **Prior handoff:** `docs/superpowers/handoffs/2026-09-16-flow-phase2-handoff.md`
> **Vendor:** 客流管家 Open API `oapi.dongqia.cn` (docs v1.0.3)
> **Data path:** T1 importer + JSON fixtures first; T2 SQL seed unblocks widgets; T8 live pull when operator credentials arrive.

## Execution strategy (model usage — infra plan §"model+key")

- **T1–T3 (ETL contract, age-group migration, api layer): `glm-5.3`** — wrong mapping wastes all widget work.
- **T4–T7 (widget components + pages): `glm-5.3-flash`** — stable TS/SQL contracts by then, **strictly sequential subagent commits** (Phase 2 lesson: parallel commits raced the git index).
- **T8–T9 (live pull / review / smoke): `glm-5.3`** — column-name audit + credential handling + full regression.

Do **not** put `DONGQIA_*` or `service_role` in client code or git.

## File map (all new except one migration + App.tsx + i18n; nothing in `/retail`)

| File | Purpose |
|---|---|
| `apps/web/src/lib/footfall/api.ts` | Typed SELECT-only data layer |
| `apps/web/src/lib/footfall/api.test.ts` | Unit tests; column names asserted against schema |
| `apps/web/src/components/footfall/WidgetCard.tsx` | Shared card shell |
| `apps/web/src/components/footfall/OverviewWidgets.tsx` | Widgets 1–8 presentational |
| `apps/web/src/pages/flow/Overview.tsx` (+test) | 主控台 |
| `apps/web/src/pages/flow/Entrances.tsx` (+test) | 出入口 drill |
| `apps/web/src/pages/flow/Audience.tsx` (+test) | 客群畫像 drill |
| `apps/web/src/pages/flow/Compare.tsx` (+test) | 同期對比 drill |
| `apps/web/src/pages/flow/Holidays.tsx` (+test) | 節假日 drill |
| `apps/web/src/pages/flow/Devices.tsx` (+test) | 設備 |
| `apps/web/src/i18n/flowMessages.ts` | `overview.*` + drill keys |
| `apps/web/src/App.tsx` | Replace stub routes |
| `supabase/migrations/20260916000005_flow_audience_age_dongqia.sql` | Align `age_group` CHECK to DongQia buckets |
| `supabase/migrations/20260916000006_flow_footfall_seed.sql` | Deterministic sample (16 months) until live pull |
| `scripts/footfall-etl.mjs` | DongQia JSON → Supabase upsert |
| `scripts/fixtures/dongqia-getdatas-hourly.json` | Vendor-shaped fixture (no secrets) |
| `docs/flow-pilot-phase3.md` | Smoke + ETL README (env var names only) |

## Tasks

### T1 — DongQia ETL importer + fixture (`glm-5.3`)

- [ ] Document API field map in `docs/flow-pilot-phase3.md` (spec §3.1 table). Env var **names** only — no values.
- [ ] Vendor-shaped JSON fixtures covering entity hourly, entity daily, entrance hourly, devices.
- [ ] `scripts/footfall-etl.mjs`: `--from-fixture` / `--dry-run` / live (`POST /api/Token` then paged `GetDatas`, 60-day hourly chunks). Map fields per spec. Upsert via service role. Idempotent.
- [ ] Dry-run against fixtures asserts per-table counts.
- [ ] Commit: `feat(flow): DongQia Open API footfall ETL importer`

### T2 — Age-group align + sample seed (`glm-5.3`)

- [ ] Migration: drop/replace `audience_daily.age_group` CHECK to `toddler|teenager|youth|middle_aged|elderly|unknown` (spec §3.3 A).
- [ ] Seed migration: generate_series 16 months (2025-05-01 → yesterday), magnitudes ~2k–4k/day, weekend ×1.35, HK-holiday ×1.5, lunch+after-work peaks, two-gate 70/30, DongQia age skew toward youth, gender 45/55. **No RNG** — deterministic arithmetic. `devices` 3 rows.
- [ ] Verify via MCP `execute_sql`.
- [ ] Commit: `feat(flow): DongQia age buckets + 16-month sample seed`

### T3 — Footfall api layer + tests (`glm-5.3`)

- [ ] Before writing: print column list from `20260915000002` + T2 alter; every `.select()` string must match.
- [ ] HK-day helpers; 8 fetchers + `fetchDevices` per spec §4.
- [ ] `api.test.ts` mocked-supabase; `tsc --noEmit` green.
- [ ] Commit: `feat(flow): footfall read api layer with HK-day logic`

### T4 — Overview widgets 1–8 (`glm-5.3-flash`, subagent)

- [ ] `WidgetCard` + 8 presentational widgets (recharts, `t()`, honesty footnote).
- [ ] `Overview.tsx` + test; `branchResolved` gate.
- [ ] Commit: `feat(flow): overview 主控台 widgets 1-8`

### T5 — 出入口 + 客群畫像 (`glm-5.3-flash`, subagent)

- [ ] `Entrances.tsx` (+test), `Audience.tsx` (+test), i18n.
- [ ] Commit: `feat(flow): entrances + audience drill pages`

### T6 — 同期對比 + 節假日 (`glm-5.3-flash`, subagent)

- [ ] `Compare.tsx` (+test), `Holidays.tsx` (+test), i18n.
- [ ] Commit: `feat(flow): compare + holidays drill pages`

### T7 — 設備 + App routes (`glm-5.3-flash`, subagent)

- [ ] `Devices.tsx` (+test); wire 5 stub routes in `App.tsx`; no `/retail` touch.
- [ ] Commit: `feat(flow): devices page + wire overview drill routes`

### T8 — Live DongQia pull (`glm-5.3`, blocked on credentials)

- [ ] Operator supplies `DONGQIA_*` into local `.env.local` (not git).
- [ ] Dry-run live, then upsert, then rerun → 0 new rows.
- [ ] MCP `execute_sql` confirms non-zero `footfall_*` / `audience_daily` / `devices`.
- [ ] If credentials delayed: skip; widgets already run on T2 seed. Document in phase3 doc.
- [ ] Commit: `docs(flow): phase3 ETL live-pull notes` (no secrets)

### T9 — Review + regression + smoke (`glm-5.3`)

- [ ] Column-name audit vs DDL.
- [ ] Full `npx vitest run` + `tsc --noEmit`.
- [ ] localhost smoke per spec §7.
- [ ] `docs/flow-pilot-phase3.md` + handoff `docs/superpowers/handoffs/2026-09-16-flow-phase3-handoff.md`.

## Guardrails

1. No browser writes to footfall tables; no DongQia credentials in client or git
2. No hardcoded UI strings — every label through `t()`
3. No `/retail` changes; singleton supabase client only
4. Subagent commits sequential; main agent verifies `git log` after each
5. Public vendor example `appID`/`appSecret` must not be pasted into this repo
