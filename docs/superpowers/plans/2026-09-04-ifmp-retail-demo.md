# IFMP Retail I.T. Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a standalone, pitch-ready IFMP Retail demo for I.T. that nails every in-scope page (A + B + Energy + Settings) with Approach 2 fashion-ops craft, 繁中-first mocks, dual counter/camera sourcing, demand+week-board roster, and deploy notes for `retail.ifmphk.com`.

**Architecture:** Vite + React + React Router app under `apps/web`, mock JSON under `public/mock/retail`, local/session persistence for dispatch/roster/settings. No live devices and no production IFMP Supabase for the pitch. Visual world locked in `docs/DESIGN.md` before bulk CSS rewrite. Roster week board adapted from `_reference/hk-roster-planner` (UX/logic), re-skinned to IFMP tokens, mock-backed.

**Tech Stack:** React 19, Vite 8, TypeScript, React Router 7, Recharts 2, Tailwind 4 (handoff), Vitest + Testing Library for pure logic, CSS tokens for theme; optional Motion only if CSS cannot cover interruptible feedback.

**Spec:** `docs/superpowers/specs/2026-09-04-ifmp-retail-demo-design.md`

## Global Constraints

- Standalone repo `ifmp-shop`; app path `apps/web` (renamed from handoff `apps/web-next`)
- Bind Vite to `127.0.0.1:5174`; `publicDir` → repo-root `public`
- Demo data: mock only; `meta.source` ∈ `counter` | `camera` | `iot`
- Locale: default `zh-Hant`; EN not a demo blocker
- Brand interim: **IFMP Retail** / ifmphk; no fake I.T. corporate logo
- Visual: fashion-ops Operate mode; IFMP teal accent; no purple SaaS / restaurant amber / property-twin clone
- Keep Recharts chart enter animations; pop-ins via `animate` skill rules (transform/opacity, ease-out, reduced-motion)
- Energy control copy always conditional
- New Supabase project only for stretch; never production IFMP credentials
- Design gate: do not bulk-rewrite CSS until `docs/DESIGN.md` exists
- Commit after each task; never commit secrets / `.env`

---

## File map

| Path | Responsibility |
|------|----------------|
| `apps/web/` | Vite React app (from `_handoff_extract/apps/web-next`) |
| `public/mock/retail/*.json` | Mock API payloads |
| `apps/web/src/api/retail.ts` | Typed fetch + `meta.source` |
| `apps/web/src/components/retail/*` | Shell, KPI, heatmap, alerts, **SourceChip**, roster board pieces |
| `apps/web/src/pages/retail/*` | Route pages |
| `apps/web/src/lib/dispatchStore.ts` | sessionStorage dispatch |
| `apps/web/src/lib/rosterStore.ts` | demand overrides |
| `apps/web/src/lib/rosterBoardStore.ts` | week board local state |
| `apps/web/src/lib/settingsStore.ts` | thresholds |
| `apps/web/src/lib/chartMotion.css` / tokens in `retail.css` | enter animations |
| `apps/web/src/i18n/messages.ts` | 繁中-first strings |
| `docs/PRODUCT.md` | Ported product scope |
| `docs/DESIGN.md` | Visual world (impeccable Operate) |
| `docs/demo-script.md` | Presenter beats + reset |
| `docs/deploy-retail.ifmphk.com.md` | Static host notes |
| `_reference/hk-roster-planner/` | Read-only UX/schema reference |
| `apps/web/src/mocks/roster-board.json` | Employees, templates, week assignments |

---

### Task 1: Scaffold standalone app from handoff

**Files:**
- Create: `apps/web/**` (copy from `_handoff_extract/apps/web-next/**`)
- Create: `public/mock/retail/**` (from handoff)
- Create: `README.md`, `.gitignore`, root `package.json` (optional workspace scripts)
- Create: `docs/PRODUCT.md` (from `_handoff_extract/PRODUCT.md`)
- Test: `apps/web/package.json` scripts `dev` / `build`

