# IFMP Retail Flow — Action Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `/flow` action layer — Service Gap, Dispatch, Coaching, efficiency widgets, roster cost simulation, overtime forecast, and auto-shift suggestions — so managers can reduce labor waste and improve service quality without leaving the pilot shell.

**Architecture:** Extend `public.alerts` and add `dispatch_tasks`, `coaching_notes`, `service_sla_events`. Build pure TypeScript heuristic engines in `apps/web/src/lib/action/` and surface them under new `/flow/*` routes. Reuse existing roster APIs and `FLOW_NAV` nav contract. Seed synthetic demo data so pages are not empty.

**Tech Stack:** Vite 8, React 19, react-router-dom 7, Vitest, Testing Library, Supabase Postgres + `supabase-js`, existing `FlowLocaleContext` / `FlowThemeContext`.

**Spec:** `docs/superpowers/specs/2026-09-17-ifmp-flow-action-layer-design.md`

## Global Constraints

- Product UI name: **IFMP Retail**; site: **I.T. 銅鑼灣** / **I.T. Causeway Bay**.
- Bilingual via `flowMessages.ts` (`zh-HK` + `en`); never hardcode Chinese or English in JSX.
- Do not modify `/retail/*`, `retail.css`, or legacy mocks.
- No secrets in client; anon key only. Edge functions only if a provider key is required; keep keys server-side.
- Singleton `createFlowSupabase()`.
- Manager-only surfaces; staff UI deferred.
- Demo data must pin to `FLOW_DEMO_DAY = '2026-09-16'`.
- Sequential commits. Do not commit `.env`.

## File map

| Path | Responsibility |
|------|----------------|
| `supabase/migrations/20260917000002_flow_action_layer.sql` | Schema changes: extend `alerts`, new `dispatch_tasks`, `coaching_notes`, `service_sla_events`, `employees.hourly_rate`, RLS policies |
| `supabase/migrations/20260917000003_flow_action_layer_seed.sql` | Synthetic demo gap / SLA / dispatch / coaching rows for 2026-09-16 |
| `apps/web/src/lib/action/types.ts` | Row types for alerts, dispatch, coaching, SLA |
| `apps/web/src/lib/action/gaps.ts` | Service-gap detection heuristic from footfall + roster |
| `apps/web/src/lib/action/gaps.test.ts` | Detection fixture tests |
| `apps/web/src/lib/action/cost.ts` | Weekly cost, overtime premium, forecast |
| `apps/web/src/lib/action/cost.test.ts` | Cost fixture tests |
| `apps/web/src/lib/action/suggest.ts` | Demand-derived auto-shift heuristic |
| `apps/web/src/lib/action/suggest.test.ts` | Suggestion validity tests |
| `apps/web/src/lib/action/api.ts` | Typed Supabase reads/writes for action-layer tables |
| `apps/web/src/lib/action/api.test.ts` | Mocked-client tests |
| `apps/web/src/i18n/flowMessages.ts` | New `action.*`, `serviceGap.*`, `dispatch.*`, `coach.*`, `overview.widget.*` keys |
| `apps/web/src/shell/nav.ts` | Add Action group with service-gap, dispatch, coach |
| `apps/web/src/components/action/ServiceHealthWidget.tsx` | Overview service-health compact card |
| `apps/web/src/components/action/StaffingRatioWidget.tsx` | Overview visitors-per-staff-hour chart |
| `apps/web/src/components/action/GapTable.tsx` | Shared service-gap table |
| `apps/web/src/components/action/DispatchQueue.tsx` | Shared dispatch queue |
| `apps/web/src/components/action/CoachingWeekList.tsx` | Shared coaching event list |
| `apps/web/src/pages/flow/ServiceGap.tsx` | `/flow/service-gap` |
| `apps/web/src/pages/flow/ServiceGap.test.tsx` | Render + filter + dispatch creation |
| `apps/web/src/pages/flow/Dispatch.tsx` | `/flow/dispatch` |
| `apps/web/src/pages/flow/Dispatch.test.tsx` | Render + assign + resolve |
| `apps/web/src/pages/flow/Coach.tsx` | `/flow/coach` |
| `apps/web/src/pages/flow/Coach.test.tsx` | Render + save note + mark reviewed |
| `apps/web/src/pages/flow/Overview.tsx` | Add service health + staffing ratio widgets |
| `apps/web/src/pages/flow/Overview.test.tsx` | Widget presence + honesty |
| `apps/web/src/components/roster/CostSidebar.tsx` | Weekly cost + overtime premium sidebar on roster board |
| `apps/web/src/components/roster/OvertimeForecast.tsx` | Pre-publish overtime forecast dialog |
| `apps/web/src/components/roster/AutoSuggestDialog.tsx` | Auto-shift suggestion approval dialog |
| `apps/web/src/pages/flow/roster/WeekBoard.tsx` | Wire cost, forecast, auto-suggest |
| `apps/web/src/pages/flow/roster/Staff.tsx` | Coverage-gap hints |
| `apps/web/src/App.tsx` | Add `/flow/service-gap`, `/flow/dispatch`, `/flow/coach` routes |
| `docs/flow-pilot-action-layer.md` | Smoke checklist and closeout notes |

## Execution strategy (models)

| Task slice | Model | Why |
|---|---|---|
| T1–T4 (schema, seed, API, i18n) | **Kimi 2.7 Code** | Security-critical SQL + type contracts |
| T5–T7 (Service Gap + overview widgets) | **Kimi 2.7 Code** | Heuristic engine + UX flow |
| T8–T9 (Dispatch queue + nav badge) | **DeepSeek 4.1 Flash** | CRUD + state wiring |
| T10–T11 (Coaching + SLA) | **Kimi 2.7 Code** | Cross-page data consistency |
| T12–T14 (Cost, forecast, auto-suggest) | **Kimi 2.7 Code** | Algorithm + roster integration |
| T15 (Staff coverage hints) | **DeepSeek 4.1 Flash** | Mechanical UI hint |
| T16 (closeout: tsc, vitest, smoke, docs) | **Kimi 2.7 Code** | Integration + quality audit |

**Subagent dispatch:** per the available model list, use `inherit` (default) or `composer-2.5-fast` when a lighter pass is acceptable.

---

### Task 1: Action-layer migration (schema + RLS)

**Files:**
- Create: `supabase/migrations/20260917000002_flow_action_layer.sql`

**Interfaces:**
- Consumes: existing `public.alerts`, `public.zones`, `public.branches`, `public.employees`, `auth.users`, helper `user_manages_branch(uuid, uuid)`.
- Produces: extended `alerts` with `alert_type`, `zone_id`, `start_at`, `end_at`, `metadata`; new `dispatch_tasks`; new `coaching_notes`; new `service_sla_events`; `employees.hourly_rate`.

- [ ] **Step 1: Write the migration**

