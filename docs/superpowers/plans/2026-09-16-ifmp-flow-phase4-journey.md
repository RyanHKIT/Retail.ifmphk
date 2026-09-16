# IFMP Retail (Flow) — Phase 4 Implementation Plan: 動線熱力

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. **Sequential commits only** (Phase 2: parallel commits raced the git index). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ship `/flow/journey` hero heatmap + Overview compact card from Supabase `zones` / `heatmap_daily` + a demo floorplan, without restyling `flow.css`.

**Architecture:** Seed intensity from existing `footfall_daily.in_count`. `fetchJourney` is SELECT-only. `densityField.ts` paints Gaussians. New `FlowFloorHeatmap` (do not import `pages/retail` or `components/retail/FloorHeatmap`). Journey page owns metric toggle + `?zone=` focus.

**Tech Stack:** Vite 8, React 19, react-router-dom 7, Vitest, Canvas 2D, Supabase (existing RLS).

**Spec:** `docs/superpowers/specs/2026-09-16-ifmp-flow-phase4-journey-design.md`

## Global Constraints

- Product UI name: **IFMP Retail**; site: **I.T. Causeway Bay** / **I.T. 銅鑼灣** — never 优衣库/Uniqlo in chrome
- Locale: zh-HK + en via `flowMessages.ts`
- Do **not** modify `/retail/*` pages, `retail.css`, or mock JSON as SoT
- Do **not** restyle `FlowShell` / `flow.css` tokens (UX-authority restyle is after this phase)
- No DongQia passwords or `service_role` in git / client
- Zone click stays on `/flow/journey?zone=` — never `/retail/service-gap`
- Five `zone_key`s only: `entrance`, `shelf_a`, `shelf_b`, `fitting_room`, `cashier`
- Honesty: demo plan + sample density, not live CV

---

## Execution strategy (models)

**2026-09-16 substitute (still in force):** glm provider crashed during Phase 3. Use Cursor **Grok 4.6** where the infra plan said `glm-5.3`, Cursor **Auto** where it said `glm-5.3-flash`.

| Task | Model | Why |
|------|--------|-----|
| T1 floorplan + SQL seed + anchors | **Grok 4.6** | Wrong shares/anchors waste every pixel |
| T2 `fetchJourney` + tests | **Grok 4.6** | Column contract vs `20260915000002` |
| T3 `FlowFloorHeatmap` | **Grok 4.6** | Hit targets + canvas composite is the UX kernel |
| T4 Journey page | **Auto** | Contract stable; page wiring |
| T5 Overview compact card | **Auto** | Same component, one more fetch |
| T6 tsc + browser smoke | **Grok 4.6** | Coverage audit |

**Pre-flight (human):** before Task 1 set agent model to **Grok 4.6**. Switch to **Auto** at T4. Switch back to **Grok 4.6** at T6. Subagents: `inherit` after the switch. Sequential git commits. Do not start T1 until this plan is approved.

**Remind once at phase start:** Grok 4.6 + this table. Do not wait on estate-ai-ops Task 6.

---

## File map

| File | Purpose |
|------|---------|
| `public/assets/floor-plans/it-cwb-demo.png` | Demo top-down fashion floorplan |
| `supabase/migrations/20260916000008_flow_heatmap_seed.sql` | floor_plan_url, remapped anchors, heatmap_daily from footfall_daily |
| `apps/web/src/lib/footfall/api.ts` | `fetchJourney` + types |
| `apps/web/src/lib/footfall/api.test.ts` | Select-string + mapping assertions |
| `apps/web/src/lib/densityField.ts` | **Unchanged** reuse |
| `apps/web/src/components/flow/FlowFloorHeatmap.tsx` | img + canvas + hit buttons |
| `apps/web/src/components/flow/FlowFloorHeatmap.test.tsx` | img, buttons, click |
| `apps/web/src/lib/journeyMetrics.ts` | Pure metric renormalize |
| `apps/web/src/lib/journeyMetrics.test.ts` | visits / dwell / composite |
| `apps/web/src/pages/flow/Journey.tsx` | Hero page |
| `apps/web/src/pages/flow/Journey.test.tsx` | load, toggle, `?zone=` |
| `apps/web/src/pages/flow/Overview.tsx` | Compact widget |
| `apps/web/src/pages/flow/Overview.test.tsx` | 9th card |
| `apps/web/src/App.tsx` | `/flow/journey` route |
| `apps/web/src/i18n/flowMessages.ts` | `journey.*` |
| `apps/web/src/styles/flow.css` | `.flow-heat-*` under `.flow-app` |
| `docs/flow-pilot-phase4.md` | Smoke checklist |

