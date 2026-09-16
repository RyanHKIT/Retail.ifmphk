# IFMP Retail (Flow) — Phase 5 Implementation Plan: demo roster + replaceable shell

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. **Sequential commits only** (Phase 2/4: parallel commits raced the git index). Steps use checkbox (`- [ ]`) syntax.

**Goal:** A 分店經理 can walk `/flow` with seeded roster names on the board, Overview numbers after the seed window, and a light Operate chrome that deletes as `apps/web/src/shell/pilot-v1/`.

**Architecture:** Additive SQL seed (same path as footfall). `FLOW_DEMO_DAY = '2026-09-16'` pins `hkToday()` so Overview/Journey/roster landing stay on the last seeded day. Chrome moves into `shell/pilot-v1` + `shell/nav.ts`; surfaces stay in `flow-surfaces.css`. Theme state lives in `FlowThemeContext` so Settings does not import the chrome folder.

**Tech Stack:** Vite 8, React 19, react-router-dom 7, Vitest, Testing Library, Supabase SQL (RLS already on). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-16-ifmp-flow-phase5-pilot-close-design.md`  
**Chrome visual:** `docs/superpowers/specs/2026-09-16-ifmp-flow-pilot-v1-chrome-design.md`

## Global Constraints

- Product UI name: **IFMP Retail**; site: **I.T. Causeway Bay** / **I.T. 銅鑼灣** — never 优衣库/Uniqlo in chrome, seed names, or comments
- Locale: zh-HK + en via `flowMessages.ts`; `t()` has **no interpolator** — use `.replace('{day}', day)`
- Do **not** modify `/retail/*`, `retail.css`, or mock JSON as SoT
- Do **not** invent `/retail/service-gap` links
- Stations in SQL must be the Unicode literals `樓面` | `試衣` | `收銀` (UTF-8). Do not copy mojibake from `20260915000001_flow_roster_core.sql`
- `fetchJourney` stays SELECT-only; this phase does not change heatmap math/clip
- No DongQia passwords or `service_role` in git / client
- Honesty: demo staff + sample traffic + demo floorplan
- This delivery nickname is **Phase 5 / pilot close**, not parent §8 step 5 Join
- Sequential git commits from repo root. Do not commit `.env`

---

## Execution strategy (models)

Operator will code in a **later session** on **Kimi 2.7 Code** (architecture + screenshot UI review) + **DeepSeek 4.1 Flash** (mechanical). Do not start T1 in the spec-writing session.

| Task | Model | Why |
|------|--------|-----|
| T1 roster SQL + landing week | **Kimi 2.7 Code** | Station CHECK + conflict hours are easy to get wrong |
| T2 demo clock `FLOW_DEMO_DAY` | **Kimi 2.7 Code** | One constant; fetchers must not bypass it with `new Date()` |
| T3 extract `shell/pilot-v1` + CSS split | **DeepSeek 4.1 Flash** | Move files; do not restyle |
| T4 light/night tokens + `FlowThemeContext` | **Kimi 2.7 Code** | Pinned hex; must not invent teal; screenshot the light shell |
| T5 Settings page + i18n | **DeepSeek 4.1 Flash** | Page wiring once tokens exist |
| T6 tsc + guard + browser smoke | **Kimi 2.7 Code** | Coverage audit + screenshot review |

**Pre-flight (human):** approve spec + this plan. Switch agent to **Kimi 2.7 Code**. Switch to **DeepSeek 4.1 Flash** at T3 and T5. Subagents: `inherit` after the switch. Sequential commits. Do not start T1 until approved.

Supabase project: `dntmvxfgqmqremdrswij`. Apply T1 via MCP `apply_migration` (not `supabase db push`). Vite remains `apps/web` port **5174**.

---

## File map

| File | Purpose |
|------|---------|
| `supabase/migrations/20260916000009_flow_roster_demo_seed.sql` | 8 staff, 6 templates, 2 weeks, assignments, 2 policies, 1 availability, 1 pending swap |
| `apps/web/src/lib/roster/api.ts` | `pickRosterWeekStart`, `fetchRosterWeekStarts` |
| `apps/web/src/lib/roster/api.test.ts` | landing-week cases |
| `apps/web/src/pages/flow/roster/WeekBoard.tsx` | pick seeded week once on branch resolve |
| `apps/web/src/pages/flow/roster/WeekBoard.test.tsx` | mock the new fetch |
| `apps/web/src/lib/footfall/api.ts` | `FLOW_DEMO_DAY`; `hkCalendarDay`; `hkToday` pin; day-scoped fetchers take `day: string` |
| `apps/web/src/lib/footfall/api.test.ts` | pin + TZ tests |
| `apps/web/src/pages/flow/Overview.tsx` | honesty sample date from `hkToday()` |
| `apps/web/src/pages/flow/Overview.test.tsx` | honesty includes 2026-09-16 |
| `apps/web/src/shell/nav.ts` | nav data (survives chrome delete) |
| `apps/web/src/shell/pilot-v1/FlowShell.tsx` | chrome |
| `apps/web/src/shell/pilot-v1/shell.css` | tokens, nav, topbar, login |
| `apps/web/src/styles/flow-surfaces.css` | roster + heatmap + placeholder |
| `apps/web/src/styles/flow.css` | aggregator `@import` |
| `apps/web/src/components/flow/FlowShell.tsx` | shim re-export + aggregator import |
| `apps/web/src/context/FlowThemeContext.tsx` | `light` \| `night` + `localStorage.flow-theme` |
| `apps/web/src/context/FlowThemeContext.test.tsx` | persist + default light |
| `apps/web/src/App.tsx` | `FlowThemeProvider`; explicit `/flow/settings` route |
| `apps/web/src/pages/flow/Login.tsx` | `data-theme` from context |
| `apps/web/src/pages/flow/Settings.tsx` | theme / locale / honesty / branch |
| `apps/web/src/pages/flow/Settings.test.tsx` | toggle writes storage + `data-theme` |
| `apps/web/src/i18n/flowMessages.ts` | `settings.*`, `overview.showingDay` |
| `docs/superpowers/specs/2026-09-16-ifmp-flow-pilot-v1-chrome-design.md` | Visual SoT for T4 (density in, camera chrome out) |
| `docs/flow-pilot-phase5.md` | smoke checklist |

---

### Task 1: Roster demo seed + landing week (Kimi 2.7 Code)

**Files:**
- Create: `supabase/migrations/20260916000009_flow_roster_demo_seed.sql`
- Modify: `apps/web/src/lib/roster/api.ts`
- Modify: `apps/web/src/lib/roster/api.test.ts`
- Modify: `apps/web/src/pages/flow/roster/WeekBoard.tsx`
- Modify: `apps/web/src/pages/flow/roster/WeekBoard.test.tsx`

**Interfaces:**
- Consumes: branch `a0000000-0000-4000-8000-000000000001`; tables from `20260915000001` + `unavailable_slots` from `20260916000004`
- Produces: `pickRosterWeekStart(existingStarts: string[], today: string): string`; `fetchRosterWeekStarts(branchId: string): Promise<string[]>`; seed IDs under prefix `b0000000-0000-4000-8000-`

- [ ] **Step 1: Write the failing landing-week tests**

Add to `apps/web/src/lib/roster/api.test.ts` (import `pickRosterWeekStart` once it exists — test first, so expect FAIL on import):

```ts
describe('pickRosterWeekStart', () => {
  it('uses this Monday when that week exists', () => {
    expect(
      pickRosterWeekStart(['2026-09-07', '2026-09-14'], '2026-09-16'),
    ).toBe('2026-09-14')
  })

  it('falls back to latest week_start <= this Monday', () => {
    expect(
      pickRosterWeekStart(['2026-09-07', '2026-09-14'], '2026-10-01'),
    ).toBe('2026-09-14')
  })

  it('uses earliest seeded week if all are in the future', () => {
    expect(pickRosterWeekStart(['2026-09-14'], '2026-09-01')).toBe('2026-09-14')
  })

  it('returns this Monday when nothing is seeded', () => {
    expect(pickRosterWeekStart([], '2026-09-16')).toBe('2026-09-14')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/roster/api.test.ts` from `apps/web`

Expected: FAIL — `pickRosterWeekStart` is not exported.

- [ ] **Step 3: Implement helpers**

In `apps/web/src/lib/roster/api.ts` next to `addDays`:

```ts
/** ISO Monday (YYYY-MM-DD) of the week that contains `isoDate`. */
export function mondayOf(isoDate: string): string {
  const dow = (new Date(`${isoDate}T00:00:00Z`).getUTCDay() + 6) % 7
  return addDays(isoDate, -dow)
}

