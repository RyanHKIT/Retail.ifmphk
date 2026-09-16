# IFMP Retail (pilot) — Action Layer Design Spec

> **Date:** 2026-09-17
> **Status:** Draft for owner review
> **Parent spec:** `docs/superpowers/specs/2026-09-15-ifmp-flow-design.md`
> **Builds on:**
> - `docs/superpowers/specs/2026-09-16-ifmp-flow-roster-design.md`
> - `docs/superpowers/specs/2026-09-16-ifmp-flow-phase5-pilot-close-design.md`
> - `docs/superpowers/specs/2026-09-17-ifmp-flow-ai-insights-design.md`

## 1. Summary

Add an **action layer** to `/flow` that turns footfall and roster data into operational decisions. Three new manager surfaces — **Service Gap (服務缺口)**, **Dispatch (調度)** and **Coaching (教練)** — are joined by efficiency add-ons (staffing ratio, cost simulation, overtime forecast, auto-shift suggestions) so the branch manager can reduce labor waste and improve service quality without leaving the pilot shell.

## 2. Problem

The pilot currently gives the manager:

- Data overview: footfall, journey, audience, comparisons, holidays.
- Roster management: week board, staff registry, templates, hour policies, swaps, audit.

What is missing:

- Detection of under-served periods or zones.
- A one-click way to reallocate staff when a gap is detected.
- Structured follow-up / coaching that turns incidents into repeatable improvement.
- Cost visibility before a roster is published.
- Data-driven suggestions for where to place shifts.

Result: the manager sees numbers but still acts on intuition, which leaves cost and service quality on the table.

## 3. Goal

A branch manager can, within `/flow`:

1. See today's service gaps and understand whether the root cause is a traffic spike, a roster under-staff period, or a zone coverage hole.
2. Dispatch an available employee to a gap with one click and track resolution.
3. Review gap events in a weekly coaching session, write observations, and assign follow-up actions.
4. Scan service health and staffing ratio directly on the overview page.
5. Simulate weekly labor cost and see overtime cost before publishing a roster.
6. Generate draft shift suggestions from predicted demand and apply them selectively.

## 4. Scope

### 4.1 In scope

| Feature | Route | Reduces cost | Increases efficiency | Improves service |
|---|---|---|---|---|
| Service Gap list | `/flow/service-gap` | ✓ (identify over/under-staff) | ✓ | ✓ |
| Dispatch queue | `/flow/dispatch` | ✓ (right person, right place) | ✓ | ✓ |
| Coaching review | `/flow/coach` | | ✓ | ✓ |
| Service health + staffing ratio widgets | `/flow` | ✓ | ✓ | ✓ |
| First-contact SLA tracking | `/flow/service-gap` + `/flow/coach` | | ✓ | ✓ |
| Roster cost simulation | `/flow/roster` | ✓ | ✓ | |
| Overtime forecast before publish | `/flow/roster` | ✓ | ✓ | |
| Auto-shift suggestions | `/flow/roster` | ✓ | ✓ | |
| Cross-training / coverage gap hints | `/flow/roster/staff` | ✓ | ✓ | |

### 4.2 Out of scope (deferrals)

- Live computer-vision event ingestion or real video playback. The pilot uses synthetic gap / SLA events derived from footfall + roster.
- Staff native-app push notifications.
- POS conversion attribution or revenue analytics.
- Multi-store comparison.
- AI-generated coaching summaries (the coaching note is manager-written).
- Full mixed-integer programming solver. Auto-shift suggestions use deterministic heuristics.

## 5. Features

### 5.1 Service Gap (服務缺口)

A service gap is a period when customer demand in a zone exceeds the rostered staff capacity, or when the first-contact SLA is breached.

**Detection rules (pilot heuristic):**

- For each zone and each 15-minute bucket of the demo day:
  - `required_staff = ceil(zone_visit_count_in_bucket / target_visits_per_staff)` (default target = 15 visits / staff / 15 min).
  - `actual_staff = count of employees rostered to that station during the bucket`.
  - If `actual_staff < required_staff` for two consecutive buckets, create a `service_gap` alert.
- First-contact SLA breach:
  - For each hour, if `avg_first_contact_sec > 120`, create a `sla_breach` alert.

