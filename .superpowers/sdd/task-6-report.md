# Task 6 Report — Chart / card enter motion

**Status:** Complete  
**Branch:** `feature/ifmp-retail-demo`  
**BASE before work:** `562482e46cea4c58f007dc43ac5e44cdc6e7e731`  
**Commit:** (see git log after commit) — `feat: chart and KPI enter motion`  
**Date:** 2026-09-04  

---

## Animate skill

| Gate | Result |
|------|--------|
| Frequency | Occasional (page load) — not 100+/day chrome |
| Purpose | Preventing a jarring change — charts/KPIs would otherwise pop in |
| Tool | CSS `@keyframes` (predetermined mount motion) |
| Properties | `opacity` + `translateY(8px)` only; never `scale(0)` |
| Curve / duration | `var(--ease-out)` = `cubic-bezier(0.23, 1, 0.32, 1)`, **220ms** |
| KPI stagger | **40ms** via `--duration-enter-stagger` nth-child delays |
| Reduced motion | `fade-only` 180ms (opacity only; transform none) |
| Recharts | Internal line/bar/pie animation left on (`isAnimationActive` not disabled) |

---

## Deliverables

| Path | Action |
|------|--------|
| `apps/web/src/components/retail/ChartPanel.tsx` | Card wrapper with `.chart-enter`; optional `staggerIndex` |
| `apps/web/src/components/retail/ChartPanel.test.tsx` | Asserts `.chart-enter` + stagger token delay |
| `apps/web/src/components/retail/KpiCard.tsx` | Adds `.chart-enter` |
| `apps/web/src/components/retail/KpiCard.test.tsx` | Asserts enter class |
| `apps/web/src/retail.css` | KPI nth-child 40ms stagger; reduced-motion → `fade-only` |
| `apps/web/src/lib/chartStyle.ts` | `CHART[1..4]` → `var(--chart-*)` |
| Overview + Footfall (+ Energy/Journey/People/Roster/ServiceGap) | Recharts wrapped in `ChartPanel`; rose/purple fills replaced |
| `FloorHeatmap.tsx` | Teal→earth intensity ramp (Task 3 color leftover) |

---

## TDD evidence

### RED

```
FAIL  ChartPanel.test.tsx — Failed to resolve import "./ChartPanel"
FAIL  KpiCard.test.tsx — expected class "chart-enter", received "kpi-card"
Test Files  2 failed | 4 passed (6)
```

Failure reason: ChartPanel missing; KpiCard had no enter class — not typos.

### GREEN

```
Test Files  6 passed (6)
     Tests  13 passed (13)
```

---

## Verification

| Check | Result |
|-------|--------|
| `npm test` (`apps/web`) | Exit 0 — 13/13 pass |
| `npm run build` | Exit 0 — chunk >500 kB warning only, pre-existing |
| Overview (Vite 5180) | 5 KPI `.chart-enter` + 2 ChartPanels; KPI-2 delay `0.04s`; line stroke `var(--chart-4)` |
| Footfall | 3 ChartPanels; animation `chart-enter` **0.22s**; bar fill `var(--chart-1)` |
| `prefers-reduced-motion: reduce` | `fade-only` 180ms; `transform: none`; KPI delays 0 / 40 / 80 / 120 / 160ms retained |

---

## Concerns

- Funnel bars still transition `width` (pre-existing; not transform/opacity). Out of this task’s Recharts enter scope.
- Heatmap/alert cards on Overview are not ChartPanel-wrapped (not Recharts).
- Reduced-motion still staggers opacity (40ms). If that feels busy, drop delays under the media query.
- Browser feel-check used CDP computed styles + reload, not a slowed animation inspector playback.

## Follow-ups

Task 7 (if planned): remaining chrome press / dispatch motion.
