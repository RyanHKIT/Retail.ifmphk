# IFMP Retail (pilot) — Phase 5: demo roster data + replaceable Operate shell

> **Date:** 2026-09-16
> **Status:** Draft for owner review (write-then-implement; coding is a later session)
> **Parent:** `docs/superpowers/specs/2026-09-15-ifmp-flow-design.md`
> **Amends:** `docs/superpowers/specs/2026-09-16-ifmp-flow-ux-authority-design.md` §7 — **pilot chrome v1 ships now** as a delete-able package. Estate-ai-ops Task 6 harvest + Open Design comps remain the **next** shell, not a blocker for this close-out.
> **Chrome visual SoT:** `docs/superpowers/specs/2026-09-16-ifmp-flow-pilot-v1-chrome-design.md` (Downloads command-center file reviewed; density kept, camera chrome rejected).
> **Plan:** `docs/superpowers/plans/2026-09-16-ifmp-flow-phase5-pilot-close.md`
> **Does not reopen:** Phase 2 roster behavior, Phase 3 widget mandate, Phase 4 heatmap math/clip.
> **Not parent §8 step 5 (Join).** Delivery nickname is “Phase 5 / pilot close”. Footfall→roster demand hints stay later.

## 1. Problem

The pilot has tools (Overview widgets, Journey heatmap, roster surfaces) but two holes block a manager walkthrough:

1. **Roster is empty.** Schema + RPCs + pages exist. There is no I.T. Causeway Bay seed for employees, templates, weeks, assignments, policies, or swaps. `/flow/roster*` is a blank board.
2. **Chrome is a one-off lump.** `FlowShell.tsx` + `flow.css` mix nav, tokens, roster widgets, and heatmap. Replacing the look later means hunting class names through every page. The user wants a **full pilot shell** that can be **deleted as a unit** and swapped.

Overview widgets 1–8 already have SQL through `2026-09-16`. After that calendar day the wall clock would empty the cards. **Pin the app clock** to that last seeded day instead of growing SQL.

## 2. Goal

A 分店經理 can sign in and, without typing seed data by hand:

- Scan Overview (widgets + compact heatmap) with numbers on screen.
- Open 排班 and see a fashion-store week (樓面 / 試衣 / 收銀) that can be published after a clean draft.
- Use a complete left-nav + top-bar Operate chrome (theme + language + settings).
- A future restyle deletes `apps/web/src/shell/pilot-v1/` (or successor folder) and drops a new shell that implements the same **chrome contract**. Pages and `lib/` do not import that folder.

Success is a 10-minute demo path, not a new product.

## 3. Approaches (locked)

### 3.1 Roster data

| Option | Trade-off |
|--------|-----------|
| **A. Additive SQL seed (chosen)** | Same path as footfall/heatmap seeds. RLS-visible. Survives refresh. |
| B. Client mock in `lib/roster` | Diverges from RPCs; publish/copy/swap lie. |
| C. Manager types it in the UI | Fine for one person, fails every clean DB / new laptop. |

**Chosen: A.** One migration. Deterministic UUIDs. Fashion stations only.

### 3.2 Overview extra data

| Option | Trade-off |
|--------|-----------|
| A. `max(footfall_daily.day)` fallback | Extra fetch. Journey still empty (`fetchJourney` uses today). Honesty date gymnastics. |
| B. Extend SQL every morning | Treadmill. The thing we want to stop. |
| **C. Demo clock (chosen)** | One constant. Overview, drills, Journey, roster landing week all see the same day. No new rows. |

**Chosen: C.** Pin **`2026-09-16`**, not 17/9. Footfall + heatmap seed end that HK day (`hour_start < 2026-09-17`). 17/9 is empty unless we add the extra day we are trying to avoid. Roster draft week `2026-09-14` already covers Wed 16.

Devices already seeded. Settings is chrome, not a widget. No new KPI.

### 3.3 Shell

| Option | Trade-off |
|--------|-----------|
| A. Restyle in place (`FlowShell.tsx` + giant `flow.css`) | Fast now, expensive to delete later. |
| **B. Extract chrome package + token contract (chosen)** | One extra extract commit. Delete folder = delete look. |
| C. Wait for estate-ai-ops Task 6 + Open Design G1 | User wants the **pilot** closed now; replacement shell can wait. |

