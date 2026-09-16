# IFMP Retail (Flow) — Phase 4 Design Spec: 動線熱力

> **Date:** 2026-09-16
> **Status:** Draft for review (tools-first; no Verkada chrome in this phase)
> **Parent:** `docs/superpowers/specs/2026-09-15-ifmp-flow-design.md` (§4.2 zones/heatmap, §4.3 floorplan, §5 widget 9, §8 step 4)
> **UX authority:** `docs/superpowers/specs/2026-09-16-ifmp-flow-ux-authority-design.md` (restyle **after** this phase)
> **Interaction reference (not SoT):** `docs/superpowers/specs/2026-09-08-journey-floor-heatmap-design.md` + `/retail` `FloorHeatmap` / `densityField.ts`
> **Plan:** `docs/superpowers/plans/2026-09-16-ifmp-flow-phase4-journey.md`

## 1. Summary

Phase 4 delivers mandated display **#9 動線熱力** on `/flow`: a **demo fashion floorplan** plus **soft Gaussian zone density**, fed from Supabase `zones` + `heatmap_daily`. Overview gets a compact card of the same component.

This is a **tool**, not a visual-world rewrite. Keep current `flow.css`. Do not skin `/retail/journey`. Do not wait on estate-ai-ops Task 6.

## 2. Why tools-first (locked)

Comps against empty Journey stubs waste a restyle cycle. Heatmap layout (hero vs compact, metric toggle, hit targets) must exist with real seed numbers **before** Open Design / Verkada chrome. Restyle then swaps tokens around a stable renderer.

## 3. Scope

| Surface | Route | Content |
|---|---|---|
| Journey hero | `/flow/journey` | Floorplan + density + metric toggle + zone focus panel |
| Overview compact | `/flow` | Same component, `compact`, links to `/flow/journey` |
| Data | SQL seed + SELECT API | 5 zones, daily intensity aligned to `footfall_daily.in_count` |
| Asset | `public/assets/floor-plans/it-cwb-demo.png` | New top-down fashion plan (not legacy mock JSON) |

### Out

- Verkada / light-Signal-Blue restyle (`flow.css` tokens, `FlowShell` chrome)
- `/retail/*` edits except **read-only** reuse of `apps/web/src/lib/densityField.ts` (already shared, not under `pages/retail`)
- Pixel-track heat, homography, live CV
- DongQia 駐留 as its own IA page
- Service Gap page in `/flow` (not built). Zone click **must not** send the manager to `/retail/service-gap`
- Join to roster demand (parent §4.4)
- Open Design comps (parent §8 step 6)

## 4. Data contract

Schema already exists (`20260915000002`). No new tables. Writes remain ETL/SQL only.

```ts
export type ZoneKey = 'entrance' | 'shelf_a' | 'shelf_b' | 'fitting_room' | 'cashier'

export type ZoneRow = {
  id: string
  zoneKey: ZoneKey
  nameZh: string
  nameEn: string
  zoneType: string
  anchorX: number // % 0–100
  anchorY: number
  anchorR: number
}

export type HeatmapDayRow = {
  zoneId: string
  zoneKey: ZoneKey
  visitCount: number
  avgDwellSec: number
  intensity: number // 0–1 stored; visits-normalized for that day
}

export type JourneyPayload = {
  floorPlanUrl: string
  floorPlanLabelZh: string
  floorPlanLabelEn: string
  zones: ZoneRow[]
  heat: HeatmapDayRow[]
  day: string // HK Y-M-D
}
```

`fetchJourney(branchId, day = hkToday())`:

- `branches`: `floor_plan_url`, `floor_plan_label_zh`, `floor_plan_label_en`
- `zones`: all columns except `created_at`
- `heatmap_daily` for that `day`, join `zones` for `zone_key`

Empty heat (no rows) is a valid empty state, not an error.

### Intensity seed (deterministic)

For each `footfall_daily` row already seeded (16-month window), insert 5 `heatmap_daily` rows:

