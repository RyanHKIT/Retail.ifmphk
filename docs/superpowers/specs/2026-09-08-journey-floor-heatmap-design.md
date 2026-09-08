# Journey floor heatmap rework — Design

**Date:** 2026-09-08  
**Status:** Approved for planning  
**Scope:** Journey page hero heatmap + Overview compact heatmap (shared component)  
**Out of scope:** People page, live camera ingest, expanding zone set, dwell/path chart redesign

## Goal

Replace the schematic “solid rectangle per zone” floor heatmap with a **demo floorplan + soft density field** that looks like retail analytics — while keeping a **production-shaped data contract** so a real client floorplan and in-store cameras/detectors can feed the same UI later.

## Decisions (locked)

| Topic | Decision |
|-------|----------|
| Heat look | Soft **Gaussian / radial density blobs** at zone anchors (continuous field, not flat fills) |
| Surfaces | **Journey** (hero) + **Overview** (compact) share one component |
| Zones | Keep current **5** IDs: `entrance`, `shelf_a`, `shelf_b`, `fitting_room`, `cashier` — remap anchors onto the demo plan |
| Base art | User-supplied fashion-shop floorplan as **示範平面圖** (mock asset) |
| Spine | Zone click → Service Gap `?zone=` unchanged; deep links / Coach / Roster stay on same IDs |
| Honesty | Camera source chip + copy that heat is **mock density for demo**, not live CV |

## Production path (executable later)

The demo is a thin client on a **zone-intensity** feed, not a one-off graphic.

| Demo | Later (real store) |
|------|--------------------|
| Floorplan PNG/SVG in `public/` | Client floorplan via same `floor_plan_url` (or equivalent) |
| 5 zone anchors `{ x%, y%, r% }` | Recalibrated anchors (or polygons → centroid + radius) after camera install |
| Mock `visit_count` / `avg_dwell_sec` / `intensity` | Aggregates from cameras / 一見 / detectors |
| Canvas soft density renderer | Same renderer; optional later: pixel heat from tracks + homography |

**v1 product path does not require** pixel-level heatmaps. Zone-level intensity kernels are enough for Gap / Roster / Coach stories.

## Data contract

Extend zone / heatmap mocks (names illustrative; implementation may colocate fields):

```ts
// Floor plan
floor_plan_url: string  // e.g. /assets/floor-plans/it-demo-fashion.png
floor_plan_label?: string  // 示範平面圖

// Per zone (zones.json or heatmap companion)
zone_id: string
anchor: { x: number; y: number; r: number }  // percent of plan width/height; r = kernel radius %

// Per zone metrics (heatmap.json — existing)
visit_count: number
avg_dwell_sec: number
intensity: number  // 0..1 after metric normalization on the client
```

- **bbox** rectangles may remain for legacy/tests but are **not** the visual fill for Journey/Overview heat.
- Metric toggle on Journey (`composite` | `visits` | `dwell`) continues to renormalize `intensity` client-side.

## UI / interaction

### Journey

- Hero: floorplan full-bleed (or edge-to-edge within the hero panel); density overlay; legend low→high.
- Metric segment toggle unchanged.
- Clickable hit targets (invisible regions or soft hit radius) per zone → `setFocus` + navigate `/retail/service-gap?zone=`.
- Short honesty line near source chip: sample density on demo plan.

### Overview

- Same component with `compact`: smaller height, slightly weaker max opacity, same floorplan + blobs.
- Preserve existing Overview heatmap affordances (link/click behavior as today unless that conflicts with compact layout — prefer keep click → Gap or Journey story consistent with current Overview).

### Visual craft

- Base: provided floorplan image (desaturated slightly if needed so heat reads).
- Overlay: continuous soft field (teal→warm or existing chart token ramp), blended (e.g. multiply / soft-light), no hard rectangle fills.
- Labels: sparse zone name chips or tooltips on hover/focus; avoid covering the whole plan with opaque boxes.
- Reduced motion: static final field (no pulsing kernels).

## Component plan

- Rework `FloorHeatmap` (or successor) to:
  1. Draw / show `floor_plan_url`
  2. Render canvas (or equivalent) density from `anchor` + `intensity`
  3. Overlay accessible hit targets for the 5 zones
- Overview and Journey both import this component; CSS modifiers `--hero` / `--compact` only.

## Demo asset

- Store the approved floorplan under e.g. `public/assets/floor-plans/it-demo-fashion.png` (or `.webp`).
- Point `zones.json` `floor_plan_url` at it.
- UI must not imply this is a real I.T. store CAD.

## Acceptance

- Journey hero shows demo floorplan + soft density (not solid region fills).
- Overview compact heatmap uses the same visual language.
- Metric toggle changes blob intensity.
- Zone click still opens Service Gap with the correct `zone_id`.
- Mock schema documents anchors so a later real plan is a data swap, not a UI rewrite.
- `npm test` + `npm run build` pass; Journey/Overview heatmap tests updated.

## Non-goals

- Expanding to 7–8 zones for rest area / showcase / jewelry (decorative-only hotspots deferred).
- Live WebRTC / camera streams.
- Replacing dwell ranking charts or journey path lists in this rework.
