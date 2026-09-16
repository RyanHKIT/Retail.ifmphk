# IFMP Retail (Flow pilot) — Phase 3 smoke + DongQia ETL

Date: 2026-09-16. Branch: `feature/ifmp-flow-infra`.

Phase 3 delivers `/flow` 主控台 widgets 1–8, drill pages (出入口 / 客群畫像 / 同期對比 / 節假日 / 設備), and a DongQia Open API importer. **Numeric SoT for this pilot is the SQL seed** (no purchased Open API app). Live pull is deferred (T8).

Honesty footnote: 示例流量（匿名同級店舖） / Sample traffic (anonymized comparable store).

## T8 — live DongQia pull (deferred)

Operator has **not purchased** 客流管家. Demo web login (`DONGQIA` @ `https://keliu.dongqia.com/`) is UI reference only — it is **not** `POST /api/Token` credentials.

`--live` without `DONGQIA_APP_ID` / `DONGQIA_APP_SECRET` exits 2 (`live pull deferred`). When a purchased app exists: dry-run live → upsert → rerun 0 new rows. Never commit values.

## Column audit (`apps/web/src/lib/footfall/api.ts` vs `20260915000002` + `20260916000005`)

| Query | Columns | DDL |
|---|---|---|
| `footfall_hourly` | `hour_start,in_count,out_count,unique_visitors` + `branch_id` | match |
| `footfall_daily` | `day,in_count,unique_visitors` + `branch_id` | match |
| `audience_daily` | `day,gender,age_group,visitor_count` + `branch_id` | match; `age_group` now DongQia buckets |
| `entrances` | `id,name_zh,name_en,sort_order` + `branch_id` | match |
| `entrance_hourly` | `entrance_id,hour_start,in_count,out_count` | match |
| `devices` | `name,status,last_seen_at` + `branch_id` | match |
| `calendar_days` | `day,is_holiday,name_zh,name_en` | match |

No phantom `branch_id` on `entrance_hourly` / `swap_requests`-style mistakes. Browser SELECT-only.

## ETL

Vendor: `https://oapi.dongqia.cn` (docs v1.0.3). Browser never calls DongQia. Script: `scripts/footfall-etl.mjs`.

### Field map

| DongQia | Supabase |
|---|---|
| `date` | `hour_start` (`…+08:00`) or `day` |
| `inSum` | `in_count` |
| `outSum` | `out_count` |
| `passbySum` | `passersby_count` |
| `inNoDupSum` | `unique_visitors` (去重, not 回頭客) |
| `sexManSum` / `sexWomanSum` / `sexUnknownSum` | `audience_daily.gender` male/female/unknown, `age_group=unknown` |
| `ageToddlerSum` … `ageElderlySum` | `audience_daily.age_group` toddler/teenager/youth/middle_aged/elderly, `gender=unknown` |
| device `title` | `devices.name` |
| `onLine=false` | `offline` |
| `status=2` | `degraded` |
| else | `online` |
| `newlySendDate` | `last_seen_at` |

Gender × age is **not** a vendor matrix. ETL stores independent marginals. `(unknown, unknown)` is the gender-unknown cell (`sexUnknownSum`) only — `ageUnknownSum` is dropped to keep the unique key.

Hourly `GetDatas` pages in **60-day** chunks. Daily pages in **365-day** chunks.

### Commands

```powershell
node --test scripts/dongqiaMap.test.mjs scripts/footfall-etl.test.mjs
node scripts/footfall-etl.mjs --from-fixture scripts/fixtures --dry-run
```

Expected dry-run counts: `footfall_hourly=2`, `footfall_daily=2`, `entrance_hourly=4`, `audience_daily=16`, `devices=2`.

### Env names (values never in git)

- `VITE_SUPABASE_URL` or `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (writes only)
- `DONGQIA_APP_ID` / `DONGQIA_APP_SECRET` / `DONGQIA_ORG_CODE` / `DONGQIA_STORE_CODE`
- `DONGQIA_ENTRANCE_CODES` (`CODE:uuid,CODE:uuid`)
- `DONGQIA_API_BASE` (optional, default `https://oapi.dongqia.cn`)
- `FLOW_BRANCH_ID` (optional, default I.T. Causeway Bay seed uuid)

## Smoke checklist (2026-09-16)

Pilot: `manager@ifmphk.com` / `demo1234` @ I.T. 銅鑼灣. Dev: `http://127.0.0.1:5174/`.

| Check | Result |
|---|---|
| Login → `/flow` | ✅ |
| 8 widget titles + honesty footnote | ✅ |
| Today hourly / unique after seed through 2026-09-16 | ✅ (first pass empty: seed ended 09-15; extended `00007`) |
| Overview audience month-to-date (not today-only) | ✅ (fixed during T9) |
| `/flow/entrances` two gates, 7-day totals | ✅ (今日 0 until `00007`) |
| `/flow/audience` gender + 幼兒/兒童/青年/中年/長者 | ✅ |
| `/flow/compare` 選定日 / 上週同曜日 / 去年同期 | ✅ |
| `/flow/holidays` HK labels + honesty | ✅ |
| `/flow/devices` Cam Main/Side online, Stockroom offline | ✅ |
| EN toggle flips nav + page copy | ✅ |
| `/retail` legacy pitch still renders | ✅ |
| Journey nav | stub (Phase 4) |

Automated (this closeout):

```
apps/web: npx vitest run  → 43 files / 203 tests
apps/web: npx tsc -b --noEmit → clean
scripts: node --test … → 9 pass
```

## Known deferrals

- T8 live DongQia pull (no Open API app)
- Heatmap / Journey → Phase 4
- HK holiday labels over Beijing-period numbers (honesty footnote)
- Device `last_seen_at` shown as ISO UTC string (not HK-formatted)
