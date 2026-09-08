# Journey Floor Heatmap Density Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace solid-rectangle zone fills with a demo fashion floorplan plus a soft Gaussian density overlay on Journey (hero) and Overview (compact), using a production-shaped zone-anchor contract.

**Architecture:** Keep mock JSON as the feed. Extend `zones.json` with `floor_plan_url` + per-zone `anchor {x,y,r}` (% of plan). A pure `paintDensityField` helper accumulates kernels into an ImageData buffer and colorizes; `FloorHeatmap` composites floorplan `<img>` + canvas overlay + invisible circular hit targets. Real stores later swap asset + anchors + metrics only.

**Tech Stack:** Vite/React in `apps/web`; Vitest + Testing Library; Canvas 2D; CSS in `retail.css`; mock under `public/mock/retail` and assets under `public/assets/floor-plans/`.

**Spec:** `docs/superpowers/specs/2026-09-08-journey-floor-heatmap-design.md`

## Global Constraints

- Keep the five zone IDs: `entrance`, `shelf_a`, `shelf_b`, `fitting_room`, `cashier` (spine deep-links unchanged)
- Demo honesty: UI must not imply live CV or a real I.T. CAD — label 示範平面圖 / mock density
- No solid rectangle fills for heat on Journey/Overview; bbox may remain in JSON unused by the visual
- Metric toggle on Journey still renormalizes intensity client-side
- Prefer `transform`/`opacity` only if any motion; respect `prefers-reduced-motion` (static field)
- 繁中-first copy; commit per task; no secrets
- Serve from `apps/web` with root `publicDir` — never `_handoff_extract`

---

## File map

| Path | Role |
|------|------|
| `public/assets/floor-plans/it-demo-fashion.png` | Demo floorplan asset (from Cursor image attach) |
| `public/mock/retail/zones.json` | `floor_plan_url`, `floor_plan_label`, zone `anchor` |
| `apps/web/src/api/retail.ts` | `ZoneAnchor`, extended `ZonesData` |
| `apps/web/src/lib/densityField.ts` | Pure intensity accumulation + colorize |
| `apps/web/src/lib/densityField.test.ts` | Unit tests for kernels / ramp |
| `apps/web/src/components/retail/FloorHeatmap.tsx` | Floorplan + canvas + hit targets |
| `apps/web/src/components/retail/FloorHeatmap.test.tsx` | DOM / a11y / click contract |
| `apps/web/src/pages/retail/Journey.tsx` | Pass `floorPlanUrl`; honesty copy |
| `apps/web/src/pages/retail/Overview.tsx` | Pass `floorPlanUrl` into compact heatmap |
| `apps/web/src/pages/retail/Journey.test.tsx` | Keep zone-click → Gap; assert floorplan img |
| `apps/web/src/i18n/messages.ts` | Honesty / demo-plan strings (zh-Hant, zh-Hans, en) |
| `apps/web/src/retail.css` | Floorplan/canvas/hit-target styles; retire solid `.floor-zone` fills |
| `docs/demo-script.md` | One-line Journey beat note about demo plan + density |

---

### Task 1: Floorplan asset + zone anchors + types

**Files:**
- Create: `public/assets/floor-plans/it-demo-fashion.png`
- Modify: `public/mock/retail/zones.json`
- Modify: `apps/web/src/api/retail.ts` (`ZonesData` + `ZoneAnchor`)
- Create: `apps/web/src/api/zones.anchor.test.ts`

**Interfaces:**
- Consumes: existing `zones.json` zone_ids
- Produces:
```ts
export type ZoneAnchor = { x: number; y: number; r: number } // percent 0–100
export interface ZonesData {
  store_name: string
  floor_plan_url: string
  floor_plan_label?: string
  zones: {
    zone_id: string
    name: string
    type: string
    bbox: { x: number; y: number; w: number; h: number }
    anchor: ZoneAnchor
    area_sqm: number
  }[]
}
```

- [ ] **Step 1: Copy the demo floorplan asset**