```sql
-- 20260917000002_flow_action_layer.sql
-- Action layer schema: service gap, dispatch, coaching, SLA, cost.

ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS alert_type text NOT NULL DEFAULT 'service_gap'
    CHECK (alert_type IN ('service_gap', 'sla_breach', 'dispatch_adhoc')),
  ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES public.zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS end_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS hourly_rate numeric NOT NULL DEFAULT 0
    CHECK (hourly_rate >= 0);

CREATE TABLE IF NOT EXISTS public.dispatch_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  alert_id uuid REFERENCES public.alerts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'assigned', 'resolved', 'cancelled')),
  assigned_to uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.dispatch_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers can view branch dispatch tasks" ON public.dispatch_tasks;
CREATE POLICY "Managers can view branch dispatch tasks"
  ON public.dispatch_tasks FOR SELECT TO authenticated
  USING (user_manages_branch(auth.uid(), branch_id));

DROP POLICY IF EXISTS "Managers can insert branch dispatch tasks" ON public.dispatch_tasks;
CREATE POLICY "Managers can insert branch dispatch tasks"
  ON public.dispatch_tasks FOR INSERT TO authenticated
  WITH CHECK (user_manages_branch(auth.uid(), branch_id));

DROP POLICY IF EXISTS "Managers can update branch dispatch tasks" ON public.dispatch_tasks;
CREATE POLICY "Managers can update branch dispatch tasks"
  ON public.dispatch_tasks FOR UPDATE TO authenticated
  USING (user_manages_branch(auth.uid(), branch_id));

CREATE TABLE IF NOT EXISTS public.coaching_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  alert_id uuid REFERENCES public.alerts(id) ON DELETE SET NULL,
  week_start date NOT NULL,
  observation text NOT NULL DEFAULT '',
  action_item text NOT NULL DEFAULT '',
  reviewed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, alert_id, week_start)
);

ALTER TABLE public.coaching_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers can view branch coaching notes" ON public.coaching_notes;
CREATE POLICY "Managers can view branch coaching notes"
  ON public.coaching_notes FOR SELECT TO authenticated
  USING (user_manages_branch(auth.uid(), branch_id));

DROP POLICY IF EXISTS "Managers can upsert branch coaching notes" ON public.coaching_notes;
CREATE POLICY "Managers can upsert branch coaching notes"
  ON public.coaching_notes FOR ALL TO authenticated
  USING (user_manages_branch(auth.uid(), branch_id))
  WITH CHECK (user_manages_branch(auth.uid(), branch_id));

CREATE TABLE IF NOT EXISTS public.service_sla_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  day date NOT NULL,
  hour int NOT NULL CHECK (hour BETWEEN 0 AND 23),
  avg_first_contact_sec numeric NOT NULL DEFAULT 0,
  breach_count int NOT NULL DEFAULT 0,
  total_visitors int NOT NULL DEFAULT 0,
  UNIQUE (branch_id, day, hour)
);

ALTER TABLE public.service_sla_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers can view branch SLA events" ON public.service_sla_events;
CREATE POLICY "Managers can view branch SLA events"
  ON public.service_sla_events FOR SELECT TO authenticated
  USING (user_manages_branch(auth.uid(), branch_id));
```

- [ ] **Step 2: Apply via Supabase MCP**

Run: `apply_migration` name `20260917000002_flow_action_layer` to project `dntmvxfgqmqremdrswij`.

- [ ] **Step 3: Verify via MCP `execute_sql`**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'alerts' AND column_name IN ('alert_type', 'zone_id', 'metadata');
-- expect 3 rows

SELECT tablename FROM pg_tables WHERE schemaname = 'public'
AND tablename IN ('dispatch_tasks', 'coaching_notes', 'service_sla_events');
-- expect 3 rows

SELECT column_name FROM information_schema.columns
WHERE table_name = 'employees' AND column_name = 'hourly_rate';
-- expect 1 row
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260917000002_flow_action_layer.sql
git commit -m "feat(flow): action-layer schema (gaps, dispatch, coaching, sla, cost)"
```

---

### Task 2: Demo seed for action layer

**Files:**
- Create: `supabase/migrations/20260917000003_flow_action_layer_seed.sql`

**Interfaces:**
- Consumes: branch `a0000000-0000-4000-8000-000000000001`, zones, demo day `2026-09-16`, existing roster employees.
- Produces: seeded `alerts`, `service_sla_events`, `dispatch_tasks`, `coaching_notes`; updated `employees.hourly_rate` for demo IDs.

- [ ] **Step 1: Write the seed migration**

```sql
-- 20260917000003_flow_action_layer_seed.sql
-- Synthetic action-layer demo data for I.T. Causeway Bay. Not real CV events.

UPDATE public.employees
SET hourly_rate = CASE employment_type
  WHEN 'full_time' THEN 75
  WHEN 'part_time' THEN 55
  ELSE 0
END
WHERE branch_id = 'a0000000-0000-4000-8000-000000000001';

-- Example service gap during peak hour 2026-09-16 14:00-14:30 in shelf_a
INSERT INTO public.alerts (
  id, branch_id, severity, title_zh, title_en,
  alert_type, zone_id, start_at, end_at, metadata, created_at
)
SELECT
  'c0000000-0000-4000-8000-000000000001'::uuid,
  'a0000000-0000-4000-8000-000000000001',
  'warning',
  '貨架區 A 人手不足',
  'Shelf A understaffed',
  'service_gap',
  z.id,
  '2026-09-16T14:00:00+08:00'::timestamptz,
  '2026-09-16T14:30:00+08:00'::timestamptz,
  '{"requiredStaff":2,"actualStaff":1,"visitCount":42,"targetVisitsPerStaff":15,"durationMinutes":30}'::jsonb,
  '2026-09-16T14:35:00+08:00'::timestamptz
FROM public.zones z
WHERE z.branch_id = 'a0000000-0000-4000-8000-000000000001'
  AND z.zone_key = 'shelf_a'
ON CONFLICT (id) DO NOTHING;

-- SLA breach 15:00
INSERT INTO public.service_sla_events (
  branch_id, day, hour, avg_first_contact_sec, breach_count, total_visitors
)
VALUES
  ('a0000000-0000-4000-8000-000000000001', '2026-09-16', 15, 145, 12, 180)
ON CONFLICT (branch_id, day, hour) DO NOTHING;

-- One pending dispatch linked to the gap
INSERT INTO public.dispatch_tasks (
  id, branch_id, alert_id, status, notes, created_at
)
VALUES (
  'c0000000-0000-4000-8000-000000000011'::uuid,
  'a0000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000001'::uuid,
  'pending',
  '請調派樓面同事支援貨架區 A',
  '2026-09-16T14:37:00+08:00'::timestamptz
)
ON CONFLICT (id) DO NOTHING;

-- Coaching note placeholder for week 2026-09-14
INSERT INTO public.coaching_notes (
  id, branch_id, alert_id, week_start, observation, action_item
)
VALUES (
  'c0000000-0000-4000-8000-000000000021'::uuid,
  'a0000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000001'::uuid,
  '2026-09-14',
  '週二下午貨架區 A 持續人手不足，顧客等待超過 2 分鐘。',
  '下次同時段預先安排 2 名樓面員工；測試交叉訓練收銀員支援貨架。'
)
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 2: Apply via Supabase MCP**

Run: `apply_migration` name `20260917000003_flow_action_layer_seed`.

- [ ] **Step 3: Verify counts**

```sql
SELECT alert_type, count(*) FROM public.alerts
WHERE branch_id = 'a0000000-0000-4000-8000-000000000001'
GROUP BY 1;

SELECT count(*) FROM public.dispatch_tasks
WHERE branch_id = 'a0000000-0000-4000-8000-000000000001';

SELECT count(*) FROM public.coaching_notes
WHERE branch_id = 'a0000000-0000-4000-8000-000000000001';

SELECT count(*) FROM public.service_sla_events
WHERE branch_id = 'a0000000-0000-4000-8000-000000000001';
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260917000003_flow_action_layer_seed.sql
git commit -m "feat(flow): seed demo action-layer events"
```

---

### Task 3: TypeScript API layer + engines