---

### Task 1: Floorplan asset + heatmap seed (Grok 4.6)

**Files:**
- Create: `public/assets/floor-plans/it-cwb-demo.png`
- Create: `supabase/migrations/20260916000008_flow_heatmap_seed.sql`
- Create: `docs/flow-pilot-phase4.md` (seed + smoke stubs; fill smoke in T6)

**Interfaces:**
- Consumes: `public.footfall_daily`, `public.zones`, branch `a0000000-0000-4000-8000-000000000001`
- Produces: `heatmap_daily` rows; `branches.floor_plan_url = '/assets/floor-plans/it-cwb-demo.png'`

- [ ] **Step 1: Generate the floorplan**

Use Cursor `GenerateImage` (or equivalent) with this prompt. Aspect **4:3**. Save as `public/assets/floor-plans/it-cwb-demo.png` (copy from the tool output path if needed).

Prompt:

> Top-down architectural floor plan of a small fashion boutique, clean CAD-like line drawing on off-white paper, black hairline walls. Glass entrance at the bottom center labeled 入口. Left sales floor labeled 貨架 A. Center-right racks labeled 貨架 B. Right-side fitting rooms labeled 試衣間. Cash desk near bottom-right labeled 收銀台. No people, no logos, no Uniqlo, no I.T. trademark lockup, no 3D perspective, no neon. Print-ready plan, even lighting.

If image gen is unavailable: draw a simple SVG, rasterize to PNG at 1600×1200, same labels, same positions.

- [ ] **Step 2: Write the failing seed check**

After apply, this SQL must return 5 zones and heatmap rows = 5 × (select count from footfall_daily for that branch). Write the migration first; verify with Supabase MCP `execute_sql` in Step 4.

- [ ] **Step 3: Migration**

```sql
-- 20260916000008_flow_heatmap_seed.sql
-- Intensity from footfall_daily.in_count. Deterministic. No RNG.

UPDATE public.branches
SET
  floor_plan_url = '/assets/floor-plans/it-cwb-demo.png',
  floor_plan_label_zh = '示範平面圖',
  floor_plan_label_en = 'Demo floor plan'
WHERE id = 'a0000000-0000-4000-8000-000000000001';

-- Remap anchors onto the generated plan (percent of width/height).
-- Adjust numbers once after viewing the PNG if kernels miss labels.
UPDATE public.zones SET anchor_x = 50, anchor_y = 88, anchor_r = 12
  WHERE branch_id = 'a0000000-0000-4000-8000-000000000001' AND zone_key = 'entrance';
UPDATE public.zones SET anchor_x = 22, anchor_y = 48, anchor_r = 16
  WHERE branch_id = 'a0000000-0000-4000-8000-000000000001' AND zone_key = 'shelf_a';
UPDATE public.zones SET anchor_x = 52, anchor_y = 42, anchor_r = 14
  WHERE branch_id = 'a0000000-0000-4000-8000-000000000001' AND zone_key = 'shelf_b';
UPDATE public.zones SET anchor_x = 82, anchor_y = 50, anchor_r = 11
  WHERE branch_id = 'a0000000-0000-4000-8000-000000000001' AND zone_key = 'fitting_room';
UPDATE public.zones SET anchor_x = 72, anchor_y = 82, anchor_r = 10
  WHERE branch_id = 'a0000000-0000-4000-8000-000000000001' AND zone_key = 'cashier';

INSERT INTO public.heatmap_daily (zone_id, day, visit_count, avg_dwell_sec, intensity)
SELECT
  z.id,
  f.day,
  ROUND(f.in_count * s.share)::int,
  s.dwell,
  CASE
    WHEN MAX(ROUND(f.in_count * s.share)::int) OVER (PARTITION BY f.day) = 0 THEN 0
    ELSE ROUND(f.in_count * s.share)::numeric
         / MAX(ROUND(f.in_count * s.share)::int) OVER (PARTITION BY f.day)
  END
FROM public.footfall_daily f
JOIN public.zones z
  ON z.branch_id = f.branch_id
JOIN (VALUES
  ('entrance',     1.00, 20),
  ('shelf_a',      0.55, 95),
  ('shelf_b',      0.42, 80),
  ('fitting_room', 0.22, 210),
  ('cashier',      0.18, 40)
) AS s(zone_key, share, dwell)
  ON s.zone_key = z.zone_key
WHERE f.branch_id = 'a0000000-0000-4000-8000-000000000001'
ON CONFLICT (zone_id, day) DO UPDATE SET
  visit_count = EXCLUDED.visit_count,
  avg_dwell_sec = EXCLUDED.avg_dwell_sec,
  intensity = EXCLUDED.intensity;
```