Source (Cursor attach):  
`C:\Users\rchan\.cursor\projects\c-Users-rchan-AI-ifmp-shop\assets\c__Users_rchan_AppData_Roaming_Cursor_User_workspaceStorage_14f1121e3c3ba957024dd04fbfd3f08a_images_image-44918a34-d7eb-4db0-8a55-d8f688ad7111.png`

```powershell
New-Item -ItemType Directory -Force -Path "public\assets\floor-plans" | Out-Null
Copy-Item -LiteralPath "C:\Users\rchan\.cursor\projects\c-Users-rchan-AI-ifmp-shop\assets\c__Users_rchan_AppData_Roaming_Cursor_User_workspaceStorage_14f1121e3c3ba957024dd04fbfd3f08a_images_image-44918a34-d7eb-4db0-8a55-d8f688ad7111.png" -Destination "public\assets\floor-plans\it-demo-fashion.png"
```

Expected: file exists at `public/assets/floor-plans/it-demo-fashion.png`.

- [ ] **Step 2: Write failing anchor contract test**

```ts
// apps/web/src/api/zones.anchor.test.ts
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../public/mock/retail')

test('zones.json exposes floor_plan_url and anchors for all five spine zones', () => {
  const raw = JSON.parse(readFileSync(resolve(root, 'zones.json'), 'utf-8'))
  const data = raw.data
  expect(data.floor_plan_url).toBe('/assets/floor-plans/it-demo-fashion.png')
  expect(data.floor_plan_label).toMatch(/示範/)
  const ids = ['entrance', 'shelf_a', 'shelf_b', 'fitting_room', 'cashier']
  for (const id of ids) {
    const z = data.zones.find((x: { zone_id: string }) => x.zone_id === id)
    expect(z?.anchor).toEqual(
      expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
        r: expect.any(Number),
      }),
    )
    expect(z.anchor.x).toBeGreaterThanOrEqual(0)
    expect(z.anchor.x).toBeLessThanOrEqual(100)
    expect(z.anchor.y).toBeGreaterThanOrEqual(0)
    expect(z.anchor.y).toBeLessThanOrEqual(100)
    expect(z.anchor.r).toBeGreaterThan(0)
  }
})
```

- [ ] **Step 3: Run test — expect FAIL**

```powershell
cd apps\web
npx vitest run src/api/zones.anchor.test.ts
```

Expected: FAIL (missing `anchor` / wrong `floor_plan_url`).

- [ ] **Step 4: Update `zones.json` + types**

Set `floor_plan_url` to `/assets/floor-plans/it-demo-fashion.png`, `floor_plan_label` to `示範平面圖（樣本）`.

Remap anchors onto the fashion plan (tune ±3% if visual QA needs it):

| zone_id | anchor `{x,y,r}` | Landmark |
|---------|------------------|----------|
| `entrance` | `{50, 92, 12}` | bottom-center doors |
| `shelf_a` | `{18, 48, 16}` | left wall shelves / clothes stand |
| `shelf_b` | `{40, 32, 14}` | mid-floor racks toward logo wall |
| `fitting_room` | `{82, 28, 12}` | top-right fitting stalls |
| `cashier` | `{58, 20, 11}` | L-shaped checkout under logo wall |

Keep existing `bbox` values for backward compatibility (unused by density visual).

Update `ZonesData` in `apps/web/src/api/retail.ts` to include `floor_plan_url`, optional `floor_plan_label`, and required `anchor` on each zone.

- [ ] **Step 5: Re-run test — expect PASS; commit**

```powershell
cd apps\web
npx vitest run src/api/zones.anchor.test.ts
```

```bash
git add public/assets/floor-plans/it-demo-fashion.png public/mock/retail/zones.json apps/web/src/api/retail.ts apps/web/src/api/zones.anchor.test.ts
git commit -m "feat: demo floorplan asset and zone density anchors"
```

---

### Task 2: Pure density-field painter

**Files:**
- Create: `apps/web/src/lib/densityField.ts`
- Create: `apps/web/src/lib/densityField.test.ts`