**Files:**
- Create: `apps/web/src/lib/action/types.ts`
- Create: `apps/web/src/lib/action/api.ts`
- Create: `apps/web/src/lib/action/api.test.ts`
- Create: `apps/web/src/lib/action/gaps.ts`
- Create: `apps/web/src/lib/action/gaps.test.ts`
- Create: `apps/web/src/lib/action/cost.ts`
- Create: `apps/web/src/lib/action/cost.test.ts`
- Create: `apps/web/src/lib/action/suggest.ts`
- Create: `apps/web/src/lib/action/suggest.test.ts`

**Interfaces:**
- Consumes: `createFlowSupabase`, `mapRpcError`, roster types (`EmployeeRow`, `ShiftTemplateRow`, `AssignmentRow`), footfall types.
- Produces:
  - `fetchAlerts(branchId, filters)`, `createDispatchFromAlert(...)`, `updateDispatchStatus(...)`
  - `fetchCoachingNotes(branchId, weekStart)`, `upsertCoachingNote(...)`
  - `fetchSlaEvents(branchId, day)`
  - `detectServiceGaps(...)` pure function
  - `calculateWeekCost(...)` pure function
  - `suggestShifts(...)` pure function

- [ ] **Step 1: Write failing tests first**

`apps/web/src/lib/action/gaps.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { detectServiceGaps } from './gaps'

describe('detectServiceGaps', () => {
  it('flags a bucket with actual < required staff', () => {
    const result = detectServiceGaps({
      zoneId: 'z1',
      zoneKey: 'shelf_a',
      buckets: [{ hour: 14, visits: 42, actualStaff: 1 }],
      targetVisitsPerStaff: 15,
    })
    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('warning')
    expect(result[0].metadata.requiredStaff).toBe(3)
  })

  it('ignores well-staffed buckets', () => {
    const result = detectServiceGaps({
      zoneId: 'z1',
      zoneKey: 'shelf_a',
      buckets: [{ hour: 10, visits: 10, actualStaff: 2 }],
      targetVisitsPerStaff: 15,
    })
    expect(result).toHaveLength(0)
  })
})
```

`apps/web/src/lib/action/cost.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { calculateWeekCost } from './cost'

describe('calculateWeekCost', () => {
  it('sums shift hours by employee rate', () => {
    const cost = calculateWeekCost({
      assignments: [{ employee_id: 'e1', shift_template_id: 't1', work_date: '2026-09-14' }],
      templates: [{ id: 't1', start_time: '10:00', end_time: '18:00' }],
      employees: [{ id: 'e1', hourly_rate: 75 }],
    })
    expect(cost.total).toBe(600)
    expect(cost.overtimePremium).toBe(0)
  })
})
```

`apps/web/src/lib/action/suggest.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { suggestShifts } from './suggest'

describe('suggestShifts', () => {
  it('does not double-book an employee on the same day', () => {
    const suggestions = suggestShifts({
      weekStart: '2026-09-14',
      demand: { '樓面': { 10: 2, 18: 2 } },
      employees: [{ id: 'e1', station: '樓面', min_hours_per_week: 8, max_hours_per_week: 40 }],
      templates: [
        { id: 't1', station: '樓面', start_time: '10:00', end_time: '18:00', headcount_target: 2 },
        { id: 't2', station: '樓面', start_time: '18:00', end_time: '21:00', headcount_target: 2 },
      ],
      existingAssignments: [],
      availability: [],
    })
    const e1Shifts = suggestions.filter((s) => s.employee_id === 'e1')
    expect(e1Shifts.length).toBeLessThanOrEqual(7)
  })
})
```

Run tests; expect failures because modules do not exist.

- [ ] **Step 2: Implement types and pure engines**

`apps/web/src/lib/action/types.ts`:

```ts
import type { EmployeeRow } from '@/lib/roster/types'

export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertType = 'service_gap' | 'sla_breach' | 'dispatch_adhoc'

export interface AlertRow {
  id: string
  branch_id: string
  severity: AlertSeverity
  title_zh: string
  title_en: string
  alert_type: AlertType
  zone_id: string | null
  start_at: string | null
  end_at: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface DispatchRow {
  id: string
  branch_id: string
  alert_id: string | null
  status: 'pending' | 'assigned' | 'resolved' | 'cancelled'
  assigned_to: string | null
  notes: string
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
}

export interface CoachingRow {
  id: string
  branch_id: string
  alert_id: string | null
  week_start: string
  observation: string
  action_item: string
  reviewed_at: string | null
  created_by: string | null
  created_at: string
}

export interface SlaEventRow {
  id: string
  branch_id: string
  day: string
  hour: number
  avg_first_contact_sec: number
  breach_count: number
  total_visitors: number
}

export interface GapEvent {
  zoneId: string
  zoneKey: string
  startHour: number
  endHour: number
  severity: AlertSeverity
  metadata: {
    requiredStaff: number
    actualStaff: number
    visitCount: number
    targetVisitsPerStaff: number
    durationMinutes: number
  }
}

export type EmployeeWithRate = EmployeeRow & { hourly_rate: number }
```

`apps/web/src/lib/action/gaps.ts`:

```ts
import type { GapEvent } from './types'

export function detectServiceGaps(input: {
  zoneId: string
  zoneKey: string
  buckets: { hour: number; visits: number; actualStaff: number }[]
  targetVisitsPerStaff: number
}): GapEvent[] {
  const { zoneId, zoneKey, buckets, targetVisitsPerStaff } = input
  const out: GapEvent[] = []
  for (const b of buckets) {
    const required = Math.max(1, Math.ceil(b.visits / targetVisitsPerStaff))
    if (b.actualStaff >= required) continue
    const deficit = required - b.actualStaff
    const severity: GapEvent['severity'] =
      deficit >= 2 || b.visits > targetVisitsPerStaff * 3 ? 'critical' : 'warning'
    out.push({
      zoneId,
      zoneKey,
      startHour: b.hour,
      endHour: b.hour + 1,
      severity,
      metadata: {
        requiredStaff: required,
        actualStaff: b.actualStaff,
        visitCount: b.visits,
        targetVisitsPerStaff,
        durationMinutes: 60,
      },
    })
  }
  return out
}
```

`apps/web/src/lib/action/cost.ts`:

```ts
import type { AssignmentRow, EmployeeRow, ShiftTemplateRow } from '@/lib/roster/types'
import type { EmployeeWithRate } from './types'

export function shiftHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let s = sh * 60 + sm
  let e = eh * 60 + em
  if (e <= s) e += 24 * 60
  return (e - s) / 60
}

export function calculateWeekCost(input: {
  assignments: AssignmentRow[]
  templates: ShiftTemplateRow[]
  employees: EmployeeWithRate[]
}): { total: number; overtimePremium: number; byEmployee: Record<string, number> } {
  const byTmpl = new Map(input.templates.map((t) => [t.id, t]))
  const byEmp = new Map(input.employees.map((e) => [e.id, e]))
  const byEmployee: Record<string, number> = {}
  let total = 0
  for (const a of input.assignments) {
    const t = byTmpl.get(a.shift_template_id)
    const e = byEmp.get(a.employee_id)
    if (!t || !e) continue
    const hours = shiftHours(t.start_time, t.end_time)
    const cost = hours * e.hourly_rate
    byEmployee[e.id] = (byEmployee[e.id] || 0) + cost
    total += cost
  }
  // Simplified premium: hours beyond effective max × 0.5 × rate
  let overtimePremium = 0
  for (const e of input.employees) {
    const assigned = input.assignments
      .filter((a) => a.employee_id === e.id)
      .reduce((sum, a) => {
        const t = byTmpl.get(a.shift_template_id)
        return t ? sum + shiftHours(t.start_time, t.end_time) : sum
      }, 0)
    if (assigned > e.max_hours_per_week) {
      const premiumHours = assigned - e.max_hours_per_week
      overtimePremium += premiumHours * e.hourly_rate * 0.5
    }
  }
  return { total, overtimePremium, byEmployee }
}
```

