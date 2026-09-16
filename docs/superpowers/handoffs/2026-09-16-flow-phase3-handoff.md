# IFMP Retail Flow — Phase 3 handoff

Date: 2026-09-16. Branch: `feature/ifmp-flow-infra` (local-only).

## Read first

- Spec: `docs/superpowers/specs/2026-09-16-ifmp-flow-overview-design.md`
- Plan: `docs/superpowers/plans/2026-09-16-ifmp-flow-overview.md`
- Smoke + ETL: `docs/flow-pilot-phase3.md`
- Parent: `docs/superpowers/specs/2026-09-15-ifmp-flow-design.md`

## State: T1–T7 + T9 done. T8 deferred. Next = Phase 4 Journey heatmap.

Commits (Phase 3):

| Hash | What |
|---|---|
| `18e17e2` | T1 DongQia ETL importer + fixtures |
| `8251767` | T2 age CHECK + 16-month seed |
| `d4bffed` | T3 footfall read api (HK-day) |
| `9df5e99` | T4 Overview widgets 1–8 |
| `cfbd5a8` | T5 entrances + audience drills |
| `b983016` | T6 compare + holidays drills |
| `b22136d` | T7 devices + routes |
| (this closeout) | T9 docs + seed-through-today + Overview audience MTD |

Numeric SoT: deterministic SQL seed (Uniqlo-plausible magnitudes, labeled I.T. Causeway Bay). **No live DongQia.**

Seed applied remotely on project `dntmvxfgqmqremdrswij`: `flow_audience_age_dongqia`, `flow_footfall_seed`, `flow_footfall_seed_20260916`.

## Model note

glm provider crashed 2026-09-16. Phase 3 used **Grok 4.6** for T1–T3 / T8–T9 and **Auto** (`inherit`) for T4–T7 sequential commits.

## Next: Phase 4 — Journey heatmap

- New AI floorplan (not legacy `/retail/journey` JSON)
- Open Design visual world first, then implement
- Do not skin `/retail/journey`
- Zone/heatmap tables already exist (`zones`, `heatmap_daily`) — empty intensity until Phase 4 seed

## Environment

- Pilot: `manager@ifmphk.com` / `demo1234`
- Branch uuid: `a0000000-0000-4000-8000-000000000001`
- Singleton client only: `createFlowSupabase()` in `apps/web/src/lib/supabase.ts`
- PowerShell: `;` not `&&`. No git remote.
- `/api/health` proxy errors = legacy Express not running — ignore for `/flow`
