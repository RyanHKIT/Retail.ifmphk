# Brief — ifmp-flow (IFMP Retail pilot)

## Locked decisions

| Decision | Value |
|----------|--------|
| Product name (UI) | **IFMP Retail** |
| Codename / routes | Flow — `/flow/*` while legacy pitch at `/retail` coexists |
| Stage | **Customer pilot** (店長/經理 daily) — real product stage |
| Code | `pages/flow`, `components/flow`, Supabase as system of record |
| OD skill id | `ifmp-flow` |
| Host (publish) | **`retail.ifmphk.com`**. Legacy pitch moves off before cutover. |
| In-app routes | **`/flow/*`** until cutover; then `/` on that host |
| Features | 客流主控台 (8 widgets) + **動線熱力** + **full MeDo 排班** |
| Look | Verkada Command–inspired + Open Design (comps later) |
| Tenant / site | **I.T. Causeway Bay** (銅鑼灣) — not 北京优衣库 |
| Sibling | Legacy pitch `/retail` — do not replace until cutover |
| Backend | New Supabase project; Auth + RLS from day one |
| Roles | **分店經理** first; **員工** after management pages done |
| Locale | **Traditional Chinese + English** (toggle) |
| Open Design | After shell + seed + widgets/heatmap exist in Cursor |
| Chat vs implement | Normal chat = **Auto**. Before each phase implement: switch **model + matching API key** (Flash key ≠ 5.3 key). Agent reminds at phase start. |

## Required 主控台 + journey

| # | zh-HK | en |
|---|--------|-----|
| 1–8 | (see design spec) | Footfall mandate widgets |
| 6 | 今日去重客流 | Unique visitors (not 回頭客) |
| 8 | 客流同期對比 | 上週同曜日 + 去年同期 |
| 9 | 動線熱力 | Journey heatmap — mocks exist under `public/mock/retail/` |

## Heatmap / traffic data

- **No real I.T. data yet.** Numbers from **北京优衣库** (API/export) → Supabase; UI name = I.T. Causeway Bay.
- Legacy `public/mock/retail/heatmap.json` = old fakes — not SoT.
- New AI-generated 2D floorplan; Journey UI/UX redesign (not skin of old `/retail/journey`).

## Do not put in this skill

- Live 客流管家 / DongQia passwords
- Supabase service_role keys