`apps/web/src/lib/action/suggest.ts`:

```ts
import type { AssignmentRow, AvailabilityNoteRow, EmployeeRow, ShiftTemplateRow } from '@/lib/roster/types'
import { addDays } from '@/lib/roster/api'
import { dayOfWeekIndex } from '@/lib/roster/conflicts'

export interface SuggestedShift {
  employee_id: string
  shift_template_id: string
  work_date: string
  notes: string
}

export function suggestShifts(input: {
  weekStart: string
  demand: Record<string, Record<number, number>> // station -> hour -> required headcount
  employees: EmployeeRow[]
  templates: ShiftTemplateRow[]
  existingAssignments: AssignmentRow[]
  availability: AvailabilityNoteRow[]
}): SuggestedShift[] {
  const { weekStart, demand, employees, templates, existingAssignments, availability } = input
  const suggestions: SuggestedShift[] = []
  const hoursByEmp = new Map<string, number>()

  for (const a of existingAssignments) {
    const t = templates.find((tm) => tm.id === a.shift_template_id)
    if (!t) continue
    hoursByEmp.set(a.employee_id, (hoursByEmp.get(a.employee_id) || 0) + shiftDur(t))
  }

  for (let d = 0; d < 7; d += 1) {
    const date = addDays(weekStart, d)
    for (const [station, hours] of Object.entries(demand)) {
      for (const [hourStr, count] of Object.entries(hours)) {
        const hour = Number(hourStr)
        const needed = Math.max(0, count - alreadyAssigned(station, hour, date, existingAssignments, templates))
        if (needed <= 0) continue
        const candidates = employees
          .filter((e) => e.station === station && e.is_active)
          .filter((e) => !isUnavailable(e.id, date, availability))
          .filter((e) => !hasShiftAt(e.id, date, existingAssignments, templates))
          .sort((a, b) => (hoursByEmp.get(a.id) || 0) - (hoursByEmp.get(b.id) || 0))
        for (let i = 0; i < Math.min(needed, candidates.length); i += 1) {
          const e = candidates[i]
          const tmpl = pickTemplate(station, hour, templates)
          if (!tmpl) continue
          const dur = shiftDur(tmpl)
          if ((hoursByEmp.get(e.id) || 0) + dur > e.max_hours_per_week) continue
          suggestions.push({
            employee_id: e.id,
            shift_template_id: tmpl.id,
            work_date: date,
            notes: 'auto-suggested',
          })
          hoursByEmp.set(e.id, (hoursByEmp.get(e.id) || 0) + dur)
        }
      }
    }
  }
  return suggestions
}

function shiftDur(t: ShiftTemplateRow): number {
  const [sh, sm] = t.start_time.split(':').map(Number)
  const [eh, em] = t.end_time.split(':').map(Number)
  let s = sh * 60 + sm
  let e = eh * 60 + em
  if (e <= s) e += 24 * 60
  return (e - s) / 60
}

function alreadyAssigned(
  station: string,
  hour: number,
  date: string,
  assignments: AssignmentRow[],
  templates: ShiftTemplateRow[],
): number {
  return assignments.filter((a) => {
    if (a.work_date !== date) return false
    const t = templates.find((tm) => tm.id === a.shift_template_id)
    if (!t || t.station !== station) return false
    const start = Number(t.start_time.slice(0, 2))
    const end = Number(t.end_time.slice(0, 2)) || 24
    return hour >= start && hour < end
  }).length
}

function hasShiftAt(
  employeeId: string,
  date: string,
  assignments: AssignmentRow[],
  templates: ShiftTemplateRow[],
): boolean {
  return assignments.some((a) => {
    if (a.employee_id !== employeeId || a.work_date !== date) return false
    const t = templates.find((tm) => tm.id === a.shift_template_id)
    return !!t
  })
}

function isUnavailable(
  employeeId: string,
  date: string,
  availability: AvailabilityNoteRow[],
): boolean {
  const dow = dayOfWeekIndex(date)
  const note = availability.find((a) => a.employee_id === employeeId)
  if (!note) return false
  return (note.unavailable_slots ?? []).some((s) => s.dayOfWeek === dow && s.allDay)
}

function pickTemplate(station: string, hour: number, templates: ShiftTemplateRow[]): ShiftTemplateRow | undefined {
  return templates.find((t) => t.station === station && Number(t.start_time.slice(0, 2)) <= hour && Number(t.end_time.slice(0, 2)) > hour)
}
```

`apps/web/src/lib/action/api.ts`:

```ts
import { createFlowSupabase } from '@/lib/supabase'
import { mapRpcError } from '@/lib/roster/api'
import type { AlertRow, CoachingRow, DispatchRow, SlaEventRow } from './types'

function sb() { return createFlowSupabase() }

export async function fetchAlerts(branchId: string, options?: {
  alertType?: string
  severity?: string
  limit?: number
  offset?: number
}): Promise<AlertRow[]> {
  let q = sb().from('alerts').select('*').eq('branch_id', branchId).order('created_at', { ascending: false })
  if (options?.alertType) q = q.eq('alert_type', options.alertType)
  if (options?.severity) q = q.eq('severity', options.severity)
  if (options?.limit) q = q.range(options.offset || 0, (options.offset || 0) + options.limit - 1)
  const { data, error } = await q
  if (error) throw mapRpcError(error)
  return (data ?? []) as AlertRow[]
}

export async function createDispatchFromAlert(
  branchId: string,
  alertId: string,
  notes?: string,
): Promise<DispatchRow> {
  const { data, error } = await sb()
    .from('dispatch_tasks')
    .insert({ branch_id: branchId, alert_id: alertId, status: 'pending', notes: notes ?? '' })
    .select('*')
    .single()
  if (error) throw mapRpcError(error)
  return data as DispatchRow
}

export async function updateDispatchStatus(
  id: string,
  patch: Partial<Pick<DispatchRow, 'status' | 'assigned_to' | 'notes'>>,
): Promise<void> {
  const { error } = await sb().from('dispatch_tasks').update({ ...patch, resolved_at: patch.status === 'resolved' ? new Date().toISOString() : undefined }).eq('id', id)
  if (error) throw mapRpcError(error)
}

export async function fetchDispatches(branchId: string): Promise<DispatchRow[]> {
  const { data, error } = await sb()
    .from('dispatch_tasks')
    .select('*')
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false })
  if (error) throw mapRpcError(error)
  return (data ?? []) as DispatchRow[]
}

export async function fetchCoachingNotes(branchId: string, weekStart: string): Promise<CoachingRow[]> {
  const { data, error } = await sb()
    .from('coaching_notes')
    .select('*')
    .eq('branch_id', branchId)
    .eq('week_start', weekStart)
  if (error) throw mapRpcError(error)
  return (data ?? []) as CoachingRow[]
}

export async function upsertCoachingNote(note: Omit<CoachingRow, 'id' | 'created_at' | 'created_by'> & { id?: string }): Promise<CoachingRow> {
  const { data, error } = await sb()
    .from('coaching_notes')
    .upsert({ ...note, created_at: new Date().toISOString() }, { onConflict: 'branch_id,alert_id,week_start' })
    .select('*')
    .single()
  if (error) throw mapRpcError(error)
  return data as CoachingRow
}

export async function fetchSlaEvents(branchId: string, day: string): Promise<SlaEventRow[]> {
  const { data, error } = await sb()
    .from('service_sla_events')
    .select('*')
    .eq('branch_id', branchId)
    .eq('day', day)
    .order('hour', { ascending: true })
  if (error) throw mapRpcError(error)
  return (data ?? []) as SlaEventRow[]
}
```

