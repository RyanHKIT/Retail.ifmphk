# IFMP Retail (pilot) — Phase 3 Design Spec: 主控台 (Overview widgets 1–8 + ETL)

> **Date:** 2026-09-16
> **Status:** Draft — awaiting product-owner approval (data-source decision §3)
> **Parent spec:** `docs/superpowers/specs/2026-09-15-ifmp-flow-design.md` (§4.2 tables, §5 widget mandate, §4.3 data strategy)
> **Plan:** `docs/superpowers/plans/2026-09-16-ifmp-flow-overview.md`

## 1. Summary

Phase 3 delivers the **manager 主控台** under `/flow`: overview page with the eight mandated footfall widgets, drill routes (出入口 / 客群畫像 / 同期對比 / 節假日), a devices stub, and the Uniqlo-period traffic **ETL pipeline** into the Phase 1 Supabase schema. All bilingual (zh-HK + en). No schema rewrite — tables exist since migration `20260915000002`; this phase only fills them and reads them.

## 2. Scope

| Surface | Route | Content |
|---|---|---|
| 主控台 Overview | `/flow` | Widgets 1–8 (spec parent §5) |
| 出入口 drill | `/flow/entrances` | Per-gate in/out, today + 7-day |
| 客群畫像 drill | `/flow/audience` | Gender × age-group distributions |
| 同期對比 drill | `/flow/compare` | 上週同曜日 + 去年同期 |
| 節假日 drill | `/flow/holidays` | Holiday vs normal-day traffic table |
| 設備 | `/flow/devices` | Read-only device list (stub-grade) |

Widgets (parent spec §5, all bilingual):

1. 當日分時客流 — today hourly footfall (area/bar chart)
2. 出入口客流 — entrance/exit per gate (grouped bars)
3. 當月每日客流 — daily series this month (bar)
4. 週7天客流分佈 — 7-day distribution (bar by weekday)
5. 節假日客流分析 — holiday vs same-weekday-normal comparison (table)
6. 今日去重客流 — today unique visitors (KPI number + trend spark)
7. 客群畫像 — gender + age-group charts
8. 客流同期對比 — last-week-same-weekday + YoY overlays (line)

### Out of scope (deferrals)

- 動線熱力 hero + compact heatmap card → Phase 4 (needs new floorplan asset per parent §4.3)
- Real-time streaming / webhook ingest → pilot reads stored rows only
- Manager editing of footfall data — ETL-only writes (RLS already enforces)
- Alerts UI beyond an empty-state card → later phase
- `retail.ifmphk.com` cutover → after Phase 4

## 3. Data strategy (decision required)

Parent §4.3: numeric source of truth = **北京优衣庫-period traffic via 客流管家/DongQia export**, relabeled I.T. Causeway Bay, honesty label "sample traffic (anonymized comparable store)" until a real feed exists. The planned DongQia export sample has **not arrived**. Two options:

- **A (recommended): synthesize now, verify mapping later.** Deterministic SQL-generated dataset (Uniqlo-Causeway-Bay-plausible magnitudes: ~2,000–4,000 in-count/day, weekend uplift, holiday uplift, lunch/after-work peaks, two-gate split ~70/30, age skew 18–34) covering **16 months** (YoY needs 去年同期). ETL importer is built against a documented CSV contract; when the real export lands, rerun importer — widgets never change.
- **B: block on real sample.** Spec/plan wait; nothing buildable until operator provides the file.

Both honor the honesty rule: UI shows the sample-traffic footnote while `provenance = sample`.

### ETL contract (CSV, DongQia-export-shaped)

```
date,hour,entrance,in_count,out_count,passersby,unique_visitors,gender,age_group
2026-09-15,10,正門,312,298,540,280,,
2026-09-15,10,正門,,,,,male,25-34
```

