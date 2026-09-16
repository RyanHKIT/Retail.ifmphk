# IFMP Retail — pilot-v1 Operate chrome (design spec)

> **Date:** 2026-09-16
> **Status:** Draft for owner review (visual SoT for Phase 5 Workstream C / plan T4)
> **Phase:** **Yes — this phase.** It is the delete-able `shell/pilot-v1` look, not the later Open Design restyle.
> **Parent:** `docs/superpowers/specs/2026-09-16-ifmp-flow-phase5-pilot-close-design.md` §6
> **Authority world:** `docs/superpowers/specs/2026-09-16-ifmp-flow-ux-authority-design.md` §5
> **Source reviewed:** `C:\Users\rchan\Downloads\command_center_ui_ux_specification.md` (generic Verkada-like command center). **Not copied.** Density grammar kept. Camera product chrome rejected.
> **Plan:** `docs/superpowers/plans/2026-09-16-ifmp-flow-phase5-pilot-close.md` Task 4
> **Deleted with:** `apps/web/src/shell/pilot-v1/` (this file stays as the contract for the next shell)

## 1. Does this belong in Phase 5?

**Yes, as chrome density for `pilot-v1`.** Phase 5 already ships a full UI shell that must be replaceable. Implementers need type, space, z-index, and layout numbers — not only hex.

**No, as a Verkada Command clone.** The Downloads file is a **camera / IoT monitoring** product: dark-primary Inter, 64px icon rail, omnibox, 16:9 video tiles, PTZ, FOV cones, right inspector, bottom timeline scrubber, `globalTimestamp`. UX-authority and Phase 5 §6.5 already ban those.

| Downloads section | Phase 5 | Later shell (Open Design / estate-ai-ops harvest) |
|-------------------|---------|-----------------------------------------------------|
| Type scale, 4px grid, ~32px controls, 4px/8px radii | **In** | Keep unless comps change it |
| Light paper + Signal Blue pointer + night toggle | **In** (UX-authority §5; Phase 5 §6.3 hex) | Next shell may retune hex |
| Labeled 208px left nav + 52px topbar | **In** | Comps may pick icon-only 56px |
| Overview 2-col widgets + Journey canvas heatmap | **Already shipped** — do not restyle surfaces this phase | Optional polish |
| Dark-primary `#0B0F17`, Inter, glassmorphism, Sky `#38BDF8` | **Out** | Never as default |
| App switcher, omnibox `/` `Ctrl+K`, notification bell, red “Add Device” | **Out** | Palette still an open later decision |
| 64px collapsed rail, hover-expand 240px | **Out** | Maybe after Task 6 |
| 16:9 camera tiles, kebab, PTZ, snapshot | **Out** | Never for footfall widgets |
| WebGL floorplan + FOV cones + clustering | **Out** | Journey stays the Phase 4 canvas |
| Right inspector 380px + bottom 72px timeline + `globalTimestamp` | **Out** | Not a retail Operate surface |
| Body `overflow: hidden` 100vh command theater | **Out** | Roster month grid and Overview must scroll |

This spec answers the Downloads “ACTION REQUIRED” block for **this product**:

1. **Entity:** I.T. Causeway Bay store ops — footfall, journey density, roster staff. Not cameras.
2. **Tile metrics:** existing Overview widgets (hourly in, unique, compact heatmap). Not live video.
3. **Critical event:** roster **hard** conflict (publish blocked) and device offline. **No** timeline scrubber this phase.

## 2. Visual world (locked — do not invent)

From UX-authority §5 + Phase 5 §6.3. Hex here must match Phase 5. If they drift, **Phase 5 §6.3 wins**.

| Role | Value |
|------|--------|
| Default | **Light.** `--flow-bg #f3f5f8`, panel `#ffffff`, ink `#1c2333` |
| Night | Same layout. `--flow-bg #0d1220`, panel `#151c2e`, ink `#e8ecf5` |
| Pointer | **One** Signal Blue: `#2563eb` light / `#3b82f6` night. Nav active, focus, primary button. |
| Danger | `#dc2626` / `#e5534b` — hard conflicts, errors. Blue never means error. |
| Type | `"Segoe UI", "Noto Sans TC", "Microsoft JhengHei", system-ui, sans-serif` |
| **Banned** | Inter, Roboto-as-brand, IBM Plex, `/retail` teal-Sora, Sky `#38BDF8` as a second accent, glass `backdrop-filter` chrome |

Downloads dark canvas `#0B0F17` / surface `#1E293B` / border `#334155` are **anti-references**. Night theme uses the Phase 5 navy table, not a third palette.

## 3. Type scale (kept from Downloads, Inter removed)

Apply under `.flow-app`. Do not load Inter.

| Role | Size | Weight | Where |
|------|------|--------|--------|
| Page title | 20px | 600 | Settings `h1`, Journey page title if present |
| Section title | 16px | 600 | Settings `h2` may stay 13px muted; do not invent a second H1 |
| Card header | 14px | 500 | Widget titles (already in `WidgetCard` — do not restyle this phase) |
| Body / nav link | 13px | 400 | `.flow-nav a`, form labels |
| Metadata | 12px | 400 | Topbar site, honesty, muted |
| Nav group | 10px | 400 | `.flow-nav-group`, uppercase, letter-spacing 0.12em |

