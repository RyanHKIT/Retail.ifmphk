# IFMP Retail (pilot) — Product Design Spec

> **Date:** 2026-09-15  
> **Status:** **Approved** (2026-09-15)  
> **Product name:** **IFMP Retail** (ifmphk)  
> **Internal codename:** Flow (`/flow` routes while coexisting with legacy pitch)  
> **Stage:** Customer pilot (分店經理 daily use) — real product stage, not pitch-only demo

## 1. Summary

**IFMP Retail** (customer pilot) covers footfall 主控台, **in-store journey heatmap**, and full MeDo-parity 排班. First tenant **I.T. Causeway Bay** (銅鑼灣). Ships in the existing Vite React monorepo beside the **legacy pitch** at `/retail`, uses **Supabase** as system of record, publishes to **`retail.ifmphk.com`**, and uses Open Design only for visual comps after infrastructure exists.

## 2. Goals and non-goals

### Goals (pilot)

- 分店經理 can log in, view mandated footfall analytics, **in-store heatmap / 動線**, manage weekly roster (draft → publish, conflicts, staff registry, templates, policies, swap approvals, audit).
- Traditional Chinese + English UI.
- Verkada Command–inspired Operate look (not Verkada trademarks).
- Feature parity targets: 客流管家 主控台 widgets + **redesigned** journey heatmap + MeDo 排班 manager surfaces.
- Auth + RLS from day one on a **new** Supabase project.
- First-design traffic numbers from **北京优衣库** (relabeled as I.T. Causeway Bay); new AI floorplan; not legacy fake heatmap JSON as SoT.

### Non-goals (pilot)

- 員工-facing flows until manager pages are complete.
- Owner multi-branch admin (single store).
- Attendance / AI roster modules from MeDo extras (unless later pulled in).
- Replacing or breaking legacy pitch SPA at `/retail` until explicit cutover.
- Putting DongQia / 客流管家 credentials or Supabase `service_role` in the client or git.
- Using Open Design as the production frontend.

## 3. Architecture (§1 approved)

| Layer | Choice |
|-------|--------|
| FE | `apps/web` (Vite + React + react-router) — new `flow/` tree |
| BE | New Supabase project (not Retail mocks; not assumed prod IFMP DB) |
| Coexist | `/retail/*` pitch untouched; `/flow/*` for Flow while both live in one SPA |
| Publish | **`https://retail.ifmphk.com`** — old pitch moved off host before cutover |
| Cutover | Prefer `/` serving Flow on that host; until then `/flow` is fine |
| Design studio | Open Design + skill `open-design/skills/ifmp-flow` — comps only |
| Reference | `_reference/hk-roster-planner` for roster behavior/schema |

Three pillars, one product (**IFMP Retail**):

1. **主控台** — footfall analytics (manager mandate widgets).
2. **動線熱力** — in-store journey heatmap (zone intensity on floorplan).
3. **排班** — MeDo-parity manager roster.

## 4. Data model (§2 approved)

### 4.1 Roster (from MeDo initial schema, adapted)

Keep: `profiles`, `branches`, `branch_managers`, `employees`, `shift_templates`, `roster_weeks`, `assignments`, `swap_requests`, `audit_logs`, plus hour-policy / unavailable as needed for manager board.

- Seed **one** branch: I.T. Causeway Bay.
- Retail stations: **樓面 / 試衣 / 收銀** (not restaurant kitchen stations).
- Roles: `owner` | `branch_manager` | `staff` — pilot UI prioritizes **branch_manager**.

Defer schema v1 unless required: attendance (`00006`), AI generations (`00007`).

### 4.2 Footfall / 主控台

Reuse `branches` as site key.

| Store | Purpose |
|-------|---------|
| `footfall_hourly` | Today hourly + building blocks for week/month |
| `footfall_daily` | Month daily series; includes **unique (去重)** visitors |
| `entrances` + entrance counts | 出入口客流 |
| `audience_daily` | Gender × age_group |
| `calendar_days` | HK holiday flags/names |
| `alerts`, `devices` | 主控台 exceptions / device stubs |
| `zones` + `heatmap_snapshots` (or equivalent) | Floorplan URL, zone anchors, visit/dwell/intensity — **new seed**, not legacy fake JSON as source of truth |

**同期對比:** both **上週同曜日** and **去年同期**.

**今日去重客流:** **unique visitors** (deduped detections) — **not** 回頭客.

### 4.3 Data strategy (locked — first design)

**No real I.T. store data yet.**

| Source | Use |
|--------|-----|
| **北京优衣库** via 客流管家 / API (or export) | **Numeric source of truth** for 主控台 widgets (hourly, gates, unique, audience, holidays, 同期, etc.) |
| **Display name** | Relabel tenant as **I.T. Causeway Bay** in UI / `branches` — do not show 优衣库 / Uniqlo in customer-facing chrome |
| **Legacy `public/mock/retail/*` heatmap** | **Not** authoritative — old demo fakes. Keep only as interaction reference if useful |
| **2D floorplan** | Current plan is fake → **generate a new** fashion-store plan (AI/asset), remap zone anchors |
| **Heatmap metrics** | Prefer derive/map from Uniqlo-period traffic where possible; else synthesize zone intensity **consistent with** imported totals. UI/UX for Journey heat needs **significant redesign** (Verkada-inspired), not a skin on `/retail/journey` |
| **Honesty** | Internal/pilot: “sample traffic (anonymized comparable store)” — never claim live I.T. sensors until real feed exists |