**Interfaces:**
- Consumes: handoff tree
- Produces: runnable app at `http://127.0.0.1:5174/retail`

- [ ] **Step 1: Copy handoff into place**

```powershell
Copy-Item -Recurse "_handoff_extract\apps\web-next" "apps\web"
Copy-Item -Recurse "_handoff_extract\public" "public"
Copy-Item "_handoff_extract\PRODUCT.md" "docs\PRODUCT.md"
```

- [ ] **Step 2: Fix `apps/web/vite.config.ts` `publicDir` to `../../public` and host/port `127.0.0.1:5174`**

Verify existing handoff config already matches; adjust path if folder depth differs.

- [ ] **Step 3: Install and smoke**

```powershell
cd apps\web
npm install
npm run build
npm run dev
```

Expected: build OK; browser opens `/retail` with Overview.

- [ ] **Step 4: Root README with run instructions (繁中)**

- [ ] **Step 5: Commit**

```bash
git add apps/web public docs/PRODUCT.md README.md .gitignore
git commit -m "chore: scaffold IFMP Retail app from handoff"
```

---

### Task 2: Design world pass (`docs/DESIGN.md`)

**Files:**
- Create: `docs/DESIGN.md`
- Create: `docs/surfaces/retail-shell.md` (optional short surface brief)
- Modify: none of `apps/web` CSS yet (read-only inspect)

**Interfaces:**
- Consumes: spec §6; impeccable Operate; apple-design principles (feedback, interruptibility, reduced motion)
- Produces: locked tokens — CSS variable names, type stack, density, motion rules used by Task 3+

- [ ] **Step 1: Run impeccable context for this project** (skill scripts from impeccable base dir) with target `docs/PRODUCT.md` / retail surface; follow Operate mode

- [ ] **Step 2: Write `docs/DESIGN.md` with concrete values**

Must include (no TBD):

```markdown
# IFMP Retail DESIGN

## Mode
Operate (store ops dashboard)

## Brand (interim)
- Product: IFMP Retail
- Accent teal: #0c6f6a (IFMP family)
- Ink: #14202b
- Paper: #f7f9fb
- Line: #cfd8e2
- Day/Night variants listed

## Type
- Display: [chosen family]
- UI: [chosen family]
- 繁中 primary

## Shell
- Sidebar width, topbar filters, SourceChip styles

## Motion
- --ease-out: cubic-bezier(0.23, 1, 0.32, 1)
- Chart/card enter: opacity + translateY(8px) → 0, 200–250ms ease-out
- prefers-reduced-motion: opacity only
- Never scale(0); never ease-in entrances

## Anti-references
- No purple SaaS, no restaurant amber, no property-twin chrome clone
```

Exact hex/fonts chosen during this task; pick once and lock.

- [ ] **Step 3: Human/agent gate — DESIGN.md reviewed against spec §6 before Task 3**

- [ ] **Step 4: Commit**

```bash
git add docs/DESIGN.md docs/surfaces
git commit -m "docs: lock IFMP Retail visual world (Operate)"
```

---

### Task 3: Tokens, shell rewrite, SourceChip

**Files:**
- Modify: `apps/web/src/retail.css`
- Modify: `apps/web/src/components/retail/RetailShell.tsx`
- Modify: `apps/web/src/i18n/messages.ts` (繁中 brand strings)
- Create: `apps/web/src/components/retail/SourceChip.tsx`
- Create: `apps/web/src/components/retail/SourceChip.test.tsx`
- Modify: `apps/web/package.json` (add vitest, jsdom, @testing-library/react)

**Interfaces:**
- Consumes: `docs/DESIGN.md` tokens
- Produces: `SourceChip({ source: 'counter' | 'camera' | 'iot' })`; shell brand **IFMP Retail**

