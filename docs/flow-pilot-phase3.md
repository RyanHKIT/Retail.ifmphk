# IFMP Retail (Flow pilot) — Phase 3 smoke + DongQia ETL

Phase 3 delivers `/flow` 主控台 widgets 1–8, drill pages, and a DongQia Open API importer. **Numeric SoT for this pilot is the T2 SQL seed** (no purchased Open API app). Live pull is deferred (T8).

Honesty footnote in UI: 示例流量（匿名同級店舖） / Sample traffic (anonymized comparable store).

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

`--live` needs a purchased app. Without credentials the process exits 2 (`live pull deferred`). Do not paste demo web passwords into env as `DONGQIA_APP_*` — those are not Token credentials.

### Env names (values never in git)

ETL reads `apps/web/.env` plus process env. None of these go in the Vite client:

- `VITE_SUPABASE_URL` or `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (writes only)
- `DONGQIA_APP_ID`
- `DONGQIA_APP_SECRET`
- `DONGQIA_ORG_CODE`
- `DONGQIA_STORE_CODE`
- `DONGQIA_ENTRANCE_CODES` (`CODE:uuid,CODE:uuid`)
- `DONGQIA_API_BASE` (optional, default `https://oapi.dongqia.cn`)
- `FLOW_BRANCH_ID` (optional, default I.T. Causeway Bay seed uuid)

## Smoke (after T4–T7 pages exist)

Manager signs in → `/flow` shows 8 widgets + honesty footnote → drills: 出入口, 客群畫像, 同期對比, 節假日, 設備 → zh/en toggle → `/retail` untouched.

## Known deferrals

- T8 live DongQia pull (no Open API app)
- Heatmap / Journey → Phase 4
- HK holiday labels over Beijing-period numbers (honesty footnote)