/**
 * Demo landing week: prefer the week covering `today`, else the latest
 * seeded week_start <= that Monday, else the earliest seed, else Monday.
 */
export function pickRosterWeekStart(
  existingStarts: string[],
  today: string,
): string {
  const monday = mondayOf(today)
  if (existingStarts.includes(monday)) return monday
  const past = existingStarts.filter((s) => s <= monday).sort()
  if (past.length > 0) return past[past.length - 1]
  const future = [...existingStarts].sort()
  if (future.length > 0) return future[0]
  return monday
}

export async function fetchRosterWeekStarts(
  branchId: string,
): Promise<string[]> {
  const { data, error } = await sb()
    .from('roster_weeks')
    .select('week_start')
    .eq('branch_id', branchId)
    .order('week_start', { ascending: true })
  if (error) throw mapRpcError(error)
  return (data ?? []).map((r: { week_start: string }) => r.week_start)
}
```

- [ ] **Step 4: Wire WeekBoard (one-shot pick, then load)**

`WeekBoard.tsx` currently `useState<string>(weekStartOfToday)`. Change to:

1. Import `fetchRosterWeekStarts`, `pickRosterWeekStart` from `@/lib/roster/api` and `hkToday` from `@/lib/footfall/api`.
2. Replace `weekStart` init: `useState<string | null>(null)`.
3. In the existing branch-resolve effect, after `setBranchId(id)`, if `id` is non-null:

```ts
const starts = await fetchRosterWeekStarts(id)
if (!cancelled) {
  setWeekStart(pickRosterWeekStart(starts, hkToday()))
}
```

If `id` is null, `setWeekStart(null)` is fine.

4. Delete `weekStartOfToday` (unused). Keep `monthStartOfToday`.
5. Guard the load effect: `if (viewMode === 'week' && weekStart) void loadWeek(weekStart)`.

- [ ] **Step 5: Update WeekBoard.test mock**

Inside the existing `vi.mock('@/lib/roster/api', () => { ... return { ... }})` object, add (copy the real helper bodies so the board does not depend on a missing export at mock time):

```ts
mondayOf: (isoDate: string) => {
  const dow = (new Date(`${isoDate}T00:00:00Z`).getUTCDay() + 6) % 7
  return addDays(isoDate, -dow)
},
pickRosterWeekStart: (existingStarts: string[], today: string) => {
  const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7
  const monday = addDays(today, -dow)
  if (existingStarts.includes(monday)) return monday
  const past = existingStarts.filter((s) => s <= monday).sort()
  if (past.length > 0) return past[past.length - 1]
  const future = [...existingStarts].sort()
  if (future.length > 0) return future[0]
  return monday
},
fetchRosterWeekStarts: vi.fn(async () => ['2026-09-07', '2026-09-14']),
```

Also mock `@/lib/footfall/api` in this file:

```ts
vi.mock('@/lib/footfall/api', () => ({
  hkToday: () => '2026-09-16',
}))
```

Existing tests expect columns `09-14`. With this mock they stay stable after 2026-09-20.

- [ ] **Step 6: Run helper + board tests**

Run from `apps/web`:

```
npx vitest run src/lib/roster/api.test.ts src/pages/flow/roster/WeekBoard.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Write the seed migration**

Create `supabase/migrations/20260916000009_flow_roster_demo_seed.sql`. File **must be UTF-8**. Stations are exactly `樓面`, `試衣`, `收銀`. `ON CONFLICT (id) DO NOTHING` on every insert. Do **not** insert `audit_logs`.