- [ ] **Step 1: Add Vitest**

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 2: Failing test for SourceChip label map**

```tsx
import { render, screen } from '@testing-library/react'
import { SourceChip } from './SourceChip'

test('maps counter to 門禁計數', () => {
  render(<SourceChip source="counter" />)
  expect(screen.getByText('門禁計數')).toBeInTheDocument()
})
```

- [ ] **Step 3: Implement SourceChip + apply tokens to shell (IFMP Retail, 繁中 default)**

- [ ] **Step 4: Run `npm test` — pass; `npm run build` — pass**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: IFMP Retail shell tokens and SourceChip"
```

---

### Task 4: API meta.source + mock honesty

**Files:**
- Modify: `apps/web/src/api/retail.ts`
- Modify: `public/mock/retail/kpi.json`, `footfall-*.json`, `heatmap.json`, `gap-*.json`, `energy` mocks
- Create: `apps/web/src/api/retail.source.test.ts`

**Interfaces:**
- Consumes: `ApiResponse<T>` envelope
- Produces: `fetchMock` returns `{ data, meta }` or helper `getMeta(file)`; pages can read `meta.source`

```ts
export type DataSource = 'counter' | 'camera' | 'iot' | 'mock'

export async function fetchMockWithMeta<T>(file: string): Promise<{ data: T; meta?: { source?: string } }>
```

- [ ] **Step 1: Write failing test asserting footfall mock meta.source === 'counter'**

- [ ] **Step 2: Update JSON `meta.source` fields + API helper**

- [ ] **Step 3: Show SourceChip on Footfall / Journey / Gap / Energy headers**

- [ ] **Step 4: `npm test` + `npm run build`**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: dual-source meta on retail mocks"
```

---

### Task 5: Fictional I.T.-style stores + 繁中 mock copy

**Files:**
- Modify: `apps/web/src/context/RetailFilterContext.tsx` (`STORE_OPTIONS`)
- Modify: `apps/web/src/i18n/messages.ts` store labels
- Modify: zone names in `public/mock/retail/zones.json`, heatmap, gap, journey
- Modify: event/label strings in mocks to 繁中

**Interfaces:**
- Produces: stores e.g. `it-cwb`, `it-tst` with labels「I.T. 銅鑼灣（示範）」「I.T. 尖沙咀（示範）」; zones 入口 / 貨架 / 試衣間 / 收銀台

- [ ] **Step 1: Update filter options + messages**

- [ ] **Step 2: Align funnel numbers (passby ≥ enter; enter_rate coherent)**

- [ ] **Step 3: Manual check: switch store in UI; no English-only zone leftovers on Overview/Footfall**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: fictional I.T. demo stores and 繁中 mock copy"
```

---

### Task 6: Chart / card enter motion (`animate` rules)

**Files:**
- Modify: `apps/web/src/retail.css`
- Modify: page wrappers or shared `ChartPanel` component
- Create: `apps/web/src/components/retail/ChartPanel.tsx` if missing

**Interfaces:**
- Produces: `.chart-enter` class — opacity 0→1, `translateY(8px)`→0, 220ms `var(--ease-out)`; `@media (prefers-reduced-motion: reduce)` opacity only; stagger 40ms for KPI row

- [ ] **Step 1: Add CSS tokens from DESIGN.md (`--ease-out`, enter keyframes)**

- [ ] **Step 2: Wrap Recharts containers in ChartPanel; keep Recharts internal animation on**

- [ ] **Step 3: Manual feel-check Overview + Footfall; reduced-motion in DevTools**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: chart and KPI enter motion"
```

---

### Task 7: Overview narrative + 待調度 CTA

**Files:**
- Modify: `apps/web/src/pages/retail/Overview.tsx`
- Modify: `apps/web/src/components/retail/KpiCard.tsx`, `AlertList.tsx`