If Postgres rejects `MAX() OVER` mixed with `JOIN` in your version, split: compute visit_count in a CTE, then intensity = visit_count / day_max in a second INSERT SELECT.

- [ ] **Step 4: Apply + verify**

`npx supabase db push` (or project-linked equivalent). MCP `execute_sql`:

```sql
SELECT z.zone_key, COUNT(*)
FROM heatmap_daily h JOIN zones z ON z.id = h.zone_id
GROUP BY 1 ORDER BY 1;
SELECT floor_plan_url FROM branches WHERE id = 'a0000000-0000-4000-8000-000000000001';
```

Expected: five keys, equal counts, URL set. Entrance intensity = 1 on a non-zero day.

- [ ] **Step 5: Commit**

```bash
git add public/assets/floor-plans/it-cwb-demo.png supabase/migrations/20260916000008_flow_heatmap_seed.sql docs/flow-pilot-phase4.md
git commit -m "feat(flow): seed journey heatmap intensity from daily footfall"
```

---

### Task 2: `fetchJourney` (Grok 4.6)

**Files:**
- Modify: `apps/web/src/lib/footfall/api.ts`
- Modify: `apps/web/src/lib/footfall/api.test.ts`

**Interfaces:**
- Consumes: `createFlowSupabase`, `hkToday`, `mapRpcError`
- Produces: `fetchJourney(branchId: string, day?: string): Promise<JourneyPayload>`

- [ ] **Step 1: Write the failing test** (add to `api.test.ts`)

```ts
it('fetchJourney selects branch floorplan, zones anchors, heatmap_daily for the HK day', async () => {
  // mock three from() tables; assert select strings:
  // branches: 'floor_plan_url,floor_plan_label_zh,floor_plan_label_en'
  // zones: 'id,zone_key,name_zh,name_en,zone_type,anchor_x,anchor_y,anchor_r'
  // heatmap_daily: 'zone_id,visit_count,avg_dwell_sec,intensity'
  const payload = await fetchJourney('b1', '2026-09-16')
  expect(payload.floorPlanUrl).toBe('/assets/floor-plans/it-cwb-demo.png')
  expect(payload.zones).toHaveLength(5)
  expect(payload.heat[0].zoneKey).toBe('entrance')
})
```

Follow the existing `makeQB` mock style in this file. Empty heat → `heat: []`, not throw.

- [ ] **Step 2: Run test — expect FAIL** (`fetchJourney` is not exported)