Import path: DongQia/API or docs → ETL into Supabase → FE reads Supabase only (no browser call with vendor password).

### 4.4 Join (later phase)

Footfall / zone demand → roster headcount targets via `branch_id` + date/hour.

## 5. Required 主控台 displays (manager mandate)

All labels bilingual (zh-HK + en):

| # | zh-HK | en |
|---|--------|-----|
| 1 | 當日分時客流 | Today hourly footfall |
| 2 | 出入口客流 | Entrance / exit footfall |
| 3 | 當月每日客流 | Daily footfall (this month) |
| 4 | 週7天客流分佈 | 7-day weekly distribution |
| 5 | 節假日客流分析 | Holiday footfall analysis |
| 6 | 今日去重客流 | Today unique visitors (deduped) |
| 7 | 客群畫像：性別、年齡層 | Audience: gender, age group |
| 8 | 客流同期對比 | Compare: last week same weekday + YoY same period |
| 9 | 動線熱力（店內） | In-store journey heatmap (floorplan + zone density) |

## 6. Information architecture (§3 approved)

**Shell:** `FlowShell` — left nav, top bar (site, lang, user). Verkada-inspired dark ops.

| Route | zh-HK | en |
|-------|--------|-----|
| `/flow/login` | 登入 | Login |
| `/flow` | 主控台 | Overview (widgets 1–8 + compact heatmap) |
| `/flow/journey` | 動線熱力 | Journey heatmap (hero floorplan) |
| `/flow/entrances` | 出入口 | Entrances |
| `/flow/audience` | 客群畫像 | Audience |
| `/flow/compare` | 同期對比 | Compare |
| `/flow/holidays` | 節假日 | Holidays |
| `/flow/roster` | 排班 | Roster week board |
| `/flow/roster/staff` | 員工名冊 | Staff registry |
| `/flow/roster/templates` | 更表模板 | Shift templates |
| `/flow/roster/policies` | 工時政策 | Hour policies |
| `/flow/roster/swaps` | 調更審批 | Swap approvals |
| `/flow/roster/audit` | 審計 | Audit log |
| `/flow/devices` | 設備 | Devices (stub OK) |
| `/flow/settings` | 設定 | Settings |

員工 routes: **not in nav** until management complete.

## 7. Auth, i18n, errors, quality (§4 approved)

- Supabase Auth; seed ≥1 分店經理 for Causeway Bay.
- RLS: manager scoped to assigned branch.
- i18n: zh-HK + en toggle; persist preference.
- Failures: bilingual error + retry; empty chart states; hard roster conflicts block publish.
- Pilot acceptance: login → see 8 metrics + heatmap → roster draft/publish.
- Smoke checklist before `retail.ifmphk.com` cutover.

## 8. Delivery phasing

1. **Infra** — Supabase project, migrations, Auth, `/flow` shell, i18n skeleton, seed branch + manager.
2. **排班 (manager)** — week board, templates, staff, policies, publish, conflicts, audit, swap approvals.
3. **主控台** — seed footfall + widgets 1–8 + drill routes.
4. **動線熱力** — new floorplan asset; remap zones; significant Journey UX redesign; metrics aligned to imported Uniqlo-period traffic where possible.
5. **Join** — footfall / zones → roster demand hints.
6. **Open Design** — Verkada-grade visual comps; port tokens/layout into React.
7. **員工** — only after manager surfaces complete.
8. **Cutover** — move legacy pitch off `retail.ifmphk.com`; serve IFMP Retail pilot.

## 9. When to use Open Design

**Not now.** Start Open Design **after** step 1–3 have a real shell + real (seeded) data shapes in Cursor, so comps map to routes and widgets that already exist.

Use Open Design for:

- Overview density / chart layout under Verkada-inspired world  
- Shell chrome polish  
- Optional per-widget visual alternatives  

Do **not** use Open Design for:

- Supabase schema, RLS, Auth  
- MeDo behavior port  
- Deploy / domain cutover  

Skill folder ready: `open-design/skills/ifmp-flow/`.

## 10. Naming cheat sheet

| Layer | Value |
|-------|--------|
| Product (UI / manager) | **IFMP Retail** |
| Codename / folders | Flow (`/flow`, `pages/flow`) while legacy pitch coexists |
| Site | I.T. Causeway Bay |
| Publish host | retail.ifmphk.com |
| Dev routes | `/flow/*` |
| Legacy pitch | `/retail` (untouched until cutover) |
| Retired nickname | keliu (internal only; never UI) |

## 11. Open questions

None blocking. Data strategy locked in §4.3 (Uniqlo-period numbers, I.T. label).

## 12. Implementation plans

| Plan | Scope |
|------|--------|
| `docs/superpowers/plans/2026-09-15-ifmp-retail-flow-infra.md` | Phase 1 — Supabase, Auth, `/flow` shell, i18n |
| (next) | Phase 2 — MeDo-parity 排班 (manager) |
| (next) | Phase 3 — 主控台 widgets 1–8 + Uniqlo ETL |
| (next) | Phase 4 — 動線熱力 redesign + floorplan |
| (later) | Join, Open Design, 員工, cutover |
