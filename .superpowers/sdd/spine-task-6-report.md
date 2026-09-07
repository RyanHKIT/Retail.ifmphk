# Spine Task 6 Report: Craft — Gap + Roster + Coach + Energy

**Status:** DONE  
**Date:** 2026-09-07  
**Branch:** `feature/ifmp-retail-demo`  
**BASE before work:** `1c996cb`  
**Commit:** `feat: craft action pages gap roster coach energy`

## What was done

| Path | Action |
|------|--------|
| `apps/web/src/pages/retail/ServiceGap.tsx` | Dispatch hero (pending count + 調度下一則) → situation strip → evidence (chart/VL/matrix/list). SVG expand chevron; table dispatch ghost secondary |
| `apps/web/src/pages/retail/Roster.tsx` | Demand/board acts each lead with situation strip; board reads `loadBoard()` target/week |
| `apps/web/src/components/retail/HourBar.tsx` | `width` → `scaleX(--hour-bar-scale)`; track radius 6px |
| `apps/web/src/pages/retail/Coach.tsx` | Prefilter banner on `?zone=` / `?gap=`; flat `coach-vl` (no nested vl-box card) |
| `apps/web/src/pages/retail/Energy.tsx` | Honesty banner first; temp+kWh situation strip; sensors as support grid; `energy-rules--suggest` when no control |
| `apps/web/src/retail.css` | dispatch-hero, prefilter-banner, gap/energy evidence, HourBar scaleX, roster highlight accent fill (no inset 3px), suggest-mode banner/rules |
| `apps/web/src/i18n/messages.ts` | gap/coach/roster/energy craft keys (zh-Hant, zh-Hans, en) |
| `*.test.tsx` | Craft assertions on Gap/Roster/Coach/Energy |

SpineNav + deep links unchanged (Gap handoff → Coach/Roster; Coach `?zone=`/`?gap=`; Roster station highlight).

## Detect

`detect.mjs` / Impeccable launcher not available in this subagent session — not run.

Manual ban check: no `▲▼`, no `grid-kpi` cookies on these four pages, no inset 3px roster bar, HourBar not pill-shaped.

## Verification

| Check | Result |
|-------|--------|
| `npm test` (`apps/web`) | Exit 0 — 20 files, **77/77** pass |
| `npm run build` (`apps/web`) | Exit 0 — chunk >500 kB warning (pre-existing) |
| Browser | Not walked in this subagent |

## Follow-ups

- Task 7 (if any): remaining spine pages (People, Settings) or final branch review.