```
cd apps/web && npx vitest run src/lib/footfall/api.test.ts
```

- [ ] **Step 3: Implement** (append to `api.ts`)

```ts
export type ZoneKey = 'entrance' | 'shelf_a' | 'shelf_b' | 'fitting_room' | 'cashier'

export type ZoneRow = {
  id: string
  zoneKey: ZoneKey
  nameZh: string
  nameEn: string
  zoneType: string
  anchorX: number
  anchorY: number
  anchorR: number
}

export type HeatmapDayRow = {
  zoneId: string
  zoneKey: ZoneKey
  visitCount: number
  avgDwellSec: number
  intensity: number
}

export type JourneyPayload = {
  floorPlanUrl: string
  floorPlanLabelZh: string
  floorPlanLabelEn: string
  zones: ZoneRow[]
  heat: HeatmapDayRow[]
  day: string
}

export async function fetchJourney(
  branchId: string,
  day: string = hkToday(),
): Promise<JourneyPayload> {
  const client = sb()
  const { data: branch, error: bErr } = await client
    .from('branches')
    .select('floor_plan_url,floor_plan_label_zh,floor_plan_label_en')
    .eq('id', branchId)
    .maybeSingle()
  if (bErr) throw mapRpcError(bErr)

  const { data: zones, error: zErr } = await client
    .from('zones')
    .select('id,zone_key,name_zh,name_en,zone_type,anchor_x,anchor_y,anchor_r')
    .eq('branch_id', branchId)
  if (zErr) throw mapRpcError(zErr)

  const zoneRows: ZoneRow[] = (zones ?? []).map((z: {
    id: string
    zone_key: ZoneKey
    name_zh: string
    name_en: string
    zone_type: string
    anchor_x: number
    anchor_y: number
    anchor_r: number
  }) => ({
    id: z.id,
    zoneKey: z.zone_key,
    nameZh: z.name_zh,
    nameEn: z.name_en,
    zoneType: z.zone_type,
    anchorX: Number(z.anchor_x),
    anchorY: Number(z.anchor_y),
    anchorR: Number(z.anchor_r),
  }))

  const ids = zoneRows.map((z) => z.id)
  let heat: HeatmapDayRow[] = []
  if (ids.length > 0) {
    const { data: rows, error: hErr } = await client
      .from('heatmap_daily')
      .select('zone_id,visit_count,avg_dwell_sec,intensity')
      .eq('day', day)
      .in('zone_id', ids)
    if (hErr) throw mapRpcError(hErr)
    const byId = new Map(zoneRows.map((z) => [z.id, z.zoneKey]))
    heat = (rows ?? []).map((r: {
      zone_id: string
      visit_count: number
      avg_dwell_sec: number
      intensity: number
    }) => ({
      zoneId: r.zone_id,
      zoneKey: byId.get(r.zone_id) as ZoneKey,
      visitCount: r.visit_count,
      avgDwellSec: Number(r.avg_dwell_sec),
      intensity: Number(r.intensity),
    }))
  }

  return {
    floorPlanUrl: branch?.floor_plan_url ?? '',
    floorPlanLabelZh: branch?.floor_plan_label_zh ?? '',
    floorPlanLabelEn: branch?.floor_plan_label_en ?? '',
    zones: zoneRows,
    heat,
    day,
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```
cd apps/web && npx vitest run src/lib/footfall/api.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/footfall/api.ts apps/web/src/lib/footfall/api.test.ts
git commit -m "feat(flow): SELECT-only fetchJourney for zones and heatmap_daily"
```

---

### Task 3: Metrics + `FlowFloorHeatmap` (Grok 4.6)

**Files:**
- Create: `apps/web/src/lib/journeyMetrics.ts`
- Create: `apps/web/src/lib/journeyMetrics.test.ts`
- Create: `apps/web/src/components/flow/FlowFloorHeatmap.tsx`
- Create: `apps/web/src/components/flow/FlowFloorHeatmap.test.tsx`
- Modify: `apps/web/src/styles/flow.css` (append `.flow-heat-*`)

**Interfaces:**
- Consumes: `paintDensityField`, `DensityPoint`, `ZoneRow`, `HeatmapDayRow`
- Produces: `renormalizeHeat(heat, metric)`, `FlowFloorHeatmap` props below

```ts
export type HeatMetric = 'composite' | 'visits' | 'dwell'