**Chosen: B**, with **light default + night toggle** using the already-approved world in the UX-authority spec §5 (Signal Blue pointer, paper field, no Inter as brand face). Exact paper/ink hex is **pinned here** so implementers do not invent teal or copy DongQia slabs.

Visual density (type scale, 208px labeled rail, 52px topbar, 900px chips, what **not** to copy from the Verkada-like command-center note) lives in `docs/superpowers/specs/2026-09-16-ifmp-flow-pilot-v1-chrome-design.md`. T4 follows that file. Do not implement Downloads inspector/timeline/omnibox.

This is **pilot chrome v1**. It is allowed to be thrown away.

## 4. Workstream A — Roster demo seed

### 4.1 In

Additive migration `20260916000009_flow_roster_demo_seed.sql` for branch `a0000000-0000-4000-8000-000000000001` only.

| Entity | Count | Notes |
|--------|-------|-------|
| Employees | 8 | 4 樓面, 2 試衣, 2 收銀. Mix FT/PT. HK-style names. No 优衣库. No kitchen/吧/清潔. |
| Shift templates | 6 | Store hours 10:00–21:00 to match footfall. Colors distinct per template. |
| Roster weeks | 2 | **Published** week starting `2026-09-07`. **Draft** week starting `2026-09-14` (covers 2026-09-16). |
| Assignments | Fill most cells | No `double_booking`. Headcount near template targets. Overnight not required. |
| Hour policies | 2 employees | One `hard_block_overtime=false`; one `true`. |
| Availability | 1 row | Soft `availability` warning on the draft week (one PT, one afternoon). |
| Swap | 1 pending targeted | Two assignments on the **draft** week so 調更審批 is not empty. Do not auto-approve. |

`audit_logs`: do **not** fake rows. Trigger skips `auth.uid() is null`. Smoke fill happens when the manager publishes.

### 4.2 Out

- Auth users / extra managers.
- Staff-facing swap creation UI (parent Phase 7).
- Join footfall→headcount (parent Phase 5 “Join” stays later; this Phase 5 is **pilot close**, not demand-hints).
- Seeding a hard conflict on the current draft (would block the happy-path publish demo). Soft warnings allowed.

### 4.3 Identity

Fixed UUID prefix `b0000000-0000-4000-8000-` for employees/templates/weeks so docs and tests can name them. `ON CONFLICT DO NOTHING` / `ON CONFLICT (id) DO NOTHING`.

Stations in SQL **must** be the Unicode strings `樓面` | `試衣` | `收銀` (same as `Station` in `apps/web/src/lib/roster/types.ts`). The core migration file on disk is mojibake in comments; **do not copy those bytes**. Save the new seed as UTF-8.

### 4.4 Honesty

Roster is **demo staff**, not real I.T. employees. No extra footnote required on the board (names are obviously sample). Do not claim live HRIS.

### 4.5 Demo landing week

`WeekBoardPage` today uses UTC `weekStartOfToday()`. `fetchWeekData` **creates an empty draft** if that Monday is missing — so after 2026-09-20 the seeded weeks vanish from first paint.

Pure helper `pickRosterWeekStart(existingStarts: string[], today: string): string` in `apps/web/src/lib/roster/api.ts`:

1. `monday` = ISO Monday of `today` (YYYY-MM-DD, HK calendar via `hkToday()`).
2. If `existingStarts` contains `monday` → that week.
3. Else the latest `week_start <= monday`.
4. Else the earliest existing `week_start`.
5. Else `monday` (current create-if-missing behavior).

On first branch resolve, WeekBoard fetches `roster_weeks.week_start` for the branch, calls this helper **once**, then `loadWeek`. Do not fight later prev/next clicks.

## 5. Workstream B — Demo clock

### 5.1 Behavior

In `apps/web/src/lib/footfall/api.ts`:

```ts
/** Pilot only. Set to null when live I.T. footfall exists. */
export const FLOW_DEMO_DAY: string | null = '2026-09-16'

export function hkCalendarDay(now: Date = new Date()): string { /* current TZ body */ }

export function hkToday(now: Date = new Date()): string {
  if (FLOW_DEMO_DAY) return FLOW_DEMO_DAY
  return hkCalendarDay(now)
}
```

`hkToday()` is the app clock. Fetchers, Journey, Overview month/audience range, and WeekBoard landing (`pickRosterWeekStart(..., hkToday())`) all follow it. No `resolveDemoDay`. No extra SQL.