**Interfaces:**
- Consumes: `ZoneAnchor`, intensity `0..1`
- Produces:
```ts
export type DensityPoint = { x: number; y: number; r: number; intensity: number }

/** Fill Float32 intensity buffer (length = width*height), values roughly 0..~1+ */
export function accumulateGaussians(
  width: number,
  height: number,
  points: DensityPoint[],
  out: Float32Array,
): void

/** Map intensity buffer → RGBA ImageData-like Uint8ClampedArray (length width*height*4) */
export function colorizeDensity(
  intensity: Float32Array,
  width: number,
  height: number,
  outRgba: Uint8ClampedArray,
  opts?: { maxAlpha?: number },
): void

export function paintDensityField(
  width: number,
  height: number,
  points: DensityPoint[],
  opts?: { maxAlpha?: number },
): ImageData
```

Color ramp (teal→warm, token-aligned approx for canvas — hex ok in painter):

| t | rgba |
|---|------|
| 0 | transparent |
| 0.25 | `12, 111, 106, ~40` (`#0c6f6a`) |
| 0.55 | `20, 160, 140, ~90` |
| 0.8 | `220, 140, 60, ~140` |
| 1 | `200, 70, 50, ~180` |

Gaussian: for each pixel, `intensity += peak * exp(-0.5 * (d/sigma)^2)` where `sigma = (r/100)*min(w,h) / 2.2`, peak scaled by zone `intensity`. Clamp before colorize with a soft max (e.g. divide by max or `1 - exp(-v)`).

- [ ] **Step 1: Write failing tests**

```ts
// apps/web/src/lib/densityField.test.ts
import { expect, test } from 'vitest'
import { accumulateGaussians, colorizeDensity, paintDensityField } from './densityField'

test('accumulateGaussians peaks near the anchor and is near-zero far away', () => {
  const w = 40
  const h = 40
  const out = new Float32Array(w * h)
  accumulateGaussians(w, h, [{ x: 50, y: 50, r: 20, intensity: 1 }], out)
  const mid = out[20 * w + 20]
  const corner = out[0]
  expect(mid).toBeGreaterThan(corner)
  expect(mid).toBeGreaterThan(0.2)
  expect(corner).toBeLessThan(0.05)
})

test('colorizeDensity writes transparent where intensity is ~0', () => {
  const w = 4
  const h = 4
  const intensity = new Float32Array(w * h)
  intensity[0] = 0
  intensity[1] = 1
  const rgba = new Uint8ClampedArray(w * h * 4)
  colorizeDensity(intensity, w, h, rgba, { maxAlpha: 180 })
  expect(rgba[3]).toBe(0)
  expect(rgba[7]).toBeGreaterThan(0)
})

test('paintDensityField returns ImageData of requested size', () => {
  const img = paintDensityField(16, 12, [{ x: 30, y: 40, r: 25, intensity: 0.8 }])
  expect(img.width).toBe(16)
  expect(img.height).toBe(12)
  expect(img.data.length).toBe(16 * 12 * 4)
})
```

- [ ] **Step 2: Run — expect FAIL**

```powershell
cd apps\web
npx vitest run src/lib/densityField.test.ts
```

- [ ] **Step 3: Implement `densityField.ts`**

Implement the three exports above. `paintDensityField` should create `ImageData` via `new ImageData(rgba, width, height)` (jsdom may need polyfill — if `ImageData` missing in vitest, construct `{ data, width, height }` and cast, or polyfill in test setup only; prefer real `ImageData` when available).

- [ ] **Step 4: Run — expect PASS; commit**

```powershell
cd apps\web
npx vitest run src/lib/densityField.test.ts
```

```bash
git add apps/web/src/lib/densityField.ts apps/web/src/lib/densityField.test.ts
git commit -m "feat: gaussian density field painter for floor heatmap"
```

---

### Task 3: Rework `FloorHeatmap` (canvas + hits)

**Files:**
- Modify: `apps/web/src/components/retail/FloorHeatmap.tsx`
- Create: `apps/web/src/components/retail/FloorHeatmap.test.tsx`
- Modify: `apps/web/src/retail.css` (floor-plan section)