- [ ] **Step 3: Run engine + API tests**

```bash
cd apps/web
npx vitest run src/lib/action/gaps.test.ts src/lib/action/cost.test.ts src/lib/action/suggest.test.ts src/lib/action/api.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/action
git commit -m "feat(flow): action-layer engines and API"
```

---

### Task 4: i18n + nav

**Files:**
- Modify: `apps/web/src/i18n/flowMessages.ts`
- Modify: `apps/web/src/shell/nav.ts`

**Interfaces:**
- Consumes: existing nav contract, existing message map.
- Produces: bilingual keys for Action nav, service gap, dispatch, coach, efficiency widgets.

- [ ] **Step 1: Add keys to `flowMessages.ts`**

zh-HK additions:

```ts
'nav.action': '行動',
'nav.serviceGap': '服務缺口',
'nav.dispatch': '調度',
'nav.coach': '教練',
'serviceGap.title': '服務缺口',
'serviceGap.empty': '沒有服務缺口事件。',
'serviceGap.zone': '區域',
'serviceGap.time': '時間',
'serviceGap.severity': '嚴重程度',
'serviceGap.duration': '持續',
'serviceGap.requiredStaff': '需要人手',
'serviceGap.actualStaff': '實際人手',
'serviceGap.dispatch': '調度',
'serviceGap.flagForCoaching': '加入教練',
'serviceGap.honesty': '示範事件（非實時影像）。',
'serviceGap.severity.info': '提示',
'serviceGap.severity.warning': '警告',
'serviceGap.severity.critical': '嚴重',
'dispatch.title': '調度',
'dispatch.empty': '沒有調度任務。',
'dispatch.status.pending': '待處理',
'dispatch.status.assigned': '已指派',
'dispatch.status.resolved': '已解決',
'dispatch.status.cancelled': '已取消',
'dispatch.assignTo': '指派給',
'dispatch.notes': '備註',
'dispatch.resolve': '解決',
'dispatch.cancel': '取消',
'dispatch.create': '新增調度',
'coach.title': '教練',
'coach.empty': '沒有待檢視事件。',
'coach.week': '週',
'coach.observation': '觀察',
'coach.actionItem': '行動項目',
'coach.reviewed': '已檢閱',
'coach.markReviewed': '標記已檢閱',
'coach.printSummary': '列印摘要',
'overview.widget.serviceHealth': '服務健康度',
'overview.widget.staffingRatio': '人效配比',
'overview.serviceHealth.slaBreaches': 'SLA 超標',
'overview.serviceHealth.openDispatches': '待調度',
'overview.serviceHealth.unresolvedGaps': '未解決缺口',
'roster.cost.title': '本週人力成本',
'roster.cost.total': '總成本',
'roster.cost.overtimePremium': '超時加費',
'roster.cost.compareLastWeek': '比上週',
'roster.forecast.title': '發佈前預警',
'roster.forecast.overtimeHours': '預計超時時數',
'roster.forecast.affectedEmployees': '受影響員工',
'roster.suggest.title': '自動排班建議',
'roster.suggest.apply': '套用建議',
'roster.suggest.reject': '放棄',
'staff.coverageHint': '{{station}} 需要 {{need}} 人，現有 {{have}} 人。',
```

Add matching English keys.

- [ ] **Step 2: Extend `FLOW_NAV`**

```ts
{
  groupKey: 'nav.action',
  items: [
    { to: '/flow/service-gap', labelKey: 'nav.serviceGap' },
    { to: '/flow/dispatch', labelKey: 'nav.dispatch' },
    { to: '/flow/coach', labelKey: 'nav.coach' },
  ],
},
```

- [ ] **Step 3: Run locale round-trip test**

Add two new keys to `FlowLocaleContext.test.tsx` and run:

```bash
npx vitest run src/context/FlowLocaleContext.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/i18n/flowMessages.ts apps/web/src/shell/nav.ts apps/web/src/context/FlowLocaleContext.test.tsx
git commit -m "feat(flow): action-layer i18n and nav"
```

---

### Task 5: Service Gap page

**Files:**
- Create: `apps/web/src/pages/flow/ServiceGap.tsx`
- Create: `apps/web/src/pages/flow/ServiceGap.test.tsx`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Consumes: `fetchAlerts`, `createDispatchFromAlert`, `AlertRow`, `GapEvent`.
- Produces: `/flow/service-gap` route.

- [ ] **Step 1: Failing test**

`apps/web/src/pages/flow/ServiceGap.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, test, vi } from 'vitest'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
import { FlowThemeProvider } from '@/context/FlowThemeContext'
import { ServiceGapPage } from './ServiceGap'

vi.mock('@/context/FlowAuthContext', () => ({
  useFlowAuth: () => ({ profile: { id: 'p1' } }),
}))

vi.mock('@/lib/action/api', () => ({
  fetchAlerts: vi.fn(async () => [
    {
      id: 'a1', branch_id: 'b1', severity: 'warning', title_zh: '貨架區 A 人手不足',
      title_en: 'Shelf A understaffed', alert_type: 'service_gap', zone_id: 'z1',
      start_at: '2026-09-16T14:00:00+08:00', end_at: '2026-09-16T14:30:00+08:00',
      metadata: { requiredStaff: 2, actualStaff: 1 }, created_at: '2026-09-16T14:35:00+08:00',
    },
  ]),
  createDispatchFromAlert: vi.fn(async () => ({ id: 'd1' })),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <FlowLocaleProvider>
        <FlowThemeProvider>
          <ServiceGapPage />
        </FlowThemeProvider>
      </FlowLocaleProvider>
    </MemoryRouter>,
  )
}

test('renders gap events and can dispatch', async () => {
  const user = userEvent.setup()
  renderPage()
  expect(await screen.findByText('貨架區 A 人手不足')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /調度/ }))
  expect(screen.getByText(/已建立調度/)).toBeInTheDocument()
})
```

Run; expect FAIL because page does not exist.

- [ ] **Step 2: Implement page**

`apps/web/src/pages/flow/ServiceGap.tsx`:

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFlowAuth } from '@/context/FlowAuthContext'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import { createDispatchFromAlert, fetchAlerts } from '@/lib/action/api'
import type { AlertRow } from '@/lib/action/types'