Existing TZ tests move onto `hkCalendarDay`. Tests that need a specific window pass an explicit `day: string` into fetchers (`fetchTodayHourly(branchId, day = hkToday())`).

Honesty: existing `overview.honesty` plus `overview.showingDay` with `{day}` replaced by `FLOW_DEMO_DAY` while the pin is on (`顯示樣本日 {day}` / `Showing sample day {day}`). Settings honesty already says sample/demo.

### 5.2 Out

- New charts, alerts widget, 進店率, 53-week extras.
- Changing Uniqlo-derived magnitudes.
- Browser DongQia calls.
- Seeding 2026-09-17 (or any day after 16) “so the pin can be tomorrow”. Pin the last seeded day instead.

## 6. Workstream C — Replaceable shell

### 6.1 Chrome contract

A shell package is valid if it:

1. Renders `<Outlet />` for `/flow/*` manager routes (login stays outside the shell).
2. Exposes CSS variables on a root class `.flow-app` (names in §6.3). Pages already use `var(--flow-*)`.
3. Reads nav from `apps/web/src/shell/nav.ts` (data, not JSX copies of hrefs).
4. Owns theme (`data-theme="light" | "night"`) on `.flow-app` and persists `localStorage.flow-theme`. **State lives in `apps/web/src/context/FlowThemeContext.tsx`** (not deleted with chrome). Shell and Settings both use that context. Login’s `.flow-app.flow-login` also sets `data-theme`.
5. Owns locale toggle (existing `FlowLocaleContext`) and sign-out.

**Pages, `lib/`, heatmap, roster board must not import anything under `apps/web/src/shell/pilot-v1/`.** They may import `apps/web/src/shell/nav.ts` only if a page truly needs hrefs (prefer not). They may import `@/styles/flow-surfaces.css` (or the aggregator). `context/FlowThemeContext.tsx` is not chrome.

**Delete test:** removing `apps/web/src/shell/pilot-v1/` and pointing `App.tsx` at a new `shell/next/` that implements the contract must not require editing `pages/flow/**` or `lib/**`.

### 6.2 File split (this phase)

| Path | Lives with | Deleted with shell? |
|------|------------|---------------------|
| `apps/web/src/shell/nav.ts` | Contract (route list + i18n keys) | **No** — next shell reuses it |
| `apps/web/src/context/FlowThemeContext.tsx` | Theme state + `localStorage.flow-theme` | **No** |
| `apps/web/src/shell/pilot-v1/FlowShell.tsx` | Chrome | **Yes** |
| `apps/web/src/shell/pilot-v1/shell.css` | Nav, topbar, app frame, **login frame**, theme tokens | **Yes** |
| `apps/web/src/styles/flow-surfaces.css` | Widgets, roster, heatmap, dialogs | **No** |
| `apps/web/src/styles/flow.css` | One-line aggregator `@import` both | Keep as compatibility import |
| `apps/web/src/pages/flow/Settings.tsx` | Page body (settings **content**) | **No** |
| `apps/web/src/components/flow/FlowShell.tsx` | Re-export from `shell/pilot-v1` for one release | Thin shim; delete when App imports the package directly |

Move current `FlowShell.tsx` into `pilot-v1`. Split CSS: chrome selectors (`.flow-nav`, `.flow-topbar`, `.flow-shell`, `.flow-app` tokens) vs surface selectors (`.overview-widget`, `.roster-*`, `.flow-heat-*`, `.flow-placeholder`).

### 6.3 Tokens (pinned)

Root: `.flow-app` with `[data-theme='light']` default and `[data-theme='night']`.

| Token | Light | Night |
|-------|-------|-------|
| `--flow-bg` | `#f3f5f8` | `#0d1220` |
| `--flow-panel` | `#ffffff` | `#151c2e` |
| `--flow-panel-2` | `#eef1f6` | `#1b2438` |
| `--flow-line` | `#d5dce8` | `#2a3550` |
| `--flow-text` | `#1c2333` | `#e8ecf5` |
| `--flow-muted` | `#5c6b82` | `#93a0b8` |
| `--flow-accent` | `#2563eb` | `#3b82f6` |
| `--flow-accent-soft` | `rgba(37,99,235,0.12)` | `rgba(59,130,246,0.16)` |
| `--flow-danger` | `#dc2626` | `#e5534b` |

Type on `.flow-app`: `"Segoe UI", "Noto Sans TC", "Microsoft JhengHei", system-ui, sans-serif`. **Do not** set Inter as the brand face.