```sql
-- 20260916000009_flow_roster_demo_seed.sql
-- Demo roster for I.T. Causeway Bay. Not real HRIS. Never 优衣库.
-- Branch: a0000000-0000-4000-8000-000000000001
-- UUID prefix: b0000000-0000-4000-8000-

-- ----- employees (8) -----
INSERT INTO public.employees (
  id, profile_id, branch_id, name_zh, name_en, phone,
  station, employment_type, min_hours_per_week, max_hours_per_week, is_active
) VALUES
  ('b0000000-0000-4000-8000-000000000001', NULL, 'a0000000-0000-4000-8000-000000000001',
   '陳嘉欣', 'Karen Chan', '51230001', '樓面', 'full_time', 40, 48, true),
  ('b0000000-0000-4000-8000-000000000002', NULL, 'a0000000-0000-4000-8000-000000000001',
   '林子軒', 'Jason Lam', '51230002', '樓面', 'full_time', 40, 48, true),
  ('b0000000-0000-4000-8000-000000000003', NULL, 'a0000000-0000-4000-8000-000000000001',
   '黃詩琪', 'Suki Wong', '51230003', '樓面', 'part_time', 12, 24, true),
  ('b0000000-0000-4000-8000-000000000004', NULL, 'a0000000-0000-4000-8000-000000000001',
   '周浩然', 'Howard Chow', '51230004', '樓面', 'part_time', 12, 24, true),
  ('b0000000-0000-4000-8000-000000000005', NULL, 'a0000000-0000-4000-8000-000000000001',
   '吳詠琳', 'Wing Wu', '51230005', '試衣', 'full_time', 40, 48, true),
  ('b0000000-0000-4000-8000-000000000006', NULL, 'a0000000-0000-4000-8000-000000000001',
   '鄭曉彤', 'Hiu Cheng', '51230006', '試衣', 'part_time', 12, 24, true),
  ('b0000000-0000-4000-8000-000000000007', NULL, 'a0000000-0000-4000-8000-000000000001',
   '馬偉明', 'Wai Ma', '51230007', '收銀', 'full_time', 40, 48, true),
  ('b0000000-0000-4000-8000-000000000008', NULL, 'a0000000-0000-4000-8000-000000000001',
   '李芷晴', 'Chi Lee', '51230008', '收銀', 'part_time', 12, 24, true)
ON CONFLICT (id) DO NOTHING;

-- ----- templates (6): store 10:00–21:00 -----
INSERT INTO public.shift_templates (
  id, branch_id, name, start_time, end_time, color, station, headcount_target, is_active
) VALUES
  ('b0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000001',
   '樓面日間', '10:00', '18:00', '#3b82f6', '樓面', 2, true),
  ('b0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000001',
   '樓面晚間', '18:00', '21:00', '#1d4ed8', '樓面', 2, true),
  ('b0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000001',
   '試衣日間', '10:00', '18:00', '#7c3aed', '試衣', 1, true),
  ('b0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000001',
   '試衣晚間', '18:00', '21:00', '#6d28d9', '試衣', 1, true),
  ('b0000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000001',
   '收銀日間', '10:00', '18:00', '#0f766e', '收銀', 1, true),
  ('b0000000-0000-4000-8000-000000000016', 'a0000000-0000-4000-8000-000000000001',
   '收銀晚間', '18:00', '21:00', '#115e59', '收銀', 1, true)
ON CONFLICT (id) DO NOTHING;

-- ----- weeks: ISO 37 published, ISO 38 draft -----
INSERT INTO public.roster_weeks (
  id, branch_id, year, week_number, week_start, status, published_at, published_by
) VALUES
  ('b0000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000001',
   2026, 37, '2026-09-07', 'published', '2026-09-13T21:00:00+08:00', NULL),
  ('b0000000-0000-4000-8000-000000000022', 'a0000000-0000-4000-8000-000000000001',
   2026, 38, '2026-09-14', 'draft', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ----- hour policies -----
INSERT INTO public.hour_policies (
  id, employee_id, min_hours_per_week, max_hours_per_week, hard_block_overtime
) VALUES
  ('b0000000-0000-4000-8000-000000000041', 'b0000000-0000-4000-8000-000000000001',
   40, 40, false),
  ('b0000000-0000-4000-8000-000000000042', 'b0000000-0000-4000-8000-000000000002',
   40, 48, true)
ON CONFLICT (id) DO NOTHING;

-- ----- availability (soft): Suki, Saturday afternoon of the draft week -----
INSERT INTO public.availability_notes (
  id, employee_id, week_start, notes, unavailable_slots
) VALUES (
  'b0000000-0000-4000-8000-000000000051',
  'b0000000-0000-4000-8000-000000000003',
  '2026-09-14',
  '週六下午課程',
  '[{"dayOfWeek":5,"allDay":false,"startTime":"12:00","endTime":"18:00"}]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ----- assignments (both weeks) -----
-- Pattern:
--   Mon–Fri: e1+e2 樓面日間; e3+e4 樓面晚間; e5 試衣日間; e6 試衣晚間; e7 收銀日間; e8 收銀晚間
--   Sat: e1+e3 樓面日間 (e1 → soft overtime vs policy max 40); e5 試衣日間; e7 收銀日間; e4 樓面晚間
--   Sun: e2+e4 樓面日間 (e2 = 48h exact, not > max); e6 試衣日間; e8 收銀日間; e3 樓面晚間
-- Named IDs for the pending swap (draft week only):
--   e1 Mon 2026-09-14 樓面日間 = ...201
--   e2 Wed 2026-09-16 樓面日間 = ...202

WITH days AS (
  SELECT d::date AS work_date
  FROM generate_series('2026-09-07'::date, '2026-09-20'::date, interval '1 day') AS d
),
pattern AS (
  SELECT
    e.id AS employee_id,
    t.id AS shift_template_id,
    days.work_date,
    CASE WHEN days.work_date < DATE '2026-09-14'
         THEN 'b0000000-0000-4000-8000-000000000021'::uuid
         ELSE 'b0000000-0000-4000-8000-000000000022'::uuid
    END AS roster_week_id
  FROM days
  CROSS JOIN (VALUES
    -- weekday base (Mon=1 .. Fri=5)
    ('b0000000-0000-4000-8000-000000000001'::uuid, 'b0000000-0000-4000-8000-000000000011'::uuid, ARRAY[1,2,3,4,5]),
    ('b0000000-0000-4000-8000-000000000002'::uuid, 'b0000000-0000-4000-8000-000000000011'::uuid, ARRAY[1,2,3,4,5]),
    ('b0000000-0000-4000-8000-000000000003'::uuid, 'b0000000-0000-4000-8000-000000000012'::uuid, ARRAY[1,2,3,4,5]),
    ('b0000000-0000-4000-8000-000000000004'::uuid, 'b0000000-0000-4000-8000-000000000012'::uuid, ARRAY[1,2,3,4,5]),
    ('b0000000-0000-4000-8000-000000000005'::uuid, 'b0000000-0000-4000-8000-000000000013'::uuid, ARRAY[1,2,3,4,5]),
    ('b0000000-0000-4000-8000-000000000006'::uuid, 'b0000000-0000-4000-8000-000000000014'::uuid, ARRAY[1,2,3,4,5]),
    ('b0000000-0000-4000-8000-000000000007'::uuid, 'b0000000-0000-4000-8000-000000000015'::uuid, ARRAY[1,2,3,4,5]),
    ('b0000000-0000-4000-8000-000000000008'::uuid, 'b0000000-0000-4000-8000-000000000016'::uuid, ARRAY[1,2,3,4,5]),
    -- Saturday = 6
    ('b0000000-0000-4000-8000-000000000001'::uuid, 'b0000000-0000-4000-8000-000000000011'::uuid, ARRAY[6]),
    ('b0000000-0000-4000-8000-000000000003'::uuid, 'b0000000-0000-4000-8000-000000000011'::uuid, ARRAY[6]),
    ('b0000000-0000-4000-8000-000000000005'::uuid, 'b0000000-0000-4000-8000-000000000013'::uuid, ARRAY[6]),
    ('b0000000-0000-4000-8000-000000000007'::uuid, 'b0000000-0000-4000-8000-000000000015'::uuid, ARRAY[6]),
    ('b0000000-0000-4000-8000-000000000004'::uuid, 'b0000000-0000-4000-8000-000000000012'::uuid, ARRAY[6]),
    -- Sunday = 7
    ('b0000000-0000-4000-8000-000000000002'::uuid, 'b0000000-0000-4000-8000-000000000011'::uuid, ARRAY[7]),
    ('b0000000-0000-4000-8000-000000000004'::uuid, 'b0000000-0000-4000-8000-000000000011'::uuid, ARRAY[7]),
    ('b0000000-0000-4000-8000-000000000006'::uuid, 'b0000000-0000-4000-8000-000000000013'::uuid, ARRAY[7]),
    ('b0000000-0000-4000-8000-000000000008'::uuid, 'b0000000-0000-4000-8000-000000000015'::uuid, ARRAY[7]),
    ('b0000000-0000-4000-8000-000000000003'::uuid, 'b0000000-0000-4000-8000-000000000012'::uuid, ARRAY[7])
  ) AS x(emp_id, tmpl_id, dows)
  JOIN public.employees e ON e.id = x.emp_id
  JOIN public.shift_templates t ON t.id = x.tmpl_id
  WHERE EXTRACT(ISODOW FROM days.work_date)::int = ANY (x.dows)
)
INSERT INTO public.assignments (
  id, roster_week_id, employee_id, shift_template_id, work_date, notes
)
SELECT
  CASE
    WHEN p.employee_id = 'b0000000-0000-4000-8000-000000000001'
     AND p.work_date = DATE '2026-09-14'
     AND p.shift_template_id = 'b0000000-0000-4000-8000-000000000011'
      THEN 'b0000000-0000-4000-8000-000000000201'::uuid
    WHEN p.employee_id = 'b0000000-0000-4000-8000-000000000002'
     AND p.work_date = DATE '2026-09-16'
     AND p.shift_template_id = 'b0000000-0000-4000-8000-000000000011'
      THEN 'b0000000-0000-4000-8000-000000000202'::uuid
    ELSE ('b0000000-0000-4000-8000-' || lpad((3000 + row_number() OVER (
      ORDER BY p.work_date, p.employee_id, p.shift_template_id
    ))::text, 12, '0'))::uuid
  END,
  p.roster_week_id,
  p.employee_id,
  p.shift_template_id,
  p.work_date,
  ''
FROM pattern p
ON CONFLICT (id) DO NOTHING;

-- ----- pending targeted swap on the draft week -----
INSERT INTO public.swap_requests (
  id, requester_employee_id, requester_assignment_id,
  target_employee_id, target_assignment_id,
  is_open_bid, reason, status, review_notes
) VALUES (
  'b0000000-0000-4000-8000-000000000031',
  'b0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000201',
  'b0000000-0000-4000-8000-000000000002',
  'b0000000-0000-4000-8000-000000000202',
  false,
  '週三家庭事務，請求對調周一',
  'pending',
  ''
)
ON CONFLICT (id) DO NOTHING;
```