**Severity:**

- `critical`: gap duration ≥ 30 min or SLA > 180 s.
- `warning`: gap duration ≥ 10 min or SLA > 120 s.
- `info`: everything else.

**UI on `/flow/service-gap`:**

- Filter bar: date, zone, severity.
- Event table: time, zone, severity, duration, required vs actual staff, linked roster period.
- Actions per row: "Dispatch" (creates a `dispatch_tasks` row), "Flag for coaching".
- Empty state with honesty note: synthetic demo events, not live CV.

### 5.2 Dispatch (調度)

A dispatch task is the operational response to a service gap (or a manager-created ad-hoc task).

**States:** `pending` → `assigned` → `resolved` | `cancelled`.

**UI on `/flow/dispatch`:**

- Queue grouped by status.
- Quick-assign dropdown limited to employees currently on shift.
- Notes field.
- "Resolve" and "Cancel" actions.
- Open-count badge on the nav item.
- Mobile-first card layout.

**Behavior:**

- Approving a dispatch does **not** mutate the roster; it records that a human decision was executed.
- A dispatch can link back to `/flow/roster` for permanent schedule changes.

### 5.3 Coaching (教練)

Weekly review surface that turns flagged events into learning.

**Data model:**

- One coaching note per `week_start` + `alert_id`.
- Fields: `observation`, `action_item`, `reviewed_at`.

**UI on `/flow/coach`:**

- Week selector.
- List of flagged gap / SLA events for the selected week.
- Editable observation and action item per event.
- "Mark reviewed" button.
- Printable weekly summary.

### 5.4 Efficiency widgets on `/flow`

Two new compact widgets added to the overview grid:

1. **Service health**: today's SLA breaches, open dispatches, unresolved gaps.
2. **Staffing ratio**: visitors per rostered staff-hour by hour of day (today vs 7-day average).

Both read existing tables; no new write path.

### 5.5 Roster cost simulation

Add a cost sidebar to `/flow/roster`:

- `hourly_rate` is added to `employees` (default 0 for demo safety).
- Weekly cost = Σ (assigned shift hours × employee hourly_rate).
- Overtime premium = Σ (hours beyond effective max × hourly_rate × 1.5).
- Compare to previous published week.

### 5.6 Overtime forecast before publish

When a manager clicks "Publish" on a draft week:

- Show a forecast card: predicted overtime hours, affected employees, estimated premium cost.
- Block publishing only if a hard conflict exists (existing rule); the forecast is informational.

### 5.7 Auto-shift suggestions

Add a "Suggest shifts" button to the draft week board:

- Demand per station/hour is derived from the 8-week historical average for that weekday/hour, with a holiday lift factor from `calendar_days`.
- Heuristic assigns employees to shifts while respecting:
  - min/max weekly hours
  - availability notes
  - no double booking
  - station matching (employee's primary station preferred)
- Suggestions are presented as candidate assignments; manager approves or rejects the whole batch.
- Mutations reuse `addAssignments`.

### 5.8 Cross-training / coverage gap hints

On the staff registry page, show a subtle hint when a station has fewer active employees than shift templates require:

- Coverage gap = `station_headcount_need` (from templates) − `active_employees_in_station`.
- Suggest cross-training when one station is over-covered and another is under-covered.

## 6. Data model

### 6.1 Extend `public.alerts`

```sql
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS alert_type text NOT NULL DEFAULT 'service_gap'
    CHECK (alert_type IN ('service_gap', 'sla_breach', 'dispatch_adhoc')),
  ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES public.zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS end_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
```

`metadata` shape for `service_gap`:

```json
{
  "requiredStaff": 2,
  "actualStaff": 1,
  "visitCount": 34,
  "targetVisitsPerStaff": 15,
  "durationMinutes": 15
}
```

### 6.2 New `public.dispatch_tasks`

```sql
CREATE TABLE public.dispatch_tasks (
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

CREATE POLICY "Managers can view branch dispatch tasks"
  ON public.dispatch_tasks FOR SELECT TO authenticated
  USING (user_manages_branch(auth.uid(), branch_id));

CREATE POLICY "Managers can insert branch dispatch tasks"
  ON public.dispatch_tasks FOR INSERT TO authenticated
  WITH CHECK (user_manages_branch(auth.uid(), branch_id));

CREATE POLICY "Managers can update branch dispatch tasks"
  ON public.dispatch_tasks FOR UPDATE TO authenticated
  USING (user_manages_branch(auth.uid(), branch_id));
```

### 6.3 New `public.coaching_notes`

```sql
CREATE TABLE public.coaching_notes (
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

CREATE POLICY "Managers can view branch coaching notes"
  ON public.coaching_notes FOR SELECT TO authenticated
  USING (user_manages_branch(auth.uid(), branch_id));

CREATE POLICY "Managers can upsert branch coaching notes"
  ON public.coaching_notes FOR ALL TO authenticated
  USING (user_manages_branch(auth.uid(), branch_id))
  WITH CHECK (user_manages_branch(auth.uid(), branch_id));
```

### 6.4 New `public.service_sla_events`

```sql
CREATE TABLE public.service_sla_events (
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

CREATE POLICY "Managers can view branch SLA events"
  ON public.service_sla_events FOR SELECT TO authenticated
  USING (user_manages_branch(auth.uid(), branch_id));
```

### 6.5 Extend `public.employees`

```sql
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS hourly_rate numeric NOT NULL DEFAULT 0
    CHECK (hourly_rate >= 0);
```

For the demo seed, set realistic hourly rates (e.g., FT 75 HKD, PT 55 HKD). Default 0 keeps cost widgets honest when no rate is known.

### 6.6 Seed data

Add a migration that inserts synthetic `service_gap`, `service_sla_events`, and `dispatch_tasks` rows for the demo branch and demo day `2026-09-16`, so the new pages are not blank on first open.

## 7. UI contract

- Add a new nav group **Action** in `apps/web/src/shell/nav.ts`:
  - `/flow/service-gap` → `nav.serviceGap`
  - `/flow/dispatch` → `nav.dispatch`
  - `/flow/coach` → `nav.coach`
- All strings via `flowMessages.ts` (zh-HK + en). No hardcoded Chinese.
- Reuse `roster-badge`, `roster-table`, `roster-toolbar`, `WidgetCard` patterns.
- Service gap video/clip thumbnails are placeholders with an honesty label ("示範片段 / Demo clip").
- Theme tokens stay within the existing `--flow-*` set; no new design system.

## 8. Quality bar

- **Unit:** service-gap detection algorithm tested against footfall + roster fixtures.
- **Unit:** cost simulation and overtime premium calculations.
- **Component:** each new page renders and performs one mutation.
- **SQL:** verify RLS policies, seed counts, and alert metadata shape.
- **Typecheck + Vitest:** green.
- **Manual smoke:** gap → dispatch → coaching flow end-to-end.

## 9. Acceptance

- [ ] `/flow/service-gap` shows seeded demo events for 2026-09-16.
- [ ] Filtering by severity and zone works client-side or server-side without errors.
- [ ] Clicking "Dispatch" on a gap creates a pending task visible on `/flow/dispatch`.
- [ ] Assigning and resolving a dispatch updates its status and timestamp.
- [ ] `/flow/coach` shows the selected week's flagged events and allows saving notes.
- [ ] Overview shows service health and staffing ratio widgets with real numbers.
- [ ] `/flow/roster` shows weekly cost estimate and overtime premium in the hour sidebar area.
- [ ] Publish flow shows overtime forecast without blocking on soft warnings.
- [ ] Auto-shift suggestions generate valid draft assignments (no hard conflicts).
- [ ] Staff registry hints at coverage gaps.

## 10. Deferrals

- Real CV event ingestion.
- Native push to staff phones.
- POS/revenue conversion.
- Multi-store benchmarking.
- AI-written coaching observations.
- Mathematical optimization solver.

## 11. Model recommendations

- **Architecture, schema design, complex UI, security-critical SQL:** Kimi 2.7 Code.
- **Mechanical CRUD, CSS, i18n wiring, test boilerplate:** DeepSeek 4.1 Flash.
- **Subagent dispatch inside Cursor:** use `inherit` (default) or `composer-2.5-fast` for lighter passes, per the available subagent model list.