**Interfaces:**
- Consumes: kpi, alerts, dispatch pending count from `dispatchStore`
- Produces: clear dual-source hint strip; CTA to `/retail/service-gap` when pending gaps

- [ ] **Step 1: Add pending-dispatch summary using existing `dispatchStore` API**

- [ ] **Step 2: Polish layout per DESIGN.md (one job: situation + next action)**

- [ ] **Step 3: Manual script beat 0**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: overview narrative and dispatch CTA"
```

---

### Task 8: Harden Package A pages (Footfall, Journey, People, Service Gap)

**Files:**
- Modify: `apps/web/src/pages/retail/Footfall.tsx`
- Modify: `apps/web/src/pages/retail/Journey.tsx`
- Modify: `apps/web/src/pages/retail/People.tsx`
- Modify: `apps/web/src/pages/retail/ServiceGap.tsx`
- Modify: `apps/web/src/lib/dispatchStore.ts` (if API incomplete)
- Create: `apps/web/src/lib/dispatchStore.test.ts`

**Interfaces:**
- Produces: `markDispatched(eventId: string): void`, `isDispatched(eventId: string): boolean`, `listDispatched(): string[]`

- [ ] **Step 1: Failing tests for dispatch mark/list/persist sessionStorage**

- [ ] **Step 2: Implement/fix store; wire Service Gap one-click 已調度**

- [ ] **Step 3: Footfall — counter story copy; Journey heatmap; People roles; Gap ≥2 min rule visible**

- [ ] **Step 4: Empty/error retry UI (calm 繁中)**

- [ ] **Step 5: `npm test` + manual beats 1–5**

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: harden Package A pages and dispatch"
```

---

### Task 9: Roster demand layer polish

**Files:**
- Modify: `apps/web/src/pages/retail/Roster.tsx`
- Modify: `apps/web/src/mocks/roster-plan.json`
- Modify: `apps/web/src/lib/rosterStore.ts`

**Interfaces:**
- Produces: editable suggested[] persisted; chart series 建議/應到/實測/進店

- [ ] **Step 1: Ensure 繁中 series labels; bump ± controls; save/reset**

- [ ] **Step 2: Link copy: 「依門禁客流建議人手」**

- [ ] **Step 3: Manual beat 6 (demand half)**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: polish roster demand layer"
```

---

### Task 10: Roster week board (from reference, mock-backed)

**Files:**
- Create: `apps/web/src/mocks/roster-board.json`
- Create: `apps/web/src/lib/rosterBoardStore.ts`
- Create: `apps/web/src/lib/rosterBoardStore.test.ts`
- Create: `apps/web/src/components/retail/RosterWeekBoard.tsx`
- Create: `apps/web/src/components/retail/HourBar.tsx`
- Modify: `apps/web/src/pages/retail/Roster.tsx` (tabs or stacked: 需求 | 週更表)
- Read: `_reference/hk-roster-planner/src/pages/RosterBoardPage.tsx` (UX only — do not copy amber theme or Supabase)

**Interfaces:**
- Consumes: mock `{ employees, templates, assignments, weekStart }`
- Produces:

```ts
export type BoardAssignment = {
  id: string
  employeeId: string
  station: string
  workDate: string // YYYY-MM-DD
  templateId: string
}
export function loadBoard(): BoardState
export function upsertAssignment(a: BoardAssignment): void
export function removeAssignment(id: string): void
export function detectConflicts(state: BoardState): { type: 'double_booking' | 'overstaff' | 'understaff'; severity: 'hard' | 'soft'; message: string }[]
```

- Target headcount callout per day from demand `suggested` peak or daily average (document formula in code comment)

- [ ] **Step 1: Write failing conflict-detection tests (double booking = hard)**

- [ ] **Step 2: Implement store + mock JSON (fashion stations: 樓面/試衣/收銀)**

- [ ] **Step 3: Build RosterWeekBoard with IFMP tokens (teal chips, not amber)**

- [ ] **Step 4: Compose into Roster page under 週更表 section**

- [ ] **Step 5: `npm test` + manual edit cell / see soft understaff warning**

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: mock roster week board for retail demo"
```