Hour math (do not change the pattern):

- e1 陳嘉欣: 5×8 + Sat 8 = 48h vs policy max 40 → **soft overtime**, not hard
- e2 林子軒: 5×8 + Sun 8 = 48h vs hard max 48 → **no** overtime_hard
- e3 黃詩琪: weekday evenings 15h + Sat day 8h + Sun evening 3h = 26h vs PT max 24 → **soft overtime**; Sat day overlaps availability 12:00–18:00 → **soft availability**
- No two overlapping templates for one person on one day → **no double_booking**

If `private.roster_conflicts` on the draft week returns `overtime_hard` or `double_booking`, fix hours — do not seed a hard conflict.

- [ ] **Step 8: Apply + verify via Supabase MCP**

`apply_migration` name `20260916000009_flow_roster_demo_seed` to project `dntmvxfgqmqremdrswij`.

Then `execute_sql`:

```sql
SELECT count(*) AS n FROM public.employees
WHERE branch_id = 'a0000000-0000-4000-8000-000000000001';
-- expect 8

SELECT station, count(*) FROM public.employees
WHERE branch_id = 'a0000000-0000-4000-8000-000000000001'
GROUP BY station;
-- 樓面 4, 試衣 2, 收銀 2

SELECT status, week_start, (
  SELECT count(*) FROM public.assignments a WHERE a.roster_week_id = w.id
) AS assignments
FROM public.roster_weeks w
WHERE branch_id = 'a0000000-0000-4000-8000-000000000001'
ORDER BY week_start;
-- 2026-09-07 published; 2026-09-14 draft; both assignment counts > 0

SELECT kind, severity, count(*)
FROM private.roster_conflicts('b0000000-0000-4000-8000-000000000022')
GROUP BY 1, 2;
-- hard count must be 0. soft overtime / availability allowed.

SELECT status FROM public.swap_requests
WHERE id = 'b0000000-0000-4000-8000-000000000031';
-- pending
```

If station INSERT fails CHECK, the file is not UTF-8 or the literals were copied from the mojibake core migration. Retype `樓面` `試衣` `收銀`.

- [ ] **Step 9: Commit**

From repo root:

```
git add supabase/migrations/20260916000009_flow_roster_demo_seed.sql apps/web/src/lib/roster/api.ts apps/web/src/lib/roster/api.test.ts apps/web/src/pages/flow/roster/WeekBoard.tsx apps/web/src/pages/flow/roster/WeekBoard.test.tsx
git commit -m "feat(flow): seed demo roster and land on that week"
```

---

### Task 2: Demo clock `FLOW_DEMO_DAY` (Kimi 2.7 Code)

**Files:**
- Modify: `apps/web/src/lib/footfall/api.ts`
- Modify: `apps/web/src/lib/footfall/api.test.ts`
- Modify: `apps/web/src/pages/flow/Overview.tsx`
- Modify: `apps/web/src/pages/flow/Overview.test.tsx`
- Modify: `apps/web/src/i18n/flowMessages.ts`

**Interfaces:**
- Consumes: current `hkToday` TZ body
- Produces: `FLOW_DEMO_DAY: string | null` (`'2026-09-16'`); `hkCalendarDay(now?: Date): string`; `hkToday()` returns the pin while it is set
- Day-scoped fetchers change second arg from `Date` to `day: string = hkToday()`: `fetchTodayHourly`, `fetchEntranceHourly`, `fetchTodayUnique`, `fetchWeekdayDistribution`
- `fetchJourney` already defaults to `hkToday()` — **do not** special-case it. Pin covers Journey.
- Do **not** add `resolveDemoDay`. Do **not** seed 2026-09-17.
- Drill pages (Entrances/Compare/Audience) keep calling `hkToday()` / default fetchers. No extra resolve effect.

- [ ] **Step 1: Write failing clock tests**

In `apps/web/src/lib/footfall/api.test.ts`, import `FLOW_DEMO_DAY`, `hkCalendarDay`, `hkToday`. Replace the existing `hkToday` TZ describe with:

```ts
describe('demo clock', () => {
  it('FLOW_DEMO_DAY is the last seeded footfall day', () => {
    expect(FLOW_DEMO_DAY).toBe('2026-09-16')
  })

  it('hkToday ignores wall-clock Date while the pin is on', () => {
    expect(hkToday(new Date('2026-10-01T04:00:00Z'))).toBe('2026-09-16')
    expect(hkToday()).toBe('2026-09-16')
  })

  it('hkCalendarDay still uses Asia/Hong_Kong', () => {
    expect(hkCalendarDay(new Date('2026-09-15T15:59:00Z'))).toBe('2026-09-15')
    expect(hkCalendarDay(new Date('2026-09-15T16:00:00Z'))).toBe('2026-09-16')
  })
})
```

Keep `hkDayBounds` / `hkMonthBounds` tests as they are.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/footfall/api.test.ts` from `apps/web`

Expected: FAIL — `FLOW_DEMO_DAY` / `hkCalendarDay` not exported; existing `hkToday` TZ assertions also fail once the pin lands (rewrite those in Step 1, do not keep both).

- [ ] **Step 3: Implement the pin**

Replace `hkToday` in `api.ts` with:

```ts
/** Pilot only. Set to null when live I.T. footfall exists. */
export const FLOW_DEMO_DAY: string | null = '2026-09-16'

export function hkCalendarDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function hkToday(now: Date = new Date()): string {
  if (FLOW_DEMO_DAY) return FLOW_DEMO_DAY
  return hkCalendarDay(now)
}
```

Change the four fetcher signatures to `day: string = hkToday()` (drop the `Date` second arg). Replace `const day = hkToday(now)` with the argument. Update tests that passed `new Date('2026-09-15T04:00:00Z')` into those fetchers to pass `'2026-09-15'` so column-contract tests stay date-specific.

`fetchJourney` already `day: string = hkToday()` — leave it.

- [ ] **Step 4: Run api tests**

Run: `npx vitest run src/lib/footfall/api.test.ts` from `apps/web`

Expected: PASS.

- [ ] **Step 5: Honesty copy**

In both locale maps of `flowMessages.ts`:

```ts
'overview.showingDay': '顯示樣本日 {day}',
// en:
'overview.showingDay': 'Showing sample day {day}',
```

`Overview.tsx` honesty `<p>`:

```tsx
<p data-testid="overview-honesty" style={{ marginTop: 16, fontSize: 12, color: 'var(--flow-muted)', lineHeight: 1.5 }}>
  {t('overview.honesty')}
  {FLOW_DEMO_DAY
    ? ` ${t('overview.showingDay').replace('{day}', FLOW_DEMO_DAY)}`
    : ''}
</p>
```

Import `FLOW_DEMO_DAY` from `@/lib/footfall/api`. Do **not** add resolve state or extra fetches. Loaders stay `fetchTodayHourly(branchId)` etc.

Overview test mock must export `FLOW_DEMO_DAY: '2026-09-16'` and `hkToday: () => '2026-09-16'`. Extend the existing honesty assertion:

```ts
expect(screen.getByTestId('overview-honesty')).toHaveTextContent('顯示樣本日 2026-09-16')
```

Compare/Audience/Entrances already mock `hkToday: () => '2026-09-16'` — they keep working. Do not add `resolveDemoDay` to those mocks.

- [ ] **Step 6: Run page tests**

From `apps/web`:

```
npx vitest run src/pages/flow/Overview.test.tsx src/pages/flow/Entrances.test.tsx src/pages/flow/Compare.test.tsx src/pages/flow/Audience.test.tsx src/pages/flow/Journey.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```
git add apps/web/src/lib/footfall/api.ts apps/web/src/lib/footfall/api.test.ts apps/web/src/pages/flow/Overview.tsx apps/web/src/pages/flow/Overview.test.tsx apps/web/src/i18n/flowMessages.ts
git commit -m "feat(flow): pin pilot clock to last seeded day"
```

---
### Task 3: Extract `shell/pilot-v1` + CSS split (DeepSeek 4.1 Flash)

**Files:**
- Create: `apps/web/src/shell/nav.ts`
- Create: `apps/web/src/shell/pilot-v1/FlowShell.tsx`
- Create: `apps/web/src/shell/pilot-v1/shell.css`
- Create: `apps/web/src/styles/flow-surfaces.css`
- Modify: `apps/web/src/styles/flow.css` (aggregator only)
- Modify: `apps/web/src/components/flow/FlowShell.tsx` (shim)
- Modify: `apps/web/src/components/flow/FlowShell.test.tsx`

**Interfaces:**
- Consumes: current `FlowShell.tsx` + `flow.css`
- Produces: `FLOW_NAV` (see code). Visual **unchanged** this task (navy tokens stay). T4 restyles.

- [ ] **Step 1: Write failing nav-contract test**

Add to `FlowShell.test.tsx`:

```ts
test('settings link is labeled and points at /flow/settings', async () => {
  renderShell()
  expect(await screen.findByRole('link', { name: '設定' })).toHaveAttribute(
    'href',
    '/flow/settings',
  )
})
```

This already passes against the old JSX. Keep it as the extract regression lock.

- [ ] **Step 2: Create `shell/nav.ts`**

```ts
export type FlowNavItem = {
  to: string
  labelKey: string
  end?: boolean
}

export type FlowNavGroup = {
  groupKey: string
  items: FlowNavItem[]
}

export const FLOW_NAV: FlowNavGroup[] = [
  {
    groupKey: 'nav.overview',
    items: [
      { to: '/flow', labelKey: 'nav.overview', end: true },
      { to: '/flow/journey', labelKey: 'nav.journey' },
      { to: '/flow/entrances', labelKey: 'nav.entrances' },
      { to: '/flow/audience', labelKey: 'nav.audience' },
      { to: '/flow/compare', labelKey: 'nav.compare' },
      { to: '/flow/holidays', labelKey: 'nav.holidays' },
    ],
  },
  {
    groupKey: 'nav.roster',
    items: [
      { to: '/flow/roster', labelKey: 'nav.roster' },
      { to: '/flow/roster/staff', labelKey: 'nav.rosterStaff' },
      { to: '/flow/roster/templates', labelKey: 'nav.rosterTemplates' },
      { to: '/flow/roster/policies', labelKey: 'nav.rosterPolicies' },
      { to: '/flow/roster/swaps', labelKey: 'nav.rosterSwaps' },
      { to: '/flow/roster/audit', labelKey: 'nav.rosterAudit' },
    ],
  },
  {
    groupKey: 'nav.settings',
    items: [
      { to: '/flow/devices', labelKey: 'nav.devices' },
      { to: '/flow/settings', labelKey: 'nav.settings' },
    ],
  },
]
```

- [ ] **Step 3: Move chrome CSS**

Copy **unchanged** from `apps/web/src/styles/flow.css`:

- Lines 1–236 (through `.flow-gate-loading`) → `apps/web/src/shell/pilot-v1/shell.css`
- Lines 238–1007 (roster board through `.flow-heat--compact .flow-heat-label`) → `apps/web/src/styles/flow-surfaces.css`

