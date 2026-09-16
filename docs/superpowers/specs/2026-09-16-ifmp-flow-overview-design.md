# IFMP Retail (pilot) — Phase 3 Design Spec: 主控台 (Overview widgets 1–8 + ETL)

> **Date:** 2026-09-16
> **Status:** Approved 2026-09-16 — age buckets = DongQia 5+unknown; live API pull deferred (demo login only, no purchased Open API app)
> **Parent spec:** `docs/superpowers/specs/2026-09-15-ifmp-flow-design.md` (§4.2 tables, §5 widget mandate, §4.3 data strategy)
> **Plan:** `docs/superpowers/plans/2026-09-16-ifmp-flow-overview.md`
> **Vendor API:** 客流管家云平台 Open API `oapi.dongqia.cn` (docs: `http://cloud.keliuguanjia.com/#/views/develop/doc`, v1.0.3 2025-08-02)

## 1. Summary

Phase 3 delivers the **manager 主控台** under `/flow`: overview page with the eight mandated footfall widgets, drill routes (出入口 / 客群畫像 / 同期對比 / 節假日), a devices page, and a **DongQia Open API → Supabase ETL**. Browser never calls DongQia (parent §4.3). Display tenant stays **I.T. Causeway Bay**; numbers are 北京优衣库-period traffic with the honesty footnote.

Schema from migration `20260915000002` is kept. One small align: `audience_daily.age_group` CHECK currently uses Western 6-buckets (`0-17`…`55+`) that DongQia cannot fill — Phase 3 migrates the CHECK to DongQia's 5 life-stage buckets + unknown (decision §3.3).

## 2. Scope

| Surface | Route | Content |
|---|---|---|
| 主控台 Overview | `/flow` | Widgets 1–8 (spec parent §5) |
| 出入口 drill | `/flow/entrances` | Per-gate in/out, today + 7-day |
| 客群畫像 drill | `/flow/audience` | Gender × age-group distributions |
| 同期對比 drill | `/flow/compare` | 上週同曜日 + 去年同期 |
| 節假日 drill | `/flow/holidays` | Holiday vs normal-day traffic table |
| 設備 | `/flow/devices` | Read-only device list from ETL |

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
- Real-time streaming / webhook ingest → batch ETL only (cron later, not this phase)
- Manager editing of footfall data — ETL-only writes (RLS already enforces)
- Alerts UI beyond an empty-state card → later phase
- `retail.ifmphk.com` cutover → after Phase 4
- Browser-side DongQia calls — forbidden (parent non-goal)

## 3. Data strategy

Parent §4.3: numeric SoT = **北京优衣库 via 客流管家 API**, relabeled I.T. Causeway Bay. Honesty label until a live I.T. feed exists: "示例流量（匿名同級店舖）/ Sample traffic (anonymized comparable store)".

Vendor is **not a CSV dump**. It is REST JSON at `https://oapi.dongqia.cn` (docs also allow HTTP). ETL is a Node script using **appID / appSecret** (env only, never git, never client).

### 3.1 DongQia Open API (locked from vendor docs v1.0.3)

Auth: `POST /api/Token` `{appID, appSecret}` → `{token, expires_in, token_type:"Bearer"}`. All other calls send `Authorization: Bearer <token>` (space after Bearer).

| Call | Use for us |
|---|---|
| `GET /api/GetAccStores?accOrgCode=` | Resolve store (实体) code + timezone |
| `GET /api/GetVDDatasByAs?ObjCodes=&BeginDate=&EndDate=` | Entrance (出入口) summary sanity-check |
| `POST /api/GetDatas` `objTypes:1` `timeType:3` | Entity **hourly** → `footfall_hourly` |
| `POST /api/GetDatas` `objTypes:1` `timeType:4` | Entity **daily** → `footfall_daily` |
| `POST /api/GetDatas` `objTypes:2` `timeType:3` | Entrance **hourly** → `entrance_hourly` |
| `GET /api/GetAccDevices?ObjCodes=` | Device list → `devices` |

Paging limits (vendor): hourly span **≤ 60 days** per call; daily span **≤ 1 year**. YoY widgets need ~16 months → ETL pages hourly in 60-day chunks.

`dataList[]` fields we persist:

| DongQia | Supabase |
|---|---|
| `date` | `hour_start` (timestamptz, vendor local hour) or `day` (date) |
| `inSum` | `in_count` |
| `outSum` | `out_count` |
| `passbySum` | `passersby_count` |
| `inNoDupSum` | `unique_visitors` (今日去重 = unique, **not** 回頭客) |
| `sexManSum` / `sexWomanSum` / `sexUnknownSum` | `audience_daily.gender` male/female/unknown |
| `ageToddlerSum` … `ageElderlySum` / `ageUnknownSum` | `audience_daily.age_group` (see §3.3) |

