# IFMP Retail Spine + Craft Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship one fully clickable golden-path demo (增收 → 缺口 → 調度 → 排班 → 教練 → 能源) that proves AI meets I.T. user requirements, and visually rework only the spine surfaces so the product no longer reads as the handoff zip.

**Architecture:** Keep mock JSON + session/local stores. Add a thin `demoSpine` context (shared focus: gapId, zoneId, nextBeat) so pages hand off state. Craft replaces layout/chrome/composition on spine pages using locked `docs/DESIGN.md` + impeccable Operate + Emil/Apple motion rules — redesign replaces zip look on those surfaces only.

**Tech Stack:** Existing Vite/React/Recharts app in `apps/web`; Vitest; CSS tokens in `retail.css`; no live devices / Supabase in this phase.

**Spec / prior:** `docs/superpowers/specs/2026-09-04-ifmp-retail-demo-design.md` · `docs/DESIGN.md` · `docs/demo-script.md`

## Global Constraints

- Spine pages only for craft: Shell, Overview, Footfall, Journey, Service Gap, Roster, Coach, Energy (People/Settings polish only if needed for the path)
- 繁中-first; EN not a blocker
- Mock-only; honesty banners stay
- Motion: transform/opacity, `--ease-out` `cubic-bezier(0.23, 1, 0.32, 1)`, UI &lt;300ms, reduced-motion, never `scale(0)` / `ease-in` entrances / `transition: all`
- Press feedback `:active scale(0.97)` ~100–160ms on primary actions
- Do not restyle entire app off-spine; do not start live Yijian/Supabase
- Commit per task; no secrets
- After UI edits: one batched impeccable detect pass on changed files

---

## Golden path (acceptance story)

Cold start → clear session → walk:

| Step | URL | Must work |
|------|-----|-----------|
| 0 | `/retail` | Dual-source strip; pending CTA; **下一步** chip to Footfall |
| 1 | `/retail/footfall` | Counter story; CTA → Journey (hot zone) |
| 2 | `/retail/journey` | Zone focus from query; CTA → Service Gap |
| 3–4 | `/retail/service-gap` | Threshold from Settings; dispatch → toast + deep-link Coach/Roster |
| 5 | Overview refresh | Pending count drops without full reload hacks |
| 6 | `/retail/roster` | Demand bump; board target uses live suggested; optional “缺口區” highlight from spine |
| 7 | `/retail/coach` | Pre-filter zone from dispatched gap; VL list |
| 8 | `/retail/energy` | Honesty banner; CTA back Overview |

Optional second sequence (same session): Settings change dwell → Gap copy updates → Coach subtitle updates.

---

## File map

| Path | Role |
|------|------|
| `apps/web/src/context/DemoSpineContext.tsx` | `gapId`, `zoneId`, `zoneName`, `setFocus`, `clearFocus`, `nextHref` |
| `apps/web/src/components/retail/SpineNav.tsx` | “下一步” / “本節完成” strip |
| `apps/web/src/components/retail/DispatchToast.tsx` | Feedback after 已調度 |
| `apps/web/src/lib/demoSpine.ts` | Pure helpers + tests for next-beat routing |
| Spine pages + `RetailShell.tsx` + `retail.css` | Connectivity + craft |
| `docs/demo-script.md` | Update to spine CTAs |
| `docs/surfaces/retail-spine.md` | Short Operate surface brief for craft |

---

### Task 1: Demo spine state + routing helpers

**Files:**
- Create: `apps/web/src/lib/demoSpine.ts`
- Create: `apps/web/src/lib/demoSpine.test.ts`
- Create: `apps/web/src/context/DemoSpineContext.tsx`
- Modify: `apps/web/src/App.tsx` (provider under retail routes)

**Interfaces:**
```ts
export type SpineFocus = { gapId?: string; zoneId?: string; zoneName?: string }
export function nextBeatPath(current: string): string // /retail → footfall → journey → service-gap → roster → coach → energy → /retail
export function gapDeepLink(focus: SpineFocus): { coach: string; roster: string }
```

- [ ] **Step 1:** Failing tests for `nextBeatPath` and `gapDeepLink` query strings (`?zone=` / `?gap=`)
- [ ] **Step 2:** Implement helpers + React context (sessionStorage key `ifmp_retail_spine_focus`)
- [ ] **Step 3:** Wrap retail routes with provider
- [ ] **Step 4:** `npm test` pass; commit `feat: demo spine focus context`

---

### Task 2: Wire golden-path CTAs and handoffs

**Files:**
- Create: `apps/web/src/components/retail/SpineNav.tsx`
- Modify: Overview, Footfall, Journey, ServiceGap, Roster, Coach, Energy
- Modify: `dispatchStore` consumers so `markDispatched` also `setFocus({ gapId, zoneName })`