- Rows with `entrance` set → `entrance_hourly`; aggregate rows (blank entrance) → `footfall_hourly`; `gender`/`age_group` rows → `audience_daily` (day-level, summed).
- `footfall_daily` derived: sum hourly per HK calendar day (UTC+8 boundary), passersby/unique summed with dedup factor noted in ETL README.
- Importer: `scripts/footfall-etl.mjs` (Node), reads CSV, **upserts via service-role key from `.env.local`** (never committed, never in client), idempotent `ON CONFLICT` semantics, `--dry-run` mode printing row counts per table. Column mapping tolerant (zh or en headers).
- Timezone: all `hour_start` stored as timestamptz at HK local hour (UTC+8); "today" in API queries = HK calendar day.

## 4. Widget data contract (api layer)

New `apps/web/src/lib/footfall/api.ts` — typed, singleton client, SELECT-only:

| Function | Source | Returns |
|---|---|---|
| `fetchTodayHourly(branchId)` | `footfall_hourly` (HK today) | `[{hour, inCount, outCount, uniqueVisitors}]` |
| `fetchEntranceHourly(branchId)` | `entrance_hourly` ⋈ `entrances` | per-gate today + 7-day totals |
| `fetchMonthDaily(branchId, month)` | `footfall_daily` | `[{day, inCount, uniqueVisitors}]` |
| `fetchWeekdayDistribution(branchId)` | `footfall_daily` (last 8 full weeks) | avg by ISO weekday (Mon-start) |
| `fetchHolidayAnalysis(branchId)` | `footfall_daily` ⋈ `calendar_days` | holiday rows + matched same-weekday normals |
| `fetchTodayUnique(branchId)` | `footfall_hourly.unique_visitors` sum + 7-day trend | number + spark series |
| `fetchAudience(branchId, range)` | `audience_daily` | gender split + age-group split |
| `fetchCompare(branchId, day)` | `footfall_daily` | series: selected day, 上週同曜日, 去年同期 ±7d window |

Shared conventions: HK-day boundaries computed in TS (no DB timezone assumptions); every fn throws `RosterError`-style typed errors; all rows scoped `branch_id` (RLS double-guards).

## 5. UI contract

- Overview = responsive 2-col grid of widget cards (KPI card for #6 spans, charts for the rest); Verkada-inspired dark ops via existing `flow.css` tokens; recharts (already a dependency) with dark-adapted `chartStyle`-like theming — **no new design system, no Open Design yet** (parent §9).
- Every string via `t()` from `FlowLocaleContext`; new keys under `overview.*` + `nav.*` additions in `flowMessages.ts` (zh-HK + en).
- Loading skeletons per card; error banner + retry per card (parent §7); empty states bilingual ("尚未匯入資料 — Phase 3 ETL").
- Honesty footnote on overview: "示例流量（匿名同級店舖）/ Sample traffic (anonymized comparable store)" while provenance = sample.
- Drill pages reuse the same card components at full width.
- Branch resolution reuses the `branchResolved` gate pattern from Phase 2 (no FORBIDDEN flash — lesson `0829905`).

## 6. Quality bar

- Unit: `footfall/api.test.ts` with mocked supabase client — **column names verified against migration `20260915000002` in review** (lesson: T9 assumed a nonexistent column and unit mocks hid it).
- Component: overview renders 8 widget cards from mocked api; one drill page render + retry path; skeleton-then-data.
- SQL: seed migration verified via MCP `execute_sql` (row counts, HK-day sums, holiday rows).
- ETL: `--dry-run` on fixture CSV asserts per-table row counts; full run against pilot DB then re-run asserts idempotency (0 new rows).
- Typecheck + full vitest green; `/retail` untouched.

## 7. Acceptance (manual smoke)

Manager signs in → `/flow` shows all 8 widgets with sample data + honesty footnote → 出入口 drill shows two gates → 客群畫像 shows gender/age splits → 同期對比 overlays last-week + YoY lines → 節假日 lists holidays vs normals → 設備 shows stub list → zh/en toggle flips every label → empty-state branch renders bilingual hint when ETL not yet run.