| zone_key | visit share of `in_count` | avg_dwell_sec |
|---|---|---|
| entrance | 1.00 | 20 |
| shelf_a | 0.55 | 95 |
| shelf_b | 0.42 | 80 |
| fitting_room | 0.22 | 210 |
| cashier | 0.18 | 40 |

`visit_count = round(in_count * share)`.  
`intensity = visit_count / max(visit_count on that day)` (entrance is always 1.0).  
No RNG. Shares may exceed 1.0 across zones (people counted in multiple zones) — that is correct.

### Anchors

Keep five `zone_key`s from `20260915000003`. After the floorplan asset exists, **UPDATE** `anchor_x/y/r` so kernels sit on the drawn 入口 / 貨架 A / 貨架 B / 試衣間 / 收銀台. Do not change keys.

`branches.floor_plan_url = '/assets/floor-plans/it-cwb-demo.png'`  
Labels: `示範平面圖` / `Demo floor plan`.

## 5. Renderer

Reuse `apps/web/src/lib/densityField.ts` (`accumulateGaussians` + `colorizeDensity` + `paintDensityField`). Teal→warm ramp stays for this phase (retail chart tokens). Do not retint to Signal Blue until restyle.

New presentational component: `apps/web/src/components/flow/FlowFloorHeatmap.tsx`

- Base `<img>` of the floorplan (desaturate slightly in CSS so heat reads)
- Canvas overlay from `paintDensityField`
- Invisible circular hit targets at anchors (`role="button"`, `aria-label` = zone name)
- `compact` vs hero height
- `prefers-reduced-motion: reduce` → paint once, no pulse

**Forbidden:** solid rectangle `.floor-zone` fills as the heat visual (legacy `/retail` anti-pattern before 2026-09-08).

### Metric toggle (Journey only)

`composite` | `visits` | `dwell` — client renormalize 0–1 from `visitCount` / `avgDwellSec`:

```
visits:    i = visit / max(visit)
dwell:     i = dwell / max(dwell)
composite: i = 0.6 * visits_i + 0.4 * dwell_i, then divide by max
```

Pass resulting `intensity` into `DensityPoint`. Stored `heatmap_daily.intensity` is the visits default.

## 6. Interaction

- Click / Enter on a zone: set focus, `navigate(/flow/journey?zone=<zone_key>)` (or `setSearchParams` if already there).
- Focus panel (Journey): name, visit_count, avg_dwell_sec, intensity %.
- Overview compact: click zone **or** card title → `/flow/journey?zone=` if a zone, else `/flow/journey`.
- Deep link `?zone=shelf_a` focuses that zone on load; unknown key ignored.
- Do **not** route to `/retail/service-gap`.

## 7. Honesty + i18n

Same footnote family as Overview:

- Heat is **sample density on a demo plan**, not live CV / not a real I.T. CAD.
- Traffic numbers remain Uniqlo-period, labeled I.T. Causeway Bay (parent §4.3). Never show 优衣库.

Keys under `journey.*` in `flowMessages.ts` (zh-HK + en). Source chip text: 店內攝像 / Camera (provenance of the **story**, not a live feed).

## 8. Quality

- Vitest: density already covered; add `fetchJourney` column-name test; Journey page: skeleton → data, metric toggle changes canvas contract via testid, zone click sets `?zone=`, empty state; Overview compact card present.
- `tsc --noEmit` green.
- Browser smoke: login → `/flow` compact heat visible → `/flow/journey` hero + toggle + click panel. `/retail` unchanged.
- Secrets: none. No DongQia in this phase.

## 9. Risks

| Risk | Mitigation |
|------|------------|
| Restyle mid-task | UX-authority spec: keep `flow.css` |
| Using `/retail` FloorHeatmap | New `FlowFloorHeatmap`; share only `densityField.ts` |
| Fake heatmap JSON as SoT | Supabase only |
| Floorplan vs anchors mismatch | UPDATE anchors in same seed migration as URL |
| Agent waits on Verkada Task 6 | Not a gate for this phase |