export function renormalizeHeat(
  heat: HeatmapDayRow[],
  metric: HeatMetric,
): Map<string, number> // zoneId → 0..1
```

- [ ] **Step 1: Failing metrics test**

```ts
import { renormalizeHeat } from './journeyMetrics'
import type { HeatmapDayRow } from './footfall/api'

const heat: HeatmapDayRow[] = [
  { zoneId: 'e', zoneKey: 'entrance', visitCount: 100, avgDwellSec: 20, intensity: 1 },
  { zoneId: 'f', zoneKey: 'fitting_room', visitCount: 50, avgDwellSec: 200, intensity: 0.5 },
]

test('visits peaks at max visitCount', () => {
  const m = renormalizeHeat(heat, 'visits')
  expect(m.get('e')).toBe(1)
  expect(m.get('f')).toBe(0.5)
})

test('dwell peaks at max avgDwellSec', () => {
  const m = renormalizeHeat(heat, 'dwell')
  expect(m.get('f')).toBe(1)
  expect(m.get('e')).toBe(0.1)
})
```

- [ ] **Step 2: Run — FAIL** then implement:

```ts
export type HeatMetric = 'composite' | 'visits' | 'dwell'

export function renormalizeHeat(
  heat: { zoneId: string; visitCount: number; avgDwellSec: number }[],
  metric: HeatMetric,
): Map<string, number> {
  const maxV = Math.max(0, ...heat.map((h) => h.visitCount))
  const maxD = Math.max(0, ...heat.map((h) => h.avgDwellSec))
  const visits = (n: number) => (maxV === 0 ? 0 : n / maxV)
  const dwell = (n: number) => (maxD === 0 ? 0 : n / maxD)
  const raw = heat.map((h) => {
    const v = visits(h.visitCount)
    const d = dwell(h.avgDwellSec)
    const i = metric === 'visits' ? v : metric === 'dwell' ? d : 0.6 * v + 0.4 * d
    return { zoneId: h.zoneId, i }
  })
  const peak = Math.max(0, ...raw.map((r) => r.i))
  return new Map(raw.map((r) => [r.zoneId, peak === 0 ? 0 : r.i / peak]))
}
```

- [ ] **Step 3: Heatmap component tests**

```ts
test('renders floorplan img and a button per zone', () => { /* ... */ })
test('clicking a zone calls onZoneClick with zoneKey', async () => { /* userEvent.click */ })
```

Stub `paintDensityField` if jsdom canvas is thin; still assert `data-testid="flow-heat-canvas"` exists.

- [ ] **Step 4: Implement `FlowFloorHeatmap`**

Props: `{ payload: JourneyPayload; metric: HeatMetric; compact?: boolean; focusedKey: ZoneKey | null; onZoneClick: (key: ZoneKey) => void }`.

Structure:

```tsx
<div className={compact ? 'flow-heat flow-heat--compact' : 'flow-heat flow-heat--hero'} data-testid="flow-heat">
  <img src={payload.floorPlanUrl} alt={label} className="flow-heat-plan" />
  <canvas ref={canvasRef} className="flow-heat-canvas" data-testid="flow-heat-canvas" />
  {payload.zones.map((z) => (
    <button
      key={z.zoneKey}
      type="button"
      className="flow-heat-hit"
      data-testid={`flow-heat-zone-${z.zoneKey}`}
      aria-label={locale === 'en' ? z.nameEn : z.nameZh}
      aria-pressed={focusedKey === z.zoneKey}
      style={{ left: `${z.anchorX}%`, top: `${z.anchorY}%`, width: `${z.anchorR * 2}%`, height: `${z.anchorR * 2}%` }}
      onClick={() => onZoneClick(z.zoneKey)}
    />
  ))}
