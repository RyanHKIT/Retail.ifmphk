# Spine Task 5 Report: Craft — Overview + Footfall + Journey

**Status:** DONE  
**Date:** 2026-09-07  
**Branch:** `feature/ifmp-retail-demo`  
**BASE before work:** `7714bb7`  
**Commit:** (set after `feat: craft overview footfall journey`)

## What was done

| Path | Action |
|------|--------|
| `apps/web/src/pages/retail/Overview.tsx` | Situation strip (gap lead + 3 facts) → one dispatch CTA / SpineNav → evidence (curve, heatmap, alerts). Killed 5-KPI grid + kicker |
| `apps/web/src/pages/retail/Footfall.tsx` | Counter hero (進店 + rate) ; funnel/hourly/cameras as support |
| `apps/web/src/pages/retail/Journey.tsx` | Heatmap spatial hero; click hint + `role=button` zones; seg toggle |
| `apps/web/src/components/retail/FloorHeatmap.tsx` | `--hero` / `--clickable`; SVG entrance chevron (no `↓`) |
| `apps/web/src/retail.css` | Situation/counter/journey layouts; funnel `scaleX`; no `.overview-kicker`; card-title 18px |
| `apps/web/src/i18n/messages.ts` | realtime / online / click / mock purchase (zh-Hant, zh-Hans, en) |
| `apps/web/src/pages/retail/Journey.test.tsx` | Zone click → `/retail/service-gap`; SpineNav href intact |
| `apps/web/src/pages/retail/Overview.test.tsx` | Assert no KPI cookie grid / no kicker |

Shell / SpineNav connectivity unchanged: pending → Gap; else 下一步 Footfall; Footfall → Journey; Journey 下一步 + zone click → Gap.

## Detect

`impeccable.cmd detect --json` on Overview, Footfall, Journey, FloorHeatmap, `retail.css`: **[]**

`detect.mjs` is not present; used the Impeccable launcher (same as Task 4).

Funnel fill is `transform: scaleX(var(--funnel-scale))` from left, 220ms `--ease-out`, stagger 40ms, never `width`. Reduced-motion: opacity only.

## Verification

| Check | Result |
|-------|--------|
| `npm test` (`apps/web`) | Exit 0 — 20 files, **76/76** pass |
| `npm run build` (`apps/web`) | Exit 0 — chunk >500 kB warning (pre-existing) |
| Browser | No browser tools in this subagent; not visually walked |

## PAGE_CRAFT_NOTES (Task 6 — cheap model)

Inherit Task 4 chrome + Task 5 page grammar. **Do not restyle the shell.** Do not revert Overview/Footfall/Journey.

### Mirror these patterns

- **One primary teal `.btn-primary` per view.** Ghost/text links for secondary (Coach/Roster), never three equal buttons.
- **Situation strip, not cookie KPI grid.** Unequal cells: one `--font-kpi` 28px lead + 18px facts, 1px `--line` dividers, radius 12 / pad 16. Delete identical `.grid-kpi` cookie rows.
- **Evidence is secondary** — charts/tables below the hero. `chart-enter` 220ms / 8px / 40ms stagger. No `transition: width` — copy funnel `scaleX`.
- Kickers banned. No `.overview-kicker`. Section heads = 18px `.card-title` (already global).
- Icons: 16px stroke-1.5 SVG only. Kill remaining unicode (`▲▼` Gap expand, HourBar pills `border-radius: 999px`).

### Gap

Dispatch is the hero. Lead with pending count + one 調度 (not four equal KPI tiles + a table of identical 調度 buttons). List/matrix/VL are evidence. Keep SourceChip, rule chips, SpineNav, 去教練/去排班 as **one** primary after dispatch. Replace `▲▼` with SVG. Do not bury 調度 only in row chrome.

### Roster

Two acts already (需求 / 週更表 tabs) — keep that split; make each act have a lead metric + board/chart, not four cookies then a chart. **Replace** `box-shadow: inset 3px 0` station highlight with accent-soft row fill (1px max inset). HourBar: `width` → `scaleX` like funnel; track radius 6px not 999px pills. Keep teal chips.

### Coach

Weekly-review tone: prefilter must be **visible when `?zone=` / `?gap=`** (banner “已篩 {zone}”, not a quiet select). VL list is the evidence; don’t nest `.vl-box` as a card-in-card. One 標記已調度 per item is OK. Empty state when filter matches nothing.

### Energy

Honesty banner **first** (already). Controls look conditional: when `has_control` is false, disable/mute execute CTAs (`data-control=suggest` must be obvious). Drop five identical KPI cookies → situation strip (temp lead + kWh). Sensor grid is support, not another card wall. SourceChip stays.

### Still banned

Emoji/unicode icons · colored border >1px · nested cards · purple/`#e11d48`/IBM Plex/Inter/`#B45309` · `rounded-full` · gradient text · `scale(0)` / `ease-in` / `transition: all` · fake I.T. lockup.

Tokens already on `.app-shell`. Day default.