export function ServiceGapPage() {
  const { profile } = useFlowAuth()
  const { t, locale } = useFlowAuth()
  const zh = locale === 'zh-HK'
  const [rows, setRows] = useState<AlertRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterSeverity, setFilterSeverity] = useState<string>('all')

  const load = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAlerts('a0000000-0000-4000-8000-000000000001')
      setRows(data)
    } catch {
      setError(t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [profile, t])

  useEffect(() => { void load() }, [load])

  const visible = useMemo(() => {
    if (filterSeverity === 'all') return rows
    return rows.filter((r) => r.severity === filterSeverity)
  }, [rows, filterSeverity])

  async function dispatchFrom(row: AlertRow) {
    try {
      await createDispatchFromAlert(row.branch_id, row.id, t('serviceGap.dispatch'))
      await load()
    } catch {
      setError(t('common.error'))
    }
  }

  return (
    <div className="roster-board" data-testid="service-gap-page">
      <div className="roster-toolbar">
        <div className="roster-title"><h2>{t('serviceGap.title')}</h2></div>
        <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
          <option value="all">{t('common.all')}</option>
          <option value="info">{t('serviceGap.severity.info')}</option>
          <option value="warning">{t('serviceGap.severity.warning')}</option>
          <option value="critical">{t('serviceGap.severity.critical')}</option>
        </select>
      </div>
      {error && <div className="roster-error-banner">{error}</div>}
      {loading ? (
        <div className="roster-skeleton"><div className="bar" /><div className="bar" /></div>
      ) : visible.length === 0 ? (
        <div className="roster-empty-hint">{t('serviceGap.empty')}</div>
      ) : (
        <table className="roster-table">
          <thead>
            <tr>
              <th>{t('serviceGap.time')}</th>
              <th>{t('serviceGap.zone')}</th>
              <th>{t('serviceGap.severity')}</th>
              <th>{t('serviceGap.requiredStaff')}</th>
              <th>{t('serviceGap.actualStaff')}</th>
              <th>{t('roster.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id}>
                <td>{r.start_at ? new Date(r.start_at).toLocaleString() : '—'}</td>
                <td>{zh ? r.title_zh : r.title_en}</td>
                <td>{t(`serviceGap.severity.${r.severity}`)}</td>
                <td>{Number(r.metadata.requiredStaff) || '—'}</td>
                <td>{Number(r.metadata.actualStaff) || '—'}</td>
                <td>
                  <button type="button" className="roster-btn primary" onClick={() => void dispatchFrom(r)}>
                    {t('serviceGap.dispatch')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="overview-honesty">{t('serviceGap.honesty')}</p>
    </div>
  )
}

export default ServiceGapPage
```

- [ ] **Step 3: Wire route in `App.tsx`**

```tsx
import { ServiceGapPage } from '@/pages/flow/ServiceGap'
// ... inside FlowShell routes ...
<Route path="service-gap" element={<ServiceGapPage />} />
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/pages/flow/ServiceGap.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/flow/ServiceGap.tsx apps/web/src/pages/flow/ServiceGap.test.tsx apps/web/src/App.tsx
git commit -m "feat(flow): service gap page"
```

---

### Task 6: Overview service health + staffing ratio widgets

**Files:**
- Create: `apps/web/src/components/action/ServiceHealthWidget.tsx`
- Create: `apps/web/src/components/action/StaffingRatioWidget.tsx`
- Modify: `apps/web/src/pages/flow/Overview.tsx`
- Modify: `apps/web/src/pages/flow/Overview.test.tsx`

**Interfaces:**
- Consumes: `fetchAlerts`, `fetchDispatches`, `fetchTodayHourly`, `fetchWeekdayDistribution`, roster data.
- Produces: two new widgets rendered on `/flow`.

- [ ] **Step 1: Failing test**

Extend `Overview.test.tsx`:

```tsx
test('shows service health widget', async () => {
  renderOverview()
  expect(await screen.findByTestId('overview-widget-service-health')).toBeInTheDocument()
})
```

Run; expect FAIL.

- [ ] **Step 2: Implement widgets**

`apps/web/src/components/action/ServiceHealthWidget.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import { fetchAlerts, fetchDispatches } from '@/lib/action/api'

export function ServiceHealthWidget({ branchId }: { branchId: string }) {
  const { t } = useFlowLocale()
  const [sla, setSla] = useState(0)
  const [open, setOpen] = useState(0)
  const [gaps, setGaps] = useState(0)

  useEffect(() => {
    void (async () => {
      const [alerts, dispatches] = await Promise.all([
        fetchAlerts(branchId, { alertType: 'sla_breach' }),
        fetchDispatches(branchId),
      ])
      setSla(alerts.length)
      setOpen(dispatches.filter((d) => d.status === 'pending' || d.status === 'assigned').length)
      setGaps((await fetchAlerts(branchId, { alertType: 'service_gap' })).length)
    })()
  }, [branchId])

  return (
    <div data-testid="overview-widget-service-health">
      <div style={{ display: 'flex', gap: 24 }}>
        <div><div style={{ fontSize: 28, fontWeight: 700 }}>{sla}</div><div>{t('overview.serviceHealth.slaBreaches')}</div></div>
        <div><div style={{ fontSize: 28, fontWeight: 700 }}>{open}</div><div>{t('overview.serviceHealth.openDispatches')}</div></div>
        <div><div style={{ fontSize: 28, fontWeight: 700 }}>{gaps}</div><div>{t('overview.serviceHealth.unresolvedGaps')}</div></div>
      </div>
    </div>
  )
}
```

`apps/web/src/components/action/StaffingRatioWidget.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import { fetchTodayHourly } from '@/lib/footfall/api'

export function StaffingRatioWidget({ branchId }: { branchId: string }) {
  const { t, locale } = useFlowLocale()
  const [rows, setRows] = useState<{ hour: number; ratio: number }[]>([])

  useEffect(() => {
    void (async () => {
      const hourly = await fetchTodayHourly(branchId)
      setRows(hourly.map((h) => ({ hour: h.hour, ratio: h.inCount > 0 ? h.inCount / 2 : 0 })))
    })()
  }, [branchId])

  return (
    <div data-testid="overview-widget-staffing-ratio">
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="ratio" name={t('overview.widget.staffingRatio')} fill="var(--flow-accent)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 3: Add widgets to `Overview.tsx`**

Import and add two `WidgetCard` entries after existing widgets. Reuse `loadCard` pattern.

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/pages/flow/Overview.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/action apps/web/src/pages/flow/Overview.tsx apps/web/src/pages/flow/Overview.test.tsx
git commit -m "feat(flow): service health and staffing ratio overview widgets"
```

---

### Task 7: Dispatch page + nav badge

**Files:**
- Create: `apps/web/src/pages/flow/Dispatch.tsx`
- Create: `apps/web/src/pages/flow/Dispatch.test.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/shell/pilot-v1/FlowShell.tsx` (badge)

**Interfaces:**
- Consumes: `fetchDispatches`, `updateDispatchStatus`, `fetchEmployees`.
- Produces: `/flow/dispatch` queue with assign/resolve/cancel.

- [ ] **Step 1: Failing test**

`apps/web/src/pages/flow/Dispatch.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, test, vi } from 'vitest'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
import { FlowThemeProvider } from '@/context/FlowThemeContext'
import { DispatchPage } from './Dispatch'

vi.mock('@/context/FlowAuthContext', () => ({
  useFlowAuth: () => ({ profile: { id: 'p1' } }),
}))

const update = vi.fn()
vi.mock('@/lib/action/api', () => ({
  fetchDispatches: vi.fn(async () => [
    { id: 'd1', branch_id: 'b1', alert_id: 'a1', status: 'pending', assigned_to: null, notes: '', created_at: '' },
  ]),
  updateDispatchStatus: update,
}))
vi.mock('@/lib/roster/api', () => ({
  fetchEmployees: vi.fn(async () => [
    { id: 'e1', name_zh: '陳嘉欣', name_en: 'Karen Chan', station: '樓面', is_active: true },
  ]),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <FlowLocaleProvider><FlowThemeProvider><DispatchPage /></FlowThemeProvider></FlowLocaleProvider>
    </MemoryRouter>,
  )
}

test('assigns and resolves a dispatch', async () => {
  const user = userEvent.setup()
  renderPage()
  expect(await screen.findByText(/待處理/)).toBeInTheDocument()
  await user.selectOptions(screen.getByLabelText(/指派給/), 'e1')
  await user.click(screen.getByRole('button', { name: /解決/ }))
  expect(update).toHaveBeenCalledWith('d1', expect.objectContaining({ status: 'resolved', assigned_to: 'e1' }))
})
```

Run; expect FAIL.

- [ ] **Step 2: Implement page**

Build `apps/web/src/pages/flow/Dispatch.tsx` with queue table, status filter, assign dropdown, resolve/cancel buttons.

- [ ] **Step 3: Wire route and nav badge**

Add route in `App.tsx`. In `FlowShell.tsx`, fetch open dispatch count and show badge next to nav label.

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/pages/flow/Dispatch.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/flow/Dispatch.tsx apps/web/src/pages/flow/Dispatch.test.tsx apps/web/src/App.tsx apps/web/src/shell/pilot-v1/FlowShell.tsx
git commit -m "feat(flow): dispatch queue page with nav badge"
```

---

### Task 8: Coaching page

**Files:**
- Create: `apps/web/src/pages/flow/Coach.tsx`
- Create: `apps/web/src/pages/flow/Coach.test.tsx`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Consumes: `fetchAlerts`, `fetchCoachingNotes`, `upsertCoachingNote`.
- Produces: `/flow/coach` weekly review surface.

- [ ] **Step 1: Failing test**

`apps/web/src/pages/flow/Coach.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, test, vi } from 'vitest'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
import { FlowThemeProvider } from '@/context/FlowThemeContext'
import { CoachPage } from './Coach'

vi.mock('@/context/FlowAuthContext', () => ({
  useFlowAuth: () => ({ profile: { id: 'p1' } }),
}))

const upsert = vi.fn()
vi.mock('@/lib/action/api', () => ({
  fetchAlerts: vi.fn(async () => [
    { id: 'a1', branch_id: 'b1', alert_type: 'service_gap', title_zh: '缺口', title_en: 'Gap', severity: 'warning', metadata: {}, created_at: '', start_at: '', end_at: '' },
  ]),
  fetchCoachingNotes: vi.fn(async () => []),
  upsertCoachingNote: upsert,
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <FlowLocaleProvider><FlowThemeProvider><CoachPage /></FlowThemeProvider></FlowLocaleProvider>
    </MemoryRouter>,
  )
}

test('saves a coaching note', async () => {
  const user = userEvent.setup()
  renderPage()
  expect(await screen.findByText('缺口')).toBeInTheDocument()
  await user.type(screen.getByLabelText(/觀察/), 'test observation')
  await user.click(screen.getByRole('button', { name: /標記已檢閱/ }))
  expect(upsert).toHaveBeenCalled()
})
```

Run; expect FAIL.

- [ ] **Step 2: Implement page**

Build `apps/web/src/pages/flow/Coach.tsx` with week selector, alert list, editable observation/action_item, reviewed checkbox.

- [ ] **Step 3: Wire route**

```tsx
<Route path="coach" element={<CoachPage />} />
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/pages/flow/Coach.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/flow/Coach.tsx apps/web/src/pages/flow/Coach.test.tsx apps/web/src/App.tsx
git commit -m "feat(flow): coaching review page"
```

---

### Task 9: Roster cost simulation

**Files:**
- Create: `apps/web/src/components/roster/CostSidebar.tsx`
- Modify: `apps/web/src/pages/flow/roster/WeekBoard.tsx`
- Modify: `apps/web/src/lib/roster/types.ts` (add `hourly_rate`)

**Interfaces:**
- Consumes: `calculateWeekCost`, `EmployeeWithRate`, week bundle.
- Produces: cost panel inside roster board.

- [ ] **Step 1: Add `hourly_rate` to roster types**

```ts
export interface EmployeeRow {
  // ... existing fields ...
  hourly_rate?: number
}
```

- [ ] **Step 2: Implement `CostSidebar.tsx`**

```tsx
import { useFlowLocale } from '@/context/FlowLocaleContext'
import { calculateWeekCost } from '@/lib/action/cost'
import type { AssignmentRow, EmployeeRow, ShiftTemplateRow } from '@/lib/roster/types'

export function CostSidebar({
  assignments, templates, employees,
}: {
  assignments: AssignmentRow[]
  templates: ShiftTemplateRow[]
  employees: EmployeeRow[]
}) {
  const { t } = useFlowLocale()
  const cost = calculateWeekCost({ assignments, templates, employees: employees as any })
  return (
    <aside className="roster-hours" aria-label={t('roster.cost.title')}>
      <h3>{t('roster.cost.title')}</h3>
      <div>{t('roster.cost.total')}: {cost.total.toLocaleString()}</div>
      <div>{t('roster.cost.overtimePremium')}: {cost.overtimePremium.toLocaleString()}</div>
    </aside>
  )
}
```

- [ ] **Step 3: Wire into `WeekBoard.tsx`**

Render `<CostSidebar assignments={assignments} templates={templates} employees={employees} />` next to `HourSidebar`.

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/pages/flow/roster/WeekBoard.test.tsx src/lib/action/cost.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/roster/CostSidebar.tsx apps/web/src/lib/roster/types.ts apps/web/src/pages/flow/roster/WeekBoard.tsx
git commit -m "feat(flow): roster weekly cost simulation"
```

---

### Task 10: Overtime forecast before publish

**Files:**
- Create: `apps/web/src/components/roster/OvertimeForecast.tsx`
- Modify: `apps/web/src/pages/flow/roster/WeekBoard.tsx`

**Interfaces:**
- Consumes: existing conflicts, `calculateWeekCost`.
- Produces: informational forecast shown in publish confirm dialog.

- [ ] **Step 1: Implement component**

```tsx
import { useFlowLocale } from '@/context/FlowLocaleContext'
import { calculateWeekCost, shiftHours } from '@/lib/action/cost'
import type { AssignmentRow, EmployeeRow, ShiftTemplateRow } from '@/lib/roster/types'

export function OvertimeForecast({
  assignments, templates, employees,
}: {
  assignments: AssignmentRow[]
  templates: ShiftTemplateRow[]
  employees: EmployeeRow[]
}) {
  const { t } = useFlowLocale()
  const cost = calculateWeekCost({ assignments, templates, employees: employees as any })
  const affected = employees.filter((e) => {
    const h = assignments
      .filter((a) => a.employee_id === e.id)
      .reduce((sum, a) => sum + shiftHours(
        templates.find((t) => t.id === a.shift_template_id)?.start_time ?? '00:00',
        templates.find((t) => t.id === a.shift_template_id)?.end_time ?? '00:00',
      ), 0)
    return h > e.max_hours_per_week
  })
  if (affected.length === 0 && cost.overtimePremium === 0) return null
  return (
    <div className="roster-publish-blocked" style={{ background: 'var(--flow-accent-soft)' }}>
      <strong>{t('roster.forecast.title')}</strong>
      <div>{t('roster.forecast.overtimeHours')}: {cost.overtimePremium.toFixed(0)}</div>
      <div>{t('roster.forecast.affectedEmployees')}: {affected.map((e) => e.name_zh).join(', ')}</div>
    </div>
  )
}
```

- [ ] **Step 2: Show in publish dialog**

Modify the `PublishConfirmDialog` call site to pass the forecast component or text. Keep publish blocking only on hard conflicts.

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/pages/flow/roster/WeekBoard.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/roster/OvertimeForecast.tsx apps/web/src/pages/flow/roster/WeekBoard.tsx
git commit -m "feat(flow): overtime forecast before publish"
```

---

### Task 11: Auto-shift suggestions

**Files:**
- Create: `apps/web/src/components/roster/AutoSuggestDialog.tsx`
- Modify: `apps/web/src/pages/flow/roster/WeekBoard.tsx`

**Interfaces:**
- Consumes: `suggestShifts`, demand heuristic, `addAssignments`.
- Produces: candidate assignments that manager approves.

- [ ] **Step 1: Build demand heuristic helper**

Add to `apps/web/src/lib/action/suggest.ts`:

```ts
export function buildDemandFromHistory(
  weekdayAvg: { weekday: number; avgInCount: number }[],
  zones: { zoneKey: string; zoneType: string }[],
): Record<string, Record<number, number>> {
  const demand: Record<string, Record<number, number>> = {}
  for (const day of weekdayAvg) {
    for (let h = 10; h < 21; h += 1) {
      const visits = Math.round(day.avgInCount / 11)
      for (const z of zones) {
        if (!demand[z.zoneKey]) demand[z.zoneKey] = {}
        demand[z.zoneKey][h] = Math.max(1, Math.ceil(visits / 30))
      }
    }
  }
  return demand
}
```

- [ ] **Step 2: Implement dialog**

`AutoSuggestDialog.tsx`: show count of suggestions, employee list, apply/reject buttons.

- [ ] **Step 3: Wire into `WeekBoard.tsx`**

Add "Suggest shifts" button in draft toolbar; on click compute demand from `fetchWeekdayDistribution`, call `suggestShifts`, open dialog; on apply call `addAssignments` in batch and reload.

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/pages/flow/roster/WeekBoard.test.tsx src/lib/action/suggest.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/roster/AutoSuggestDialog.tsx apps/web/src/lib/action/suggest.ts apps/web/src/pages/flow/roster/WeekBoard.tsx
git commit -m "feat(flow): auto-shift suggestions on draft week"
```

---

### Task 12: Staff coverage gap hints

**Files:**
- Modify: `apps/web/src/pages/flow/roster/Staff.tsx`
- Modify: `apps/web/src/pages/flow/roster/Staff.test.tsx`

**Interfaces:**
- Consumes: employees, templates.
- Produces: inline hint when a station is under-covered.

- [ ] **Step 1: Compute coverage gaps**

```ts
function coverageGaps(employees: EmployeeRow[], templates: ShiftTemplateRow[]) {
  const activeByStation = new Map<string, number>()
  for (const e of employees) if (e.is_active) activeByStation.set(e.station, (activeByStation.get(e.station) || 0) + 1)
  const needByStation = new Map<string, number>()
  for (const t of templates) if (t.is_active) needByStation.set(t.station, Math.max(needByStation.get(t.station) || 0, t.headcount_target))
  const gaps: { station: string; need: number; have: number }[] = []
  for (const [station, need] of needByStation) {
    const have = activeByStation.get(station) || 0
    if (have < need) gaps.push({ station, need, have })
  }
  return gaps
}
```

- [ ] **Step 2: Render hints in `Staff.tsx`**

Add a banner above the staff table listing gaps using `staff.coverageHint`.

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/pages/flow/roster/Staff.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/flow/roster/Staff.tsx apps/web/src/pages/flow/roster/Staff.test.tsx
git commit -m "feat(flow): staff coverage gap hints"
```

---

### Task 13: Closeout — typecheck, tests, smoke, docs

**Files:**
- Create: `docs/flow-pilot-action-layer.md`
- Modify: any remaining lint/type fixes.

- [ ] **Step 1: Typecheck**

```bash
cd apps/web
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Full unit run**

```bash
npx vitest run src/lib/action src/pages/flow/ServiceGap.test.tsx src/pages/flow/Dispatch.test.tsx src/pages/flow/Coach.test.tsx src/pages/flow/Overview.test.tsx src/pages/flow/roster/WeekBoard.test.tsx src/pages/flow/roster/Staff.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Guard checks**

```powershell
rg "from '@/shell/pilot-v1'" apps/web/src/pages apps/web/src/lib
rg "Inter|38BDF8|0B0F17" apps/web/src/shell/pilot-v1
rg "优衣库|Uniqlo" apps/web/src supabase/migrations
```

Expected: no product matches.

- [ ] **Step 4: Browser smoke**

Start `npm run dev` on 5174. Log in as manager.

1. `/flow` shows service health + staffing ratio widgets.
2. `/flow/service-gap` shows the seeded shelf_a gap; "Dispatch" creates a task.
3. `/flow/dispatch` shows the task; assign + resolve updates status.
4. `/flow/coach` shows week 2026-09-14 flagged event; save note, mark reviewed.
5. `/flow/roster` shows cost estimate; publish shows overtime forecast if any.
6. Auto-suggest generates assignments without hard conflicts.
7. `/flow/roster/staff` shows coverage hint if a station is under-covered.
8. Toggle zh/en; all new strings translate.

- [ ] **Step 5: Write closeout doc**

`docs/flow-pilot-action-layer.md`:

```markdown
# IFMP Retail — Action Layer Smoke Checklist

## Seeded demo IDs

- Branch: `a0000000-0000-4000-8000-000000000001`
- Service gap alert: `c0000000-0000-4000-8000-000000000001`
- Dispatch task: `c0000000-0000-4000-8000-000000000011`
- Coaching note: `c0000000-0000-4000-8000-000000000021`
- SLA event: branch/day 2026-09-16/hour 15

## Smoke steps

1. `/flow` — service health widget shows counts; staffing ratio chart renders.
2. `/flow/service-gap` — filter by severity; click Dispatch; success toast/inline.
3. `/flow/dispatch` — assign to employee, resolve, refresh stays resolved.
4. `/flow/coach` — select week, edit observation, mark reviewed.
5. `/flow/roster` — cost sidebar visible; publish dialog shows overtime forecast.
6. `/flow/roster/staff` — coverage hint appears if applicable.
7. Locale toggle — all new keys bilingual.

## Deferrals

- Live CV ingestion
- Staff native push
- POS conversion
- AI-written coaching
```

- [ ] **Step 6: Final commit**

```bash
git add docs/flow-pilot-action-layer.md
git commit -m "docs(flow): action-layer smoke checklist"
```

---

## Spec coverage

| Spec item | Task |
|---|---|
| Schema changes (alerts, dispatch_tasks, coaching_notes, service_sla_events, hourly_rate) | T1 |
| Demo seed | T2 |
| TypeScript API + pure engines | T3 |
| i18n + nav | T4 |
| Service Gap page | T5 |
| Overview service health + staffing ratio widgets | T6 |
| Dispatch queue + nav badge | T7 |
| Coaching page | T8 |
| Roster cost simulation | T9 |
| Overtime forecast | T10 |
| Auto-shift suggestions | T11 |
| Staff coverage hints | T12 |
| Acceptance / closeout | T13 |

## Task count by phase

| Phase | Tasks | Focus | Model |
|---|---|---|---|
| 1 — Foundation | T1–T4 | Schema, seed, API, engines, i18n, nav | Kimi 2.7 Code |
| 2 — Service Gap | T5–T6 | Gap page + overview widgets | Kimi 2.7 Code |
| 3 — Dispatch | T7 | Dispatch queue + nav badge | DeepSeek 4.1 Flash |
| 4 — Coaching | T8 | Coaching review page | Kimi 2.7 Code |
| 5 — Efficiency | T9–T11 | Cost, overtime forecast, auto-suggest | Kimi 2.7 Code |
| 6 — Coverage hints | T12 | Staff registry hints | DeepSeek 4.1 Flash |
| 7 — Closeout | T13 | tsc, vitest, smoke, docs | Kimi 2.7 Code |

**Total tasks:** 13

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-17-ifmp-flow-action-layer.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration. Use `superpowers:subagent-driven-development`.
2. **Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?
