# IFMP Retail (Flow pilot) — Phase 4 動線熱力

Date: 2026-09-16. Branch: `feature/ifmp-flow-infra`.

Phase 4 seeds a demo fashion floorplan plus `heatmap_daily` intensity from existing `footfall_daily.in_count`, then ships `/flow/journey` and the Overview compact card. **Numeric SoT is this SQL seed.** Honesty: demo plan + sample density, not live CV.

Display tenant: I.T. Causeway Bay / I.T. 銅鑼灣. Never show 优衣库.

## Seed (`20260916000008_flow_heatmap_seed`)

Branch `a0000000-0000-4000-8000-000000000001`:

| Field | Value |
|-------|-------|
| `floor_plan_url` | `/assets/floor-plans/it-cwb-demo.png` |
| `floor_plan_label_zh` | 示範平面圖 |
| `floor_plan_label_en` | Demo floor plan |

Asset: `public/assets/floor-plans/it-cwb-demo.png` (top-down boutique plan). Served as a Vite public file.

### Anchors (percent of plan width/height)

| zone_key | name | anchor_x | anchor_y | anchor_r |
|----------|------|----------|----------|----------|
| `entrance` | 入口 | 50 | 88 | 12 |
| `shelf_a` | 貨架 A | 22 | 48 | 16 |
| `shelf_b` | 貨架 B | 52 | 42 | 14 |
| `fitting_room` | 試衣間 | 82 | 50 | 11 |
| `cashier` | 收銀台 | 72 | 82 | 10 |

Do not change keys. Adjust numbers only if kernels miss labels on the PNG.

### Intensity shares / dwell (spec-locked, no RNG)

`visit_count = round(in_count * share)`.  
`intensity = visit_count / max(visit_count on that day)` (entrance is 1.0 on any non-zero day).

| zone_key | share of `in_count` | avg_dwell_sec |
|----------|---------------------|---------------|
| `entrance` | 1.00 | 20 |
| `shelf_a` | 0.55 | 95 |
| `shelf_b` | 0.42 | 80 |
| `fitting_room` | 0.22 | 210 |
| `cashier` | 0.18 | 40 |

Expected rows: 5 zones × `COUNT(*)` of `footfall_daily` for this branch (equal counts per `zone_key`).

## Smoke checklist (T6 fills results)

Pilot: `manager@ifmphk.com` / `demo1234` @ I.T. 銅鑼灣. Dev: `http://127.0.0.1:5174/`.

| Check | Result |
|-------|--------|
| Login → `/flow` compact heatmap shows floorplan (not empty stub) | Pass — zone buttons + Journey Heatmap link on Overview; compact card below fold |
| `/flow/journey` hero + 綜合/人次/停留 toggles | Pass — Composite/Visits/Dwell; Gaussian blobs on demo plan |
| Click 試衣間 → URL `?zone=fitting_room` + focus numbers | Pass — `?zone=fitting_room`; Fitting Room Visits 581 / Avg dwell 210 sec |
| No `/retail/service-gap` navigation | Pass — stays on `/flow/journey` |
| `/retail/journey` still the old pitch (untouched) | Pass — pitch SPA 動線 still loads |
| Honesty line visible | Pass — sample traffic + demo floor plan / not live CV |
| `/api/health` 3000 refuse is ignorable | Pass — Vite proxy ECONNREFUSED 3000, `/flow` still works |

Automated (T6):

```
apps/web: npx tsc --noEmit
  → TS5101 baseUrl deprecated (pre-existing tsconfig; no Phase 4 type errors)
apps/web: npx vitest run
  → Phase 4 files 27/27 pass
  → full suite 213 pass / 1 fail: Templates.test create dialog timeout 5s (pre-existing roster flake, not heatmap)
```

## Known deferrals

- UX-authority restyle of `flow.css` / FlowShell (after this phase)
- Live CV / Verkada density
- Open Design comps
