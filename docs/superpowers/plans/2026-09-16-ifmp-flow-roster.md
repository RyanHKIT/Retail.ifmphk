# IFMP Retail Flow — Phase 2 Roster (manager parity) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: **superpowers:executing-plans** (inline) for Tasks 1–5. Tasks 6–10 (leaf pages) MAY use subagents once the board contract (Task 5) is committed. Steps use checkbox (`- [ ]`) syntax.

**Goal:** MeDo-parity manager roster under `/flow/roster/*`: week board with hard-conflict-blocked publish, staff, templates, policies, swaps, audit, exports — bilingual, on Phase 1 schema plus one additive ops migration.

**Architecture:** Client board logic in `apps/web/src/lib/roster/` (conflicts engine + api layer). Server truth for publish/copy/swap/audit in `private.*` RPCs (migration 4). Board = click/dialog interactions, no drag-drop.

**Tech Stack:** Vite 8, React 19, react-router-dom 7, Vitest, `@supabase/supabase-js` (singleton client), Supabase RPCs.

**Spec:** `docs/superpowers/specs/2026-09-16-ifmp-flow-roster-design.md` (Approved)
**Behavioral reference:** `_reference/hk-roster-planner/src/pages/*.tsx` — read before each task; port behavior, fix the listed bugs, do not copy zh-hardcoded strings.

## Global Constraints (carry Phase 1)

- UI name IFMP Retail; site I.T. 銅鑼灣 / I.T. Causeway Bay; zh-HK + en via `t()`; never hardcode zh.
- Do not modify `/retail/*`, `retail.css`, legacy mocks.
- No secrets in client; anon key only; RPCs in `private` schema.
- Singleton `createFlowSupabase()` — never construct a second client (see Phase 1 incident `58dd890`).
- Manager-only surfaces; staff UI deferred.

## Execution strategy (ROI) — Phase 2

| Slice | Model | Key |
|---|---|---|
| Tasks 1–5 (migration, conflicts, api, i18n, week board) | **current strong model (qwen3.8-max)** | Auto key — **no switch** |
| Tasks 6–10 (leaf CRUD pages) | `glm-5.3-flash` | Flash key |
| Optional single review of board+publish | one high-cost pass max | that model's key |

Remind operator at phase start: model + key per table above. Anti-patterns unchanged: no Grok-per-task, no Flash-only on conflicts/publish, no subagent farm before board contract exists.

---

## File map (Phase 2)

| Path | Responsibility |
|------|----------------|
| `supabase/migrations/20260916000004_flow_roster_ops.sql` | audit trigger + conflicts/publish/copy/swap RPCs in `private` |
| `apps/web/src/lib/roster/conflicts.ts` | TS conflict engine (spec §3), pure fns |
| `apps/web/src/lib/roster/conflicts.test.ts` | fixture matrix |
| `apps/web/src/lib/roster/api.ts` | typed RPC + query wrappers |
| `apps/web/src/lib/roster/api.test.ts` | mocked-client tests |
| `apps/web/src/lib/roster/types.ts` | row types mirroring schema |
| `apps/web/src/i18n/flowMessages.ts` | + `roster.*` keys (modify) |
| `apps/web/src/components/roster/*` | BoardGrid, CellDialog, ConflictBadges, HourSidebar, MonthGrid, CopyDialog, ExportMenu |
| `apps/web/src/pages/flow/roster/WeekBoard.tsx` | `/flow/roster` |
| `apps/web/src/pages/flow/roster/Staff.tsx` | `/flow/roster/staff` |
| `apps/web/src/pages/flow/roster/Templates.tsx` | `/flow/roster/templates` |
| `apps/web/src/pages/flow/roster/Policies.tsx` | `/flow/roster/policies` |
| `apps/web/src/pages/flow/roster/Swaps.tsx` | `/flow/roster/swaps` |
| `apps/web/src/pages/flow/roster/Audit.tsx` | `/flow/roster/audit` |
| `apps/web/src/App.tsx` | replace stubs for six routes (modify) |

---

### Task 1: Ops migration (audit trigger + RPCs)

**Files:** Create `supabase/migrations/20260916000004_flow_roster_ops.sql`
**Reference:** spec §4; Phase 1 migration 1 for helper names (`private.get_user_role`, `private.user_manages_branch`)

- [ ] **Step 1: Write migration** per spec §4 items 1–7. Rules:
  - trigger fn `private.flow_audit()` SECURITY DEFINER SET search_path=public; BEFORE/AFTER as needed; populate `old_data`/`new_data` as `to_jsonb(OLD)`/`to_jsonb(NEW)`; skip when `auth.uid()` is null (ETL/service writes).
  - `roster_conflicts(wid)` implements spec §3 incl. overnight overlap and effective min/max from `hour_policies` fallback `employees`; availability via `availability_notes.unavailable_slots` jsonb array entries `{dayOfWeek, allDay, startTime, endTime}`.
  - publish/copy/swap RPCs authorize with `private.user_manages_branch(auth.uid(), branch_id)`; raise `P0001` with stable error codes (`HARD_CONFLICT`, `NOT_DRAFT`, `FORBIDDEN`) so client maps to bilingual copy.
  - `GRANT EXECUTE ... TO authenticated` on the four RPCs only.
  - Additive column: `ALTER TABLE public.availability_notes ADD COLUMN IF NOT EXISTS unavailable_slots jsonb NOT NULL DEFAULT '[]'::jsonb;`
  - `GRANT EXECUTE ON FUNCTION private.flow_audit() TO authenticated` (trigger fires on authenticated DML; private schema stays unexposed so no RPC surface).