Density: nav width **208px**, labeled links (bilingual — not icon-only). Controls ~32px. Flat cards (1px `--flow-line`). Signal Blue only for nav active, focus, primary buttons. Type scale and z-index: chrome design spec §3–§7.

Motion: existing press/hover; `prefers-reduced-motion` already respected on heatmap — do not add new motion systems. Do not lock `body` to `overflow: hidden`.

### 6.4 Settings page

Route already in nav: `/flow/settings` currently hits `FlowStubPage`. Replace with `Settings.tsx`:

- Theme: Light / Night (writes `flow-theme`)
- Language: existing toggle (or duplicate control bound to the same context)
- Honesty copy: sample traffic + demo roster + demo floorplan
- Branch name (read-only from `t('site.name')`)
- No password change, no owner admin

### 6.5 Out (shell)

- Command palette (UX-authority open decision — skip).
- Icon-only 56px / 64px hover-expand rail.
- Harvesting estate-ai-ops RoleShell components into this repo.
- Restyling `/retail`.
- Live wall / Events panes, inspector drawer, timeline scrubber, camera tiles, PTZ, FOV cones.
- Dark-primary Inter command center (Downloads file). Night is a toggle, not the default.
- Mobile-first rewrite. Collapse nav under **900px** to a horizontal chip row (must not clip Overview). No 1280/768 Downloads breakpoint set.

## 7. Quality

- SQL: after apply, `employees` count 8 for the branch; draft week has assignments; `private.roster_conflicts(draft_week_id)` returns **no hard** rows (soft availability OK).
- Unit: `pickRosterWeekStart` — current monday exists / missing monday uses latest past / empty list.
- Unit: `hkToday()` returns `2026-09-16` while pin is on; `hkCalendarDay` still TZ-correct.
- Component: Settings theme toggle sets `data-theme` and localStorage; FlowShell still exposes 排班 + 設定 links.
- Guard: `rg "from '@/shell/pilot-v1'" apps/web/src/pages apps/web/src/lib` → no matches.
- `/retail` untouched.
- Browser smoke: login → Overview numbers visible with honesty sample date 2026-09-16 → Journey heat inside walls → 排班 grid has names (seeded week, not an empty auto-created draft) → 調更審批 has one pending → Settings night/light → locale EN.

## 8. Honesty / naming

Unchanged: IFMP Retail, I.T. 銅鑼灣 / I.T. Causeway Bay, never 优衣库/Uniqlo in chrome. Overview honesty stays. Roster names are demo.

## 9. Risks

| Risk | Mitigation |
|------|------------|
| Pages hard-code navy hex | Surfaces use tokens only; grep `#0d1220` outside `pilot-v1/shell.css` and fix. |
| Seed stations fail CHECK | Use `樓面/試衣/收銀` literals; verify with one INSERT before bulk. |
| Demo clock hides a real empty after live ETL | Set `FLOW_DEMO_DAY = null`. One-line cutover. Honesty already says sample. |
| Extract breaks roster CSS | Split by selector prefix, not by rewriting class names in this phase. |
| Implementer restyles widgets “while here” | Out of scope. Heatmap clip/labels already shipped. Chrome spec §6. |
| Implementer ships Downloads camera chrome | Point at chrome design spec §8. Fail T4 if omnibox/timeline/Inter appear. |

## 10. Implementation session (operator)

Do **not** implement in the spec-writing session.

Next coding session: **Kimi 2.7 Code** (architecture: seed SQL, demo clock, shell extract, smoke) + **DeepSeek 4.1 Flash** (mechanical CSS split, Settings page, i18n keys). Follow the Phase 5 plan task table. Sequential commits (Phase 4 git-index lesson). Kimi is the strong implementer so screenshot UI review can stay in the same coding chat.

## 11. Open decisions

None blocking. Rail = labeled 208px. Palette = skip. Demo clock = **2026-09-16** (last seeded footfall/heatmap day). Demo weeks stay ISO 37/38 so they sit next to that clock.

---

## Approval

Owner: review this file, `docs/superpowers/specs/2026-09-16-ifmp-flow-pilot-v1-chrome-design.md`, then `docs/superpowers/plans/2026-09-16-ifmp-flow-phase5-pilot-close.md`. Coding starts only after that, on **Kimi 2.7 Code** + **DeepSeek 4.1 Flash**.