</div>
```

`useLayoutEffect`: measure wrap, `paintDensityField(w, h, points)` → `putImageData`. Points: `{ x: anchorX, y: anchorY, r: anchorR, intensity: map.get(id) ?? 0 }`. Compact `maxAlpha` lower (e.g. 120 vs 180).

CSS (append to `flow.css` inside `.flow-app` context — prefix `.flow-heat` is enough):

```css
.flow-heat { position: relative; overflow: hidden; border-radius: 8px; background: var(--flow-panel-2); }
.flow-heat--hero { min-height: 420px; }
.flow-heat--compact { min-height: 200px; }
.flow-heat-plan { width: 100%; height: 100%; object-fit: contain; display: block; filter: saturate(0.35) brightness(1.05); }
.flow-heat-canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; mix-blend-mode: multiply; }
.flow-heat-hit {
  position: absolute; transform: translate(-50%, -50%);
  border: 0; background: transparent; cursor: pointer; border-radius: 50%;
}
.flow-heat-hit[aria-pressed='true'] { outline: 2px solid var(--flow-accent); }
```

Do not copy `retail.css` `.floor-plan` blocks.

- [ ] **Step 5: Run**

```
cd apps/web && npx vitest run src/lib/journeyMetrics.test.ts src/components/flow/FlowFloorHeatmap.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/journeyMetrics.ts apps/web/src/lib/journeyMetrics.test.ts apps/web/src/components/flow/FlowFloorHeatmap.tsx apps/web/src/components/flow/FlowFloorHeatmap.test.tsx apps/web/src/styles/flow.css
git commit -m "feat(flow): Gaussian floor heatmap component and metric renormalize"
```

---

### Task 4: Journey page (Auto)

**Files:**
- Create: `apps/web/src/pages/flow/Journey.tsx`
- Create: `apps/web/src/pages/flow/Journey.test.tsx`
- Modify: `apps/web/src/App.tsx` — add explicit `<Route path="journey" element={<JourneyPage />} />` **before** `path="*"`
- Modify: `apps/web/src/i18n/flowMessages.ts`

**Interfaces:**
- Consumes: `fetchJourney`, `fetchManagedBranchId`, `FlowFloorHeatmap`, `useSearchParams`
- Produces: `/flow/journey`

i18n keys (both locales):

```
journey.title, journey.subtitle, journey.heatmap, journey.demoPlan,
journey.visits, journey.dwell, journey.composite, journey.low, journey.high,
journey.click, journey.empty, journey.sec, journey.focusVisits, journey.focusDwell
```

- [ ] **Step 1: Failing page test** (mirror `Entrances.test.tsx` deferred-fetch pattern)

```ts
it('shows skeleton then heatmap and honesty line', async () => { /* resolve fetchJourney */ })
it('metric toggle is a group with three buttons', async () => { /* ... */ })
it('zone click writes ?zone=entrance', async () => { /* MemoryRouter /flow/journey */ })
it('does not link to /retail/service-gap', async () => {
  expect(document.querySelector('a[href*="/retail/service-gap"]')).toBeNull()
})
```

- [ ] **Step 2: Run — FAIL** (page missing)

- [ ] **Step 3: Implement `Journey.tsx`**

Same auth/branch gate as Overview (`branchResolved`). `WidgetCard`-like panel or a `section.flow-heat-page`.

- Load `fetchJourney(branchId)`
- `const [metric, setMetric] = useState<HeatMetric>('composite')`
- `const [params, setParams] = useSearchParams()`; `focusedKey` from `params.get('zone')` if it is a `ZoneKey`
- Focus aside: name + visits + dwell when focused
- Footnote: `t('overview.honesty')` plus `t('journey.demoPlan')`

- [ ] **Step 4: Tests PASS**

```
cd apps/web && npx vitest run src/pages/flow/Journey.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/flow/Journey.tsx apps/web/src/pages/flow/Journey.test.tsx apps/web/src/App.tsx apps/web/src/i18n/flowMessages.ts
git commit -m "feat(flow): journey heatmap page with zone focus and metric toggle"
```

---

### Task 5: Overview compact card (Auto)

**Files:**
- Modify: `apps/web/src/pages/flow/Overview.tsx`
- Modify: `apps/web/src/pages/flow/Overview.test.tsx`
- Modify: `apps/web/src/i18n/flowMessages.ts` — `overview.widget.heatmap`

**Interfaces:**
- Consumes: `fetchJourney`, `FlowFloorHeatmap`
- Produces: 9th widget `data-testid="overview-widget-heatmap"` `wide`

- [ ] **Step 1: Extend Overview test**

Existing test expects 8 widgets. Update: 9 cards; heatmap card present after resolve. Clicking compact heat navigates — wrap Overview in `MemoryRouter` if not already; or assert `onClick` via `data-testid` link `href="/flow/journey"`.

Simplest: card title is a `Link` to `/flow/journey`. Zone click uses `useNavigate()(\`/flow/journey?zone=${key}\`)`.

- [ ] **Step 2: Run — FAIL** (still 8 widgets)

- [ ] **Step 3: Add card** after compare (or after unique, spec: compact under the grid, `wide`). Metric locked to `'composite'` on Overview (no toggle).

- [ ] **Step 4: Tests PASS** including honesty footnote still there.

```
cd apps/web && npx vitest run src/pages/flow/Overview.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/flow/Overview.tsx apps/web/src/pages/flow/Overview.test.tsx apps/web/src/i18n/flowMessages.ts
git commit -m "feat(flow): compact journey heatmap on overview"
```

---

### Task 6: Closeout (Grok 4.6)

**Files:**
- Modify: `docs/flow-pilot-phase4.md`
- Modify: `docs/superpowers/handoffs/2026-09-16-flow-phase3-handoff.md` (next = restyle after Task 6, not “Open Design first”)

- [ ] **Step 1:** `cd apps/web && npx tsc --noEmit` — expect 0 errors
- [ ] **Step 2:** `npx vitest run` — all green
- [ ] **Step 3:** Browser smoke (start `npm run dev` in `apps/web` if needed)

Checklist for `docs/flow-pilot-phase4.md`:

- [ ] Login → `/flow` compact heatmap shows floorplan (not empty stub)
- [ ] `/flow/journey` hero + 綜合/人次/停留 toggles
- [ ] Click 試衣間 → URL `?zone=fitting_room` + focus numbers
- [ ] No `/retail/service-gap` navigation
- [ ] `/retail/journey` still the old pitch (untouched)
- [ ] Honesty line visible
- [ ] `/api/health` 3000 refuse is ignorable

- [ ] **Step 4: Commit**

```bash
git add docs/flow-pilot-phase4.md docs/superpowers/handoffs/2026-09-16-flow-phase3-handoff.md
git commit -m "docs(flow): phase 4 journey heatmap smoke checklist"
```

---

## Spec coverage

| Spec § | Task |
|--------|------|
| Floorplan asset + URL | T1 |
| Intensity shares / dwell table | T1 |
| `fetchJourney` contract | T2 |
| Gaussian renderer + compact/hero | T3 |
| Metric toggle math | T3 |
| `?zone=` focus, no retail Gap | T4 |
| Overview compact | T5 |
| Honesty, tsc, smoke | T4 i18n + T6 |
| No `flow.css` restyle | all (constraint) |

## Out of this plan

Verkada / Signal Blue chrome, Open Design comps, DongQia 驻留 page, roster join, `/retail` deletion.

---

## After T6

Stop. Next program is UX-authority restyle **after** estate-ai-ops Verkada Task 6 + G1 comps — not a Phase 4 follow-on in the same sitting unless the user says so.