---

### Task 11: Coach + Energy + Settings

**Files:**
- Modify: `apps/web/src/pages/retail/Coach.tsx`
- Modify: `apps/web/src/pages/retail/Energy.tsx`
- Modify: `apps/web/src/pages/retail/Settings.tsx`
- Modify: `apps/web/src/mocks/energy.json`, `settings.json`
- Modify: `apps/web/src/lib/settingsStore.ts`

**Interfaces:**
- Settings writes `dwell_threshold_sec` / `first_contact_sec` to local store; Coach/Gap read display copy from store when present
- Energy shows IoT SourceChip + conditional control banner 繁中: 「有場地控制權方可執行；示範僅顯示建議」

- [ ] **Step 1: Coach zone filter + VL summary list polish**

- [ ] **Step 2: Energy rules panel + honesty banner**

- [ ] **Step 3: Settings editable thresholds persist + reset**

- [ ] **Step 4: Manual beats 7–8**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: polish coach, energy, and settings"
```

---

### Task 12: Deploy path + presenter script + acceptance

**Files:**
- Create: `docs/deploy-retail.ifmphk.com.md`
- Create: `docs/demo-script.md`
- Modify: `README.md`

**Interfaces:**
- Produces: static deploy steps (Cloudflare Pages / Hostinger / nginx) pointing `retail.ifmphk.com` at `apps/web/dist`; DNS note only (no production change required in-repo)

- [ ] **Step 1: Write deploy doc (build command, SPA fallback, env none for mock)**

- [ ] **Step 2: Write demo-script.md with beats 0–8, reset tips (sessionStorage keys)**

- [ ] **Step 3: Full cold-start acceptance from spec §10 checklist**

```powershell
cd apps\web
npm ci
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 5174
```

- [ ] **Step 4: Commit**

```bash
git commit -m "docs: deploy notes and I.T. demo presenter script"
```

---

### Task 13 (STRETCH): New retail Supabase + AI roster flag

**Only if Tasks 1–12 acceptance is green.**

**Files:**
- Create: `apps/web/.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ROSTER_AI=0`)
- Create: `supabase/` migrations adapted from `_reference/hk-roster-planner/supabase/migrations` (retail naming)
- Feature-flag board AI generate behind `VITE_ROSTER_AI=1`

**Constraints:** new Supabase project only; never commit real keys; offline demo must work with flag off.

- [ ] **Step 1: Create empty Supabase project (manual dashboard)**

- [ ] **Step 2: Port minimal schema + seed demo staff**

- [ ] **Step 3: Optional generate button; default off**

- [ ] **Step 4: Commit `.env.example` + migrations only**

---

## Spec coverage self-review

| Spec area | Task(s) |
|-----------|---------|
| Scaffold standalone + PRODUCT | 1 |
| DESIGN.md / impeccable Operate | 2 |
| Approach 2 shell + teal + IFMP Retail | 3 |
| Counter/camera/iot sources | 4 |
| Fictional I.T. stores, 繁中 | 5 |
| Chart pop-ins / animate | 6 |
| Overview + dispatch CTA | 7 |
| A pages + ≥2 min gaps | 8 |
| Roster demand | 9 |
| Roster week board | 10 |
| Coach / Energy / Settings | 11 |
| retail.ifmphk.com + script | 12 |
| New Supabase stretch | 13 |
| No live devices / no POS | Global + out of tasks |
| EN deprioritized | Global + Task 5 |

**Placeholder scan:** none intentional.  
**Type consistency:** `DataSource`, `BoardAssignment`, dispatch helpers named as above across tasks.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-04-ifmp-retail-demo.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute in this session with executing-plans checkpoints  

Which approach?