**Connectivity rules:**
1. Overview primary path: pending → Gap; else SpineNav → Footfall
2. Footfall SpineNav → Journey
3. Journey: clicking a zone sets focus + navigates Gap with `?zone=`
4. ServiceGap: dispatch sets focus; show actions 「去教練」`/retail/coach?gap=&zone=` and 「去排班」`/retail/roster?zone=`
5. Coach: on mount read `gap`/`zone` query → filter list
6. Roster: read `zone` → highlight station row matching zone name map (入口→樓面, 試衣間→試衣, 收銀台→收銀, else 樓面)
7. After dispatch, Overview pending updates via storage event or custom `retail-dispatch` window event

- [ ] **Step 1:** Tests for Coach filter-from-query and Roster station map
- [ ] **Step 2:** Implement SpineNav + page CTAs + focus on dispatch
- [ ] **Step 3:** Dispatch → fire `window.dispatchEvent(new Event('retail-dispatch'))`; Overview listens and recomputes `countPending`
- [ ] **Step 4:** Manual cold path once; `npm test` + build; commit `feat: wire retail golden-path handoffs`

---

### Task 3: Settings ↔ Gap/Coach live rules (second sequence)

**Files:**
- Modify: `Settings.tsx`, `ServiceGap.tsx`, `Coach.tsx`
- Modify: `settingsStore.ts` to emit `retail-settings` event on save

- [ ] **Step 1:** Test: save dwell 180 → `getDisplayRules()` 180 → Gap banner text uses 180 without remount hack
- [ ] **Step 2:** Subscribe pages to `retail-settings` / storage
- [ ] **Step 3:** Commit `feat: live settings threshold handoff`

---

### Task 4: Craft — surface brief + shell (replace zip chrome)

**Files:**
- Create: `docs/surfaces/retail-spine.md` (Operate; thesis: evidence→action floor board)
- Modify: `RetailShell.tsx`, `retail.css` (composition: denser hierarchy, remove zip residue, button `:active`, focus rings, selection colors per craft-floor)
- Load impeccable craft-floor before editing

**Craft targets:**
- Shell no longer reads as rose/IBM handoff; match DESIGN tokens strictly
- Nav active states, filter bar as one calm instrument cluster
- Primary buttons press scale 0.97 / 120ms ease-out
- Remove emoji/unicode nav icons if still present — use consistent SVG or text-only weights

- [ ] **Step 1:** Write surface brief
- [ ] **Step 2:** Shell/CSS craft pass (desktop + mobile width check)
- [ ] **Step 3:** `node …/impeccable/scripts/detect.mjs --json` on shell files; fix batch
- [ ] **Step 4:** Commit `feat: craft retail shell for spine`

---

### Task 5: Craft — Overview + Footfall + Journey

**Files:** Overview, Footfall, Journey, related components, CSS

- Replace card-grid sameness: Overview = situation strip + one action + evidence (not identical KPI cookie-cutter noise)
- Footfall = counter hero metric + funnel/hourly as support
- Journey = heatmap as spatial hero; zone click affordance obvious
- Keep chart-enter motion; review with review-animations standards (no width funnel anim — convert to transform/scaleX if still present)

- [ ] **Step 1:** Implement craft layouts
- [ ] **Step 2:** Animation review fix (funnel `width` → `transform: scaleX`)
- [ ] **Step 3:** detect.mjs batch; commit `feat: craft overview footfall journey`

---

### Task 6: Craft — Gap + Roster + Coach + Energy

**Files:** ServiceGap, Roster (+ board), Coach, Energy

- Gap: dispatch as the hero action; list secondary
- Roster: demand vs board as two clear acts; teal board already — tighten denseness
- Coach: weekly review tone; prefiltered state visible
- Energy: honesty first; controls look conditional

- [ ] **Step 1:** Craft pass
- [ ] **Step 2:** detect.mjs on these pages
- [ ] **Step 3:** Commit `feat: craft action pages gap roster coach energy`

---

### Task 7: Demo script + presenter mode polish

**Files:**
- Modify: `docs/demo-script.md` to match SpineNav labels and deep links
- Create: optional `?demo=1` that auto-expands SpineNav and shows beat index (0–8)
- Modify: README one-liner for spine

- [ ] **Step 1:** Update docs
- [ ] **Step 2:** Optional `demo=1` beat indicator in shell
- [ ] **Step 3:** Full manual golden path + settings secondary path
- [ ] **Step 4:** `npm test` + `npm run build`; commit `docs: spine demo script and presenter mode`

---

## Spec coverage

| Need | Task |
|------|------|
| Connected demo sequence | 1–3, 7 |
| AI meets UR (增收/降本/服務) narrative | 2, 7 |
| UI ≠ zip on spine | 4–6 |
| Motion craft | 5–6 |
| Settings live | 3 |
| Live devices / Supabase | Out |

## Out of scope

- People page full redesign
- Real counter / 一見 / POS
- Task 13 Supabase AI
- Full EN parity
- Per-store unique mock datasets (unless needed for spine)

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-09-07-ifmp-retail-spine-craft.md`.

**1. Subagent-Driven (recommended)** · **2. Inline Execution**

Which approach?
