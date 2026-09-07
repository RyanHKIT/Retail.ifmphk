# Spine Task 4 Report: Craft — surface brief + shell

**Status:** DONE  
**Date:** 2026-09-07  
**Branch:** `feature/ifmp-retail-demo`  
**BASE before work:** `97819ec` (newer than brief `8ec5090`)  
**Commit:** (see git) — `feat: craft retail shell for spine`

## What was done

| Path | Action |
|------|--------|
| `docs/surfaces/retail-spine.md` | Operate surface brief (evidence→action floor board) |
| `apps/web/src/components/retail/RetailShell.tsx` | SVG nav, grouped 現場/行動/設施, brand mark, filter cluster, mobile drawer |
| `apps/web/src/retail.css` | Denser chrome, press `scale(0.97)` 120ms, focus rings, `::selection`, scrollbars, Night/Day |
| `apps/web/src/i18n/messages.ts` | Strip emoji/unicode from alerts + home; nav group + filter labels |
| `apps/web/src/components/retail/RetailShell.test.tsx` | SVG nav, no zip emoji, group labels |

Zip residue removed: unicode nav (`◉⇄◎👤…`), `🔔` alerts, `🌙/☀️` theme, `←` home.

Measured in browser (`127.0.0.1:5174/retail`): sidebar **208px**, topbar **56px**, active nav `rgba(12,111,106,0.12)` + `#0c6f6a`, brand Sora 22px/600, primary btn 36px / 8px / transform **120ms**, 9 nav SVGs, no emoji. Night toggle + 390px drawer (開啟導航) checked.

`--duration-press` is **120ms** (task target; DESIGN.md lists 100ms; plan range 100–160ms).

## Detect

`impeccable.cmd detect --json` on `RetailShell.tsx` + `retail.css`:

1. First pass: `side-tab` (`.vl-box` 3px border-left), `layout-transition` (`.funnel-bar` width).
2. Fixed in one batch: vl-box → 1px all-around; dropped funnel `transition: width` (scaleX still Task 5).
3. Re-run: **[]**.

`detect.mjs` is not present; used the Impeccable launcher.

## Verification

| Check | Result |
|-------|--------|
| `npm test` (`apps/web`) | Exit 0 — 19 files, **74/74** pass |
| `npm run build` (`apps/web`) | Exit 0 — chunk >500 kB warning (pre-existing) |
| Browser desktop + Night + 390px | Shell tokens match DESIGN; drawer opens |

## CRAFT_HANDOFF (Task 5 / 6)

Use a cheaper model. Inherit this chrome; **do not restyle the shell**.

### Layout rules

- Content pad `20px 24px`. Panels: `--paper-elevated` + 1px `--line`, radius **12px**, pad **16px**.
- Controls **36px**, table rows **40px**, KPI gap **12px**. Radius: controls 8 / chips 6 / panels 12. No pills except 6px dots.
- Type: display 22px Sora; title 18px; body 14px; label 12px; KPI 28px tabular; micro 11px. More space **above** a heading than below.
- One primary action per view (teal `.btn-primary`). Evidence secondary.
- Overview: situation strip + **one** action + evidence — not five identical KPI cookies.
- Footfall: counter as hero; funnel/hourly support. Funnel fill must be **`transform: scaleX`** from left (width transition already removed).
- Journey: heatmap is the spatial hero; zone click obvious.
- Gap: dispatch is the hero; list secondary.
- Roster: demand vs board as two acts; keep teal chips.
- Coach: weekly-review tone; prefilter visible.
- Energy: honesty first; controls look conditional.

### Banned (fail the page)

- Emoji / unicode-as-icons (use 16px stroke-1.5 SVG like the shell).
- Kickers / eyebrows — delete `.overview-kicker`.
- Colored `border-left`/`border-right` **>1px** and inset 3px bars (roster highlight still has `box-shadow: inset 3px 0`).
- Nested cards; same-size icon+heading+text card grids.
- Purple charts, rose `#e11d48`, IBM Plex, Inter, `#B45309` amber world.
- `rounded-full` pills; gradient text; glass chrome; glow/pulse.
- `scale(0)`, `ease-in` entrances, `transition: all`.
- Fake I.T. trademark lockup.

### Tokens (already on `.app-shell`)

`--accent #0c6f6a` · `--ink #14202b` · `--paper #f7f9fb` · `--ease-out cubic-bezier(0.23,1,0.32,1)` · press 120ms scale(0.97) on **buttons only** · chart-enter 220ms 8px up · reduced-motion: opacity only.

Day default. SourceChip stays on Footfall / Journey / Gap / Energy.

## Follow-ups

- Task 5: Overview + Footfall + Journey craft (funnel `scaleX` + kill kicker).
- Task 6: Gap + Roster + Coach + Energy (replace roster inset bar).