Replace `apps/web/src/styles/flow.css` with:

```css
/* Compatibility aggregator. Chrome lives in shell/pilot-v1; surfaces stay here. */
@import '../shell/pilot-v1/shell.css';
@import './flow-surfaces.css';
```

Do **not** rename classes. Do **not** change hex yet.

- [ ] **Step 4: Move FlowShell**

Create `apps/web/src/shell/pilot-v1/FlowShell.tsx`:

```tsx
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useFlowAuth } from '@/context/FlowAuthContext'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import { FLOW_NAV } from '@/shell/nav'

export function FlowShell() {
  const { t, locale, setLocale } = useFlowLocale()
  const { profile, signOut } = useFlowAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/flow/login', { replace: true })
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'active' : undefined

  return (
    <div className="flow-app flow-shell">
      <nav className="flow-nav" aria-label="IFMP Retail">
        <div className="flow-nav-brand">
          {t('product.name')}
          <small>{t('product.subtitle')}</small>
        </div>

        {FLOW_NAV.map((group) => (
          <div key={group.groupKey}>
            <div className="flow-nav-group">{t(group.groupKey)}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={navClass}
              >
                {t(item.labelKey)}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="flow-main">
        <header className="flow-topbar">
          <span className="flow-topbar-site">{t('site.name')}</span>
          <div className="flow-topbar-actions">
            <button
              type="button"
              onClick={() => setLocale(locale === 'zh-HK' ? 'en' : 'zh-HK')}
              data-testid="flow-locale-toggle"
            >
              {locale === 'zh-HK' ? 'EN' : '中文'}
            </button>
            <span>{profile?.display_name}</span>
            <button type="button" onClick={handleSignOut} data-testid="flow-signout">
              {t('auth.signOut')}
            </button>
          </div>
        </header>
        <main className="flow-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

Replace `apps/web/src/components/flow/FlowShell.tsx` with:

```tsx
import '@/styles/flow.css'
export { FlowShell } from '@/shell/pilot-v1/FlowShell'
```

`App.tsx` keeps `import { FlowShell } from '@/components/flow/FlowShell'`. Tests keep importing from `./FlowShell`.

- [ ] **Step 5: Run shell + a surface test**

From `apps/web`:

```
npx vitest run src/components/flow/FlowShell.test.tsx src/pages/flow/roster/WeekBoard.test.tsx src/pages/flow/Overview.test.tsx
```

Expected: PASS (CSS split must not break roster/heatmap class names).

- [ ] **Step 6: Commit**

```
git add apps/web/src/shell apps/web/src/styles/flow.css apps/web/src/styles/flow-surfaces.css apps/web/src/components/flow/FlowShell.tsx apps/web/src/components/flow/FlowShell.test.tsx
git commit -m "refactor(flow): extract deletable pilot-v1 shell"
```

---

### Task 4: Light default + night toggle (Kimi 2.7 Code)

**Files:**
- Create: `apps/web/src/context/FlowThemeContext.tsx`
- Create: `apps/web/src/context/FlowThemeContext.test.tsx`
- Modify: `apps/web/src/shell/pilot-v1/shell.css`
- Modify: `apps/web/src/shell/pilot-v1/FlowShell.tsx`
- Modify: `apps/web/src/pages/flow/Login.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/i18n/flowMessages.ts`
- Modify: `apps/web/src/components/flow/FlowShell.test.tsx`

**Interfaces:**
- Consumes: Phase 5 spec §6.3 token table **and** `docs/superpowers/specs/2026-09-16-ifmp-flow-pilot-v1-chrome-design.md` (type, 208px, 52px topbar, 900px, bans)
- Produces: `FlowTheme = 'light' | 'night'`; `useFlowTheme(): { theme: FlowTheme; setTheme: (t: FlowTheme) => void }`; storage key **`flow-theme`**
- Must **not** add Inter, `#38BDF8`, omnibox, inspector, timeline, `overflow: hidden` on `.flow-app`

- [ ] **Step 1: Failing theme-context test**

`apps/web/src/context/FlowThemeContext.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test } from 'vitest'
import { FlowThemeProvider, useFlowTheme } from './FlowThemeContext'

afterEach(() => {
  localStorage.removeItem('flow-theme')
})

function Probe() {
  const { theme, setTheme } = useFlowTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button type="button" onClick={() => setTheme('night')}>
        night
      </button>
    </div>
  )
}

test('defaults to light and persists night', async () => {
  const user = userEvent.setup()
  render(
    <FlowThemeProvider>
      <Probe />
    </FlowThemeProvider>,
  )
  expect(screen.getByTestId('theme')).toHaveTextContent('light')
  await user.click(screen.getByText('night'))
  expect(screen.getByTestId('theme')).toHaveTextContent('night')
  expect(localStorage.getItem('flow-theme')).toBe('night')
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/context/FlowThemeContext.test.tsx` from `apps/web`

Expected: FAIL — module missing.

- [ ] **Step 3: Implement context**

```tsx
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type FlowTheme = 'light' | 'night'

const STORAGE_KEY = 'flow-theme'

function readInitialTheme(): FlowTheme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'night') return saved
  } catch {
    // storage unavailable
  }
  return 'light'
}

type FlowThemeContextValue = {
  theme: FlowTheme
  setTheme: (theme: FlowTheme) => void
}

const FlowThemeContext = createContext<FlowThemeContextValue | null>(null)

export function FlowThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<FlowTheme>(readInitialTheme)

  const setTheme = useCallback((next: FlowTheme) => {
    setThemeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore persistence failure
    }
  }, [])

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])
  return (
    <FlowThemeContext.Provider value={value}>{children}</FlowThemeContext.Provider>
  )
}

export function useFlowTheme(): FlowThemeContextValue {
  const ctx = useContext(FlowThemeContext)
  if (!ctx) throw new Error('useFlowTheme must be used within FlowThemeProvider')
  return ctx
}
```

- [ ] **Step 4: Replace tokens + density in `shell.css`**

Replace the `.flow-app { --flow-*: ...; font-family: 'Inter', ... }` block with:

```css
.flow-app,
.flow-app[data-theme='light'] {
  --flow-bg: #f3f5f8;
  --flow-panel: #ffffff;
  --flow-panel-2: #eef1f6;
  --flow-line: #d5dce8;
  --flow-text: #1c2333;
  --flow-muted: #5c6b82;
  --flow-accent: #2563eb;
  --flow-accent-soft: rgba(37, 99, 235, 0.12);
  --flow-danger: #dc2626;

  min-height: 100vh;
  background: var(--flow-bg);
  color: var(--flow-text);
  font-family: "Segoe UI", "Noto Sans TC", "Microsoft JhengHei", system-ui, sans-serif;
  font-size: 13px;
  overflow: auto;
}

.flow-app[data-theme='night'] {
  --flow-bg: #0d1220;
  --flow-panel: #151c2e;
  --flow-panel-2: #1b2438;
  --flow-line: #2a3550;
  --flow-text: #e8ecf5;
  --flow-muted: #93a0b8;
  --flow-accent: #3b82f6;
  --flow-accent-soft: rgba(59, 130, 246, 0.16);
  --flow-danger: #e5534b;
}
```