**Interfaces:**
- Consumes: `ZonesData['zones']` (with `anchor`), `HeatmapData['zones']`, `floorPlanUrl: string`, `floorPlanLabel?: string`, `compact?`, `hero?`, `onZoneClick?`
- Produces: accessible buttons named by `zone.name`; canvas overlay; no solid heat fills

```ts
interface FloorHeatmapProps {
  zones: ZonesData['zones']
  heat?: HeatmapData['zones']
  floorPlanUrl: string
  floorPlanLabel?: string
  compact?: boolean
  hero?: boolean
  onZoneClick?: (zone: ZonesData['zones'][number]) => void
}
```

Render structure:

```tsx
<div className={planClass}>
  <img className="floor-plan__base" src={floorPlanUrl} alt={floorPlanLabel ?? '示範平面圖'} />
  <canvas className="floor-plan__heat" aria-hidden ref={canvasRef} />
  <div className="floor-plan__hits">
    {zones.map((zone) => (
      <button
        key={zone.zone_id}
        type="button"
        className="floor-hit"
        style={{
          left: `${zone.anchor.x}%`,
          top: `${zone.anchor.y}%`,
          width: `${zone.anchor.r * 2}%`,
          height: `${zone.anchor.r * 2}%`,
          transform: 'translate(-50%, -50%)',
        }}
        aria-label={zone.name}
        title={…}
        disabled={!onZoneClick}
        onClick={() => onZoneClick?.(zone)}
      />
    ))}
  </div>
</div>
```

Repaint on resize / heat change via `ResizeObserver` + `paintDensityField` → `ctx.putImageData`. Compact mode: pass `{ maxAlpha: 110 }` (hero ~180). Filter: compact may still show all five zones (including entrance) for consistency with density story — **do not** use solid `.floor-zone` backgrounds.

CSS: `.floor-plan__base` and `.floor-plan__heat` absolute inset 0; `object-fit: contain` on img; canvas sized to client box; `.floor-hit` circular, transparent background, focus-visible ring; remove reliance on filled `.floor-zone` for heat.

- [ ] **Step 1: Failing component tests**

```ts
// FloorHeatmap.test.tsx — wrap with minimal providers not required if pure props
test('renders floorplan image and clickable zone hits', () => {
  render(
    <FloorHeatmap
      floorPlanUrl="/assets/floor-plans/it-demo-fashion.png"
      floorPlanLabel="示範平面圖（樣本）"
      zones={fixtureZones}
      heat={fixtureHeat}
      hero
      onZoneClick={vi.fn()}
    />,
  )
  expect(screen.getByRole('img', { name: '示範平面圖（樣本）' })).toHaveAttribute(
    'src',
    '/assets/floor-plans/it-demo-fashion.png',
  )
  expect(screen.getByRole('button', { name: '試衣間' })).toBeInTheDocument()
  expect(document.querySelector('.floor-zone')).toBeNull()
})
```

Stub `HTMLCanvasElement.prototype.getContext` to return a mock with `putImageData`, `clearRect`, and set `canvas.width/height` as needed.

- [ ] **Step 2: Run — expect FAIL**

```powershell
cd apps\web
npx vitest run src/components/retail/FloorHeatmap.test.tsx
```

- [ ] **Step 3: Implement component + CSS**

Update call sites temporarily if TypeScript breaks (`floorPlanUrl` required) — prefer completing Task 4 in the same working tree only if build is blocked; otherwise add optional `floorPlanUrl?` with empty fallback **only during Task 3**, then require it in Task 4. Preferred: Task 3 lands component + tests; Task 4 immediately wires pages in the next commit (do not leave broken `tsc` on main task boundary — wire pages before committing Task 3 if needed).

**Commit rule for Task 3:** `npm test` green and `npm run build` green before commit. If pages still pass old props, update Journey/Overview in this task minimally to pass `floorPlanUrl={zones.floor_plan_url}` so the tree typechecks.

- [ ] **Step 4: Tests + build; commit**

```powershell
cd apps\web
npm test
npm run build
```