`GetAccDevices` map: `onLine=false` → `offline`; `status=2` (预警) → `degraded`; else `online`. `newlySendDate` → `last_seen_at`. `title` → `name`.

Timezone: vendor store `TimeZone` is China Standard Time (UTC+8) for 北京优衣库 — same offset as HK. Store `hour_start` as timestamptz at that local hour; "today" in the FE = **HK calendar day** (UTC+8), which coincides.

Known honesty limit: `calendar_days` is **HK holidays**; traffic is **Beijing-period**. Holiday widget overlays HK labels on Beijing numbers — do not claim a true HK holiday effect. Footnote covers this.

### 3.2 Credentials (locked 2026-09-16)

Operator has **not purchased** 客流管家. Available today:

| What | Role |
|---|---|
| 演示账号 `DONGQIA` @ `https://keliu.dongqia.com/` | Human UI reference (widget shapes / labels). Password stays with operator — **never paste into git or chat**. |
| Open API `appID` / `appSecret` / 组织·实体·出入口编号 | **Not issued.** Token endpoint cannot be called for real traffic. |

Web login ≠ Open API. `POST /api/Token` wants an application pair from the developer portal, not the demo username/password.

Until a purchased app exists:

- T1 still ships the importer against **documented JSON shapes** (fixtures only, no live Token call in CI).
- T2 deterministic SQL seed is the **numeric SoT for this pilot** (Uniqlo-plausible magnitudes, honesty footnote on).
- T8 live pull is **deferred** to a later phase / ops task.

Env var **names** (for when an app is purchased; values never in git): `DONGQIA_APP_ID`, `DONGQIA_APP_SECRET`, `DONGQIA_ORG_CODE`, `DONGQIA_STORE_CODE`, `DONGQIA_ENTRANCE_CODES`, plus existing `SUPABASE_SERVICE_ROLE_KEY`.

Public vendor docs include example `appID`/`appSecret` strings. Treat as documentation dummies. **Do not copy them into this repo.**

### 3.3 Age buckets (locked: A)

Phase 1 CHECK (`'0-17'`…`'55+'`) is replaced. Persist DongQia keys `toddler|teenager|youth|middle_aged|elderly|unknown`. UI: 幼兒 / 兒童 / 青年 / 中年 / 長者 / 未知. Do **not** invent year ranges (vendor doc does not publish them).

### 3.4 Importer

`scripts/footfall-etl.mjs`:

- `--dry-run` prints per-table upsert counts, no writes
- `--from-fixture <json>` for tests (vendor-shaped `GetDatas` payload, no network)
- live mode: token → paged `GetDatas` → upsert `ON CONFLICT`
- idempotent; rerun 0 new rows
- never logs secrets

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
| `fetchDevices(branchId)` | `devices` | `[{name, status, lastSeenAt}]` |

Shared conventions: HK-day boundaries computed in TS (no DB timezone assumptions); every fn throws typed errors; all rows scoped `branch_id` (RLS double-guards).

## 5. UI contract

- Overview = responsive 2-col grid of widget cards (KPI card for #6 spans, charts for the rest); Verkada-inspired dark ops via existing `flow.css` tokens; recharts (already a dependency) with dark-adapted theming — **no new design system, no Open Design yet** (parent §9).
- Every string via `t()` from `FlowLocaleContext`; new keys under `overview.*` + drill namespaces in `flowMessages.ts` (zh-HK + en).
- Loading skeletons per card; error banner + retry per card (parent §7); empty states bilingual ("尚未匯入資料").
- Honesty footnote on overview while provenance = sample.
- Drill pages reuse the same card components at full width.
- Branch resolution reuses the `branchResolved` gate pattern from Phase 2 (no FORBIDDEN flash — lesson `0829905`).

## 6. Quality bar

- Unit: `footfall/api.test.ts` with mocked supabase client — **column names verified against migration `20260915000002` (+ age-group alter) in review** (lesson: T9 assumed a nonexistent column and unit mocks hid it).
- Component: overview renders 8 widget cards from mocked api; one drill page render + retry path; skeleton-then-data.
- SQL: seed (or live ETL) verified via MCP `execute_sql` (row counts, HK-day sums).
- ETL: `--dry-run` on vendor-shaped JSON fixture asserts per-table counts; full run then re-run asserts idempotency (0 new rows).
- Typecheck + full vitest green; `/retail` untouched.
- No DongQia credentials in git, client bundle, or commit messages.

## 7. Acceptance (manual smoke)

Manager signs in → `/flow` shows all 8 widgets with data + honesty footnote → 出入口 drill shows mapped gates → 客群畫像 shows gender + DongQia age labels → 同期對比 overlays last-week + YoY lines → 節假日 lists HK holidays vs normals (honesty: Beijing-period numbers) → 設備 shows ETL device list → zh/en toggle flips every label → empty-state branch renders bilingual hint when ETL not yet run.