Tracking: page title `-0.01em` optional. Do not uppercase body copy.

## 4. Space, radius, motion

| Token | Phase 5 value | Downloads | Notes |
|-------|---------------|-----------|--------|
| Base unit | 4px scale | same | Padding 12/16/20 already on nav/content |
| Control height | ~32px | 32px omnibox | Topbar buttons, Settings radios row |
| Nav width | **208px** labeled | 64px / 240px hover | Labeled bilingual. Not icon-only. |
| Topbar height | **52px** | 56px + 40px context bar | One bar. No breadcrumb sub-header. |
| Radius | 6px controls, 8px login card | 4px tiles / 8px modals | Do not flatten roster dialogs this phase |
| Motion | existing hover; 200ms max if adding | 200ms ease-in-out | `prefers-reduced-motion: reduce` → no width animation |
| Elevation | 1px `--flow-line` | glass + 24px drawer shadow | Flat at rest |

## 5. Shell layout (Phase 5)

Fixed **two-pane** Operate shell. Viewport min-height 100vh. **Main content scrolls.** Do not set `overflow: hidden` on `body` or `.flow-app`.

```
┌──────────208px────────┬──────────────────────────────┐
│ brand IFMP Retail     │ topbar 52px  site | theme | EN | user | 登出 │
│ 主控台 group          ├──────────────────────────────┤
│  主控台 動線 …        │                              │
│ 排班 group            │  .flow-content  (Outlet)     │
│  排班 員工 …          │                              │
│ 設定 group            │                              │
│  設備 設定            │                              │
└───────────────────────┴──────────────────────────────┘
```

### 5.1 Left nav

- Background `--flow-panel`, right border 1px `--flow-line`.
- Groups from `apps/web/src/shell/nav.ts` (data). Do not hard-code hrefs in JSX beyond mapping that list.
- Active: `--flow-accent-soft` fill + `--flow-text`. **No** 3px Sky left-border (Downloads). Optional 2px left bar in `--flow-accent` if a fill-only state is too weak — still one pointer color.
- Bottom of rail: nothing extra this phase (theme lives in topbar + Settings). Do not pin Support.

### 5.2 Topbar

Left: `t('site.name')` (I.T. 銅鑼灣 / I.T. Causeway Bay).
Right, in order: **theme toggle**, locale toggle, display name, sign out.
No omnibox, no bell, no red primary “Add Device”, no avatar.

### 5.3 Login

`.flow-app.flow-login` uses the same tokens + `data-theme`. Card 360px, primary button `--flow-accent`. Outside `<Outlet />` but inside `FlowThemeProvider`.

### 5.4 Breakpoint (one)

`max-width: 900px`: nav becomes a horizontal wrap chip row under the topbar. Group labels hidden. Overview 2-col grid may stack via existing page styles — **do not** introduce 1280 / 768 Downloads breakpoints this phase.

## 6. Surfaces (do not rebuild in T4)

Heatmap, roster board, Overview widgets keep current class names in `flow-surfaces.css`. T4 only changes **tokens on `.flow-app`**, so they inherit paper/ink. Forbidden in T4:

- Rewrite widget cards to 16:9 media tiles
- Hover glass overlays, kebab, fullscreen, PTZ
- Slide-over inspector
- Docked timeline / playhead
- Changing `FlowFloorHeatmap` clip, labels, or jet ramp

## 7. z-index (chrome only)

| Layer | z-index | Node |
|-------|---------|------|
| Nav | 40 | `.flow-nav` |
| Topbar | 50 | `.flow-topbar` |
| Roster / page dialogs | keep existing | do not reset |

No drawer at 60. No timeline at 50 competing with the topbar.

## 8. Out (explicit)

Copied from Downloads and **banned** in `pilot-v1`:

- Inter / Roboto brand face
- Dark mode as the only/default theme
- `#38BDF8` Sky interactive highlight
- Glassmorphism overlays
- Product app switcher (Cameras / Access / Sensors)
- Command palette
- Notification bell
- Icon-only 64px rail with hover expand
- Sub-header breadcrumbs + Grid/Floorplan segmented control (Journey already has its own metric toggle)
- Camera grid, inspector, timeline, FOV, clustering, multi-stream sync
- `/retail` restyle
- Live wall / Events panes

## 9. Next shell (not this phase)

After estate-ai-ops Task 6 + Open Design G1, a **new** folder (`shell/next/` or similar) may harvest: icon rail, page bar, palette, Paper Deck retune. That shell must still implement Phase 5 §6.1 chrome contract. This file’s layout numbers may be replaced then. Pages and `lib/` still must not import the chrome folder.

## 10. Implementer check (T4)

- [ ] Light default; night is a toggle; hex = Phase 5 §6.3
- [ ] No Inter in computed `font-family`
- [ ] Nav 208px, labeled, from `FLOW_NAV`
- [ ] Topbar 52px; theme + locale + sign-out; no omnibox
- [ ] Content scrolls; body not `overflow: hidden`
- [ ] 900px chip row
- [ ] `rg Inter` and `rg 38BDF8` and `rg 0B0F17` empty under `apps/web/src/shell/pilot-v1`
- [ ] Surfaces file not rewritten