```bash
git add apps/web/src/components/retail/FloorHeatmap.tsx apps/web/src/components/retail/FloorHeatmap.test.tsx apps/web/src/retail.css apps/web/src/pages/retail/Journey.tsx apps/web/src/pages/retail/Overview.tsx
git commit -m "feat: canvas density FloorHeatmap over demo floorplan"
```

---

### Task 4: Journey honesty + Overview parity + page tests

**Files:**
- Modify: `apps/web/src/pages/retail/Journey.tsx`
- Modify: `apps/web/src/pages/retail/Overview.tsx`
- Modify: `apps/web/src/pages/retail/Journey.test.tsx`
- Modify: `apps/web/src/i18n/messages.ts`
- Modify: `docs/demo-script.md` (Beat 2 one-liner)

**Interfaces:**
- Consumes: `zones.floor_plan_url`, `zones.floor_plan_label`
- Produces: honesty string keys:
  - `journey.demoPlan`: `示範平面圖 · 樣本密度（非即時影像）`
  - `overview.demoPlan`: same shorter if needed

- [ ] **Step 1: Extend Journey test**

Assert floorplan `img` present in hero; keep existing click → `service-gap` behavior using `getByRole('button', { name: '試衣間' })`.

- [ ] **Step 2: Run — expect FAIL if honesty/img missing**

```powershell
cd apps\web
npx vitest run src/pages/retail/Journey.test.tsx
```

- [ ] **Step 3: Wire copy + props**

Journey source-hint strip: keep camera chip; add `t('journey.demoPlan')`.  
Pass `floorPlanUrl={zones.floor_plan_url}` and `floorPlanLabel={zones.floor_plan_label}`.  
Overview compact: same props; optional tiny honesty under title.  
demo-script Beat 2: note 示範平面圖 + soft density, click zone → Gap.

- [ ] **Step 4: Full verify + commit**

```powershell
cd apps\web
npm test
npm run build
```

```bash
git add apps/web/src/pages/retail/Journey.tsx apps/web/src/pages/retail/Overview.tsx apps/web/src/pages/retail/Journey.test.tsx apps/web/src/i18n/messages.ts docs/demo-script.md
git commit -m "feat: journey demo-plan honesty and overview density parity"
```

---

### Task 5: Visual QA checklist (manual) + acceptance commit note

**Files:**
- Modify only if QA finds anchor drift: `public/mock/retail/zones.json` and/or color ramp in `densityField.ts`

- [ ] **Step 1: Manual golden checks** with `npm run dev` → `http://127.0.0.1:5174/retail/journey?demo=1`

Checklist:

1. Floorplan readable under soft heat (not drowned)
2. Hot spots align: fitting top-right, entrance bottom, cashier top-center
3. Metric toggle (綜合 / 人次 / 停留) visibly changes field
4. Click 試衣間 → `/retail/service-gap?zone=fitting_room`
5. Overview compact shows same plan language
6. Honesty copy visible
7. Keyboard: Tab to hits, Enter activates
8. Reduced-motion: no pulsing

- [ ] **Step 2: If anchors off, nudge JSON only; re-test; commit**

```bash
git add public/mock/retail/zones.json apps/web/src/lib/densityField.ts
git commit -m "fix: tune demo floor heatmap anchors and density ramp"
```

If no changes needed, skip commit and mark task complete in the SDD report.

---

## Acceptance mapping (spec → tasks)

| Spec requirement | Task |
|------------------|------|
| Demo floorplan asset | 1 |
| Soft density blobs (not solid fills) | 2, 3 |
| Journey hero + Overview compact | 3, 4 |
| Five remapped spine zones | 1 |
| Click → Gap `?zone=` | 3, 4 |
| Metric toggle | existing Journey + 3 repaint |
| Production-shaped anchors / floor_plan_url | 1 |
| Honesty / 示範平面圖 | 4 |
| Tests + build | 1–4 |

## Self-review notes

- No TBD placeholders; ImageData/jsdom caveat called out with fallback.
- Task 3 explicitly must not leave a red `tsc` boundary.
- Decorative extra hotspots and live cameras remain out of scope.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-08-journey-floor-heatmap.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — this session with executing-plans checkpoints  

Which approach?