Keep `.flow-shell` flex rules. Change `.flow-nav { width: 232px` to `width: 208px`. Append:

```css
@media (max-width: 900px) {
  .flow-shell {
    flex-direction: column;
  }
  .flow-nav {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    border-right: none;
    border-bottom: 1px solid var(--flow-line);
  }
  .flow-nav-brand {
    width: 100%;
  }
  .flow-nav-group {
    display: none;
  }
  .flow-nav a {
    padding: 6px 10px;
    font-size: 12px;
  }
}
```

Do not restyle `.roster-*` or `.flow-heat-*` in this task. Do not add omnibox, inspector, timeline, Inter, or `#38BDF8`.

Set `.flow-nav a { font-size: 13px }` (already). `.flow-topbar { height: 52px }` stay. `.flow-content h1 { font-size: 20px; font-weight: 600 }` for Settings.

Grep `apps/web/src` for `#0d1220` outside `pilot-v1/shell.css` and replace leftover navy hex in chrome-only files if any. Leave heatmap label `#fff` / `#1a1a1a` (those are surface).

From repo root after CSS lands:

```
rg "Inter|38BDF8|0B0F17|overflow:\\s*hidden" apps/web/src/shell/pilot-v1
```

Expected: no Inter, no Sky, no Downloads canvas hex, no overflow hidden on the shell.

- [ ] **Step 5: Apply `data-theme` + topbar toggle**

`App.tsx`: wrap `/flow` providers:

```tsx
<FlowLocaleProvider>
  <FlowThemeProvider>
    <FlowAuthProvider>
      <Outlet />
    </FlowAuthProvider>
  </FlowThemeProvider>
</FlowLocaleProvider>
```

Import `FlowThemeProvider` from `@/context/FlowThemeContext`.

`pilot-v1/FlowShell.tsx`: `const { theme, setTheme } = useFlowTheme()` and:

```tsx
<div className="flow-app flow-shell" data-theme={theme} data-testid="flow-app">
```

In `.flow-topbar-actions`, **before** the locale button:

```tsx
<button
  type="button"
  onClick={() => setTheme(theme === 'light' ? 'night' : 'light')}
  data-testid="flow-theme-toggle"
>
  {theme === 'light' ? t('settings.theme.night') : t('settings.theme.light')}
</button>
```

Add i18n now so the button is not zh-hardcoded (full Settings copy lands in T5; these four keys are required here):

```ts
'settings.theme.light': '淺色',
'settings.theme.night': '夜間',
// en:
'settings.theme.light': 'Light',
'settings.theme.night': 'Night',
```

`Login.tsx`: `const { theme } = useFlowTheme()` and `className="flow-app flow-login"` plus `data-theme={theme}`.

`FlowShell.test.tsx` wrap `renderShell` with `FlowThemeProvider` (and `Login.test.tsx` if it renders `.flow-app` without the App providers — Login tests already wrap `FlowLocaleProvider` + `FlowAuthProvider`; add `FlowThemeProvider` there too).

Add:

```ts
test('theme toggle sets data-theme night and localStorage', async () => {
  const user = userEvent.setup()
  localStorage.removeItem('flow-theme')
  renderShell()
  const root = await screen.findByTestId('flow-app')
  expect(root).toHaveAttribute('data-theme', 'light')
  await user.click(screen.getByTestId('flow-theme-toggle'))
  expect(root).toHaveAttribute('data-theme', 'night')
  expect(localStorage.getItem('flow-theme')).toBe('night')
})
```

- [ ] **Step 6: Run tests**

From `apps/web`:

```
npx vitest run src/context/FlowThemeContext.test.tsx src/components/flow/FlowShell.test.tsx src/pages/flow/Login.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```
git add apps/web/src/context/FlowThemeContext.tsx apps/web/src/context/FlowThemeContext.test.tsx apps/web/src/shell/pilot-v1/shell.css apps/web/src/shell/pilot-v1/FlowShell.tsx apps/web/src/pages/flow/Login.tsx apps/web/src/pages/flow/Login.test.tsx apps/web/src/App.tsx apps/web/src/i18n/flowMessages.ts apps/web/src/components/flow/FlowShell.test.tsx
git commit -m "feat(flow): light Operate chrome with night toggle"
```

---

### Task 5: Settings page (DeepSeek 4.1 Flash)

**Files:**
- Create: `apps/web/src/pages/flow/Settings.tsx`
- Create: `apps/web/src/pages/flow/Settings.test.tsx`
- Modify: `apps/web/src/App.tsx` (explicit route before splat)
- Modify: `apps/web/src/i18n/flowMessages.ts`
- Modify: `apps/web/src/styles/flow-surfaces.css` (`.settings-page` only)

**Interfaces:**
- Consumes: `useFlowTheme`, `useFlowLocale`, `t('site.name')`
- Produces: `/flow/settings` page. Must **not** import `@/shell/pilot-v1/*`

- [ ] **Step 1: i18n keys** (both locales)

```ts
// zh-HK
'settings.title': '設定',
'settings.theme': '外觀',
'settings.language': '語言',
'settings.branch': '分店',
'settings.honesty': '流量為示例（匿名同級店舖）。排班員工與平面圖均為示範資料，並非 I.T. 實時人事或攝像。',

// en
'settings.title': 'Settings',
'settings.theme': 'Appearance',
'settings.language': 'Language',
'settings.branch': 'Branch',
'settings.honesty': 'Traffic is sample (anonymized comparable store). Roster staff and the floor plan are demo data, not live I.T. HR or cameras.',
```

`settings.theme.light` / `night` already exist from T4.

- [ ] **Step 2: Failing Settings test**

`Settings.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
import { FlowThemeProvider } from '@/context/FlowThemeContext'
import { SettingsPage } from './Settings'

vi.mock('@/context/FlowAuthContext', () => ({
  useFlowAuth: () => ({
    profile: { display_name: 'Pilot Manager', role: 'branch_manager' },
  }),
}))

afterEach(() => {
  localStorage.removeItem('flow-theme')
  localStorage.removeItem('ifmp_flow_locale')
})

function renderPage() {
  return render(
    <FlowLocaleProvider>
      <FlowThemeProvider>
        <SettingsPage />
      </FlowThemeProvider>
    </FlowLocaleProvider>,
  )
}

test('theme radios write flow-theme and keep branch read-only', async () => {
  const user = userEvent.setup()
  renderPage()
  expect(screen.getByRole('heading', { name: '設定' })).toBeInTheDocument()
  expect(screen.getByText('I.T. 銅鑼灣')).toBeInTheDocument()
  await user.click(screen.getByRole('radio', { name: '夜間' }))
  expect(localStorage.getItem('flow-theme')).toBe('night')
  expect(screen.getByTestId('settings-honesty')).toBeInTheDocument()
})
```

- [ ] **Step 3: Run to verify fail**

Run: `npx vitest run src/pages/flow/Settings.test.tsx` from `apps/web`

Expected: FAIL — `SettingsPage` missing.

- [ ] **Step 4: Implement the page**

```tsx
import { useFlowLocale } from '@/context/FlowLocaleContext'
import { useFlowTheme, type FlowTheme } from '@/context/FlowThemeContext'

export function SettingsPage() {
  const { t, locale, setLocale } = useFlowLocale()
  const { theme, setTheme } = useFlowTheme()

  return (
    <div className="settings-page">
      <h1>{t('settings.title')}</h1>

      <section>
        <h2>{t('settings.theme')}</h2>
        {(['light', 'night'] as FlowTheme[]).map((value) => (
          <label key={value}>
            <input
              type="radio"
              name="flow-theme"
              value={value}
              checked={theme === value}
              onChange={() => setTheme(value)}
            />
            {t(`settings.theme.${value}`)}
          </label>
        ))}
      </section>

      <section>
        <h2>{t('settings.language')}</h2>
        <button
          type="button"
          onClick={() => setLocale(locale === 'zh-HK' ? 'en' : 'zh-HK')}
          data-testid="settings-locale-toggle"
        >
          {locale === 'zh-HK' ? 'EN' : '中文'}
        </button>
      </section>

      <section>
        <h2>{t('settings.branch')}</h2>
        <p>{t('site.name')}</p>
      </section>

      <p data-testid="settings-honesty">{t('settings.honesty')}</p>
    </div>
  )
}
```

Append to `flow-surfaces.css`:

```css
.settings-page {
  max-width: 560px;
}
.settings-page h1 {
  font-size: 20px;
  margin: 0 0 20px;
}
.settings-page h2 {
  font-size: 13px;
  color: var(--flow-muted);
  margin: 20px 0 8px;
}
.settings-page section label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-right: 16px;
  min-height: 32px;
}
.settings-page [data-testid='settings-honesty'] {
  margin-top: 24px;
  font-size: 12px;
  color: var(--flow-muted);
  line-height: 1.5;
}
```

In `App.tsx` add with the other flow page imports and **before** the splat route:

```tsx
import { SettingsPage as FlowSettingsPage } from '@/pages/flow/Settings'
// ...
<Route path="settings" element={<FlowSettingsPage />} />
<Route path="*" element={<FlowStubPage />} />
```

- [ ] **Step 5: Run tests**

```
npx vitest run src/pages/flow/Settings.test.tsx src/components/flow/FlowShell.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```
git add apps/web/src/pages/flow/Settings.tsx apps/web/src/pages/flow/Settings.test.tsx apps/web/src/App.tsx apps/web/src/i18n/flowMessages.ts apps/web/src/styles/flow-surfaces.css
git commit -m "feat(flow): settings page for theme language and honesty"
```

---

### Task 6: Guard, tsc, browser smoke (Kimi 2.7 Code)

**Files:**
- Create: `docs/flow-pilot-phase5.md`
- No product code unless a smoke defect is in this phase’s files

- [ ] **Step 1: Import guard**

From repo root (PowerShell):

```
rg "from '@/shell/pilot-v1'" apps/web/src/pages apps/web/src/lib
rg "Inter|38BDF8|0B0F17" apps/web/src/shell/pilot-v1
```

Expected: no matches.

Also:

```
rg "优衣库|Uniqlo" apps/web/src supabase/migrations/20260916000009_flow_roster_demo_seed.sql
```

Expected: no product matches (comments in this plan/spec are docs only).

`/retail` must be untouched (`git diff -- apps/web/src/pages/retail apps/web/src/retail.css` empty for this phase).

- [ ] **Step 2: Typecheck + unit**

From `apps/web`:

```
npx tsc --noEmit
npx vitest run src/lib/roster/api.test.ts src/lib/footfall/api.test.ts src/pages/flow/Overview.test.tsx src/pages/flow/Settings.test.tsx src/components/flow/FlowShell.test.tsx src/pages/flow/roster/WeekBoard.test.tsx
```

`tsc` may still warn TS5101 `baseUrl` deprecated — pre-existing, ignore. New errors in phase files = fail.

Known pre-existing: `Templates.test` 5s timeout. Do not “fix” it in this phase.

- [ ] **Step 3: Browser smoke**

Vite: `apps/web` `npm run dev` on **5174**. Login DongQia manager (credentials stay out of git).

Path:

1. `/flow` — widgets show numbers (or honesty includes `顯示樣本日 2026-09-16`). Compact heatmap still inside shop walls.
2. `/flow/journey` — heat inside walls; name boxes black text. Demo clock makes this the 2026-09-16 seed, not empty.
3. `/flow/roster` — grid has 陳嘉欣 / 林子軒 / stations 樓面 試衣 收銀. Not an empty auto-created week. Soft badges OK; publish on the **draft** week must not be blocked by hard conflicts.
4. `/flow/roster/swaps` — one pending row.
5. `/flow/roster/staff` — 8 names.
6. `/flow/settings` — Light / Night radios; Night paints navy tokens; Light returns paper. Locale EN shows I.T. Causeway Bay.
7. Resize &lt; 900px — nav becomes a horizontal chip row; Overview still reachable.

Write `docs/flow-pilot-phase5.md` with that checklist and the seed UUID table (employees `...001`–`...008`, weeks `...021` / `...022`, swap `...031`).

- [ ] **Step 4: Commit**

```
git add docs/flow-pilot-phase5.md
git commit -m "docs(flow): phase 5 pilot-close smoke checklist"
```

If smoke found a defect in phase files, fix + commit that fix **before** the docs commit (`fix(flow): ...`).

---

## Self-review (plan vs spec)

| Spec | Task |
|------|------|
| §4 roster seed 8/6/2/policies/availability/swap, no audit fake, UTF-8 stations | T1 |
| §4.5 landing week | T1 `pickRosterWeekStart` |
| §5 demo clock `FLOW_DEMO_DAY = 2026-09-16`; Journey follows `hkToday()` | T2 |
| §6.1–6.2 extract + nav.ts + aggregator + shim | T3 |
| §6.3 tokens, 208px, no Inter, 900px chips | T4 |
| Chrome design spec (density in, camera chrome out) | T4 |
| §6.1 theme context not in pilot-v1 | T4 `FlowThemeContext` |
| §6.4 Settings | T5 |
| §7 quality + honesty + `/retail` untouched | T6 |
| Join / command palette / icon-only 56px / `/retail` restyle / inspector / timeline | out — no task |

No TBD. Types: `FlowTheme`, `FLOW_NAV` used consistently. `fetchTodayHourly` second arg is `string` after T2 (tests updated). `hkToday()` pinned via `FLOW_DEMO_DAY`.