- [ ] **Step 2: Apply via Supabase MCP** `apply_migration` (name `20260916000004_flow_roster_ops`) to project `dntmvxfgqmqremdrswij` — same path as Phase 1; no CLI push.
- [ ] **Step 3: Verify** via MCP `execute_sql`: create throwaway draft week + 2 overlapping assignments for a seeded employee; assert `private.roster_conflicts` returns `double_booking/hard`; assert `private.publish_roster_week` raises `HARD_CONFLICT`; then clean up rows.
- [ ] **Step 4: Commit** migration file.

### Task 2: Conflicts engine (TS)

**Files:** `lib/roster/types.ts`, `lib/roster/conflicts.ts`, `lib/roster/conflicts.test.ts`

- [ ] **Step 1: Failing tests** — fixture matrix: double-booking (incl. overnight 22:00–06:00), overtime soft, overtime hard via `hard_block_overtime`, below_min, availability overlap, clean week. Each asserts rule id + severity + employee + date.
- [ ] **Step 2: Implement** pure `detectConflicts(week: {assignments, templates, employees, policies, availability}): Conflict[]`. Overnight rule identical to SQL (end<=start ⇒ +24h). Export `effectiveLimits(employee, policy)`.
- [ ] **Step 3: Parity check** — run Task 1 verification fixtures through TS; assert identical rule ids/severities to SQL output (manual table in commit message).
- [ ] **Step 4: Commit.**

### Task 3: Roster api layer

**Files:** `lib/roster/api.ts`, `lib/roster/api.test.ts`

- [ ] **Step 1: Failing tests** with `vi.mock('@/lib/supabase')`: fetchWeek (fetch-or-create draft for manager), addAssignments batch, removeAssignment, undo not server-side (client stack), copyWeek, publish/unpublish error-code mapping, reviewSwap, audit page query, staff/templates/policies CRUD wrappers.
- [ ] **Step 2: Implement** using singleton client; RPC calls via `.rpc('publish_roster_week', {wid})` etc.; map `P0001` codes to typed errors `{code:'HARD_CONFLICT'|'NOT_DRAFT'|'FORBIDDEN', conflicts?}`.
- [ ] **Step 3: Commit.**

### Task 4: i18n roster keys

**Files:** modify `apps/web/src/i18n/flowMessages.ts`

- [ ] **Step 1:** add `roster.*` keys for nav labels already present + board (week/month, group by station/employee, add shift, copy prev week, copy day, undo, publish, unpublish, conflicts, hours, target), leaf pages, export names, error codes. zh-HK + en both, no missing-key fallback reliance.
- [ ] **Step 2:** extend `FlowLocaleContext.test.tsx` with 2 roster keys round-trip. Commit.

### Task 5: Week board

**Files:** `components/roster/*`, `pages/flow/roster/WeekBoard.tsx`, modify `App.tsx` (route only)

- [ ] **Step 1: Failing component test** — board renders 7 day columns; add dialog batch-selects 2 employees; double-booking shows red badge; publish button disabled + reason; undo restores.
- [ ] **Step 2: Implement** per spec §5 + parity list: grid (station rows default, employee toggle), month view, cell dialog (multi-select + template filter), delete confirm, undo stack 20, copy week/day dialogs, conflict badges, hour sidebar 4 states, headcount x/target, legend, publish/unpublish with soft-confirm dialog, exports (CSV ×2 + print PDF) reusing MeDo algorithms (BOM CSV, print window).
- [ ] **Step 3: Wire route** `/flow/roster` to `WeekBoard` (replace stub).
- [ ] **Step 4: Manual smoke** on `127.0.0.1:5174` per spec §7 board portion.
- [ ] **Step 5: Commit.** ← board contract exists; Tasks 6–10 may now parallelize via subagents (Flash key).

### Task 6: Staff registry

CRUD + search + soft delete + station select (fixed 3) + min/max hours validation (min ≤ max — MeDo gap fix). Tests: render, save validation, deactivate confirm. Commit.

### Task 7: Shift templates

CRUD + 9-color palette + free picker + duration preview (overnight) + headcount target + soft delete. Tests. Commit.

### Task 8: Hour policies

Per-employee table; edit dialog prefills policy-or-employee defaults; hard/soft badge; upsert. Tests. Commit.

### Task 9: Swap approvals

Pending-default filter + branch scope; review dialog notes; approve targeted ⇒ assignments exchange (server); open-bid approve closes; reject; status badges bilingual. Tests incl. open-bid path. Commit.

### Task 10: Audit viewer

50/page load-more, action filter, text search, actor + time + table + notes, **old/new jsonb diff expand** (MeDo gap fix: data now populated). Tests. Commit.

### Task 11: Phase 2 closeout

- [ ] Full `npx tsc -b --noEmit` + `npx vitest run` green; `/retail` smoke.
- [ ] Manual smoke spec §7 end-to-end with pilot manager.
- [ ] `docs/flow-pilot-phase2.md` smoke checklist + known-deferrals list (AI, attendance, notifications, staff UI).
- [ ] Commit.

---

## Spec coverage

| Spec item | Task |
|---|---|
| Ops RPCs + audit trigger | T1 |
| Conflict rules dual impl + fixtures | T2, T1 step 3 |
| Api layer + error mapping | T3 |
| Bilingual keys | T4 |
| Week board parity list | T5 |
| Staff/templates/policies/swaps/audit | T6–T10 |
| Exports | T5 |
| Acceptance smoke | T11 |
| Deferrals honored (no AI/attendance/notifications/staff UI) | T6–T10 scope notes |

## Next plans

Phase 3 (主控台 + DongQia ETL) — blocked on operator providing a DongQia export sample; write its spec after sample lands. Phase 4 after 3. Open Design after 4.
