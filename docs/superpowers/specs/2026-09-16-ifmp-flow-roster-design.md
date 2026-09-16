# IFMP Retail (pilot) — Phase 2 Design Spec: 排班 (Roster, manager parity)

> **Date:** 2026-09-16
> **Status:** **Approved** (2026-09-16, by product owner in-session)
> **Parent spec:** `docs/superpowers/specs/2026-09-15-ifmp-flow-design.md`
> **Behavioral reference:** `_reference/hk-roster-planner` (MeDo extract) — port behavior, not bugs
> **Plan:** `docs/superpowers/plans/2026-09-16-ifmp-flow-roster.md`

## 1. Summary

Phase 2 delivers the **branch_manager roster surface** under `/flow/roster/*` at MeDo parity: week board (draft → publish with hard-conflict blocking), staff registry, shift templates, hour policies, swap approvals, audit viewer, and exports. All bilingual (zh-HK + en). Data lives in the Phase 1 Supabase schema; **no schema rewrite** — one additive migration for server-side audit + publish/copy/swap RPCs.

## 2. Scope

### In scope (manager only)

| Surface | Route | Parity source |
|---|---|---|
| Week board | `/flow/roster` | `RosterBoardPage.tsx` |
| Staff registry | `/flow/roster/staff` | `EmployeesPage.tsx` |
| Shift templates | `/flow/roster/templates` | `ShiftTemplatesPage.tsx` |
| Hour policies | `/flow/roster/policies` | `HourPoliciesPage.tsx` |
| Swap approvals | `/flow/roster/swaps` | `SwapRequestsPage.tsx` |
| Audit log | `/flow/roster/audit` | `AuditLogPage.tsx` |

Week board feature set (parity list, verified against reference):
- Week grid Mon–Sun; rows groupable by **station** (default) or **employee**
- Month calendar view (aggregate chips, `+N` overflow)
- Assignment create via per-cell dialog with **multi-employee batch select** (search, select-all, per-station quick-select); template picker filtered to row station
- Assignment delete with confirm; **undo stack** (20 deep) for create/delete
- **Copy previous week**; **copy day** (within week)
- Draft-only editing; published weeks read-only until unpublished (改回草稿)
- Conflict badge row: hard (red) blocks publish, soft (amber) warns, green when clean
- Hour sidebar: per-employee weekly hours bar, 4 states (ok / under min / ≥90% max warn / exceeded)
- Headcount target per cell (`x/target`, amber when under) + color legend
- Publish / unpublish; publish blocked on hard conflicts
- Exports: week grid CSV, employee hours CSV, print-to-PDF (client-side, same as MeDo)

### Out of scope (confirmed deferrals)

- 員工 (staff-facing) flows, incl. staff swap creation UI and availability entry — Phase 7 per parent spec. **Note:** staff-created swap rows may already exist via API; manager approvals must handle them.
- AI roster planning + AI chat (`ai-roster-generate`, `roster-chat`) — parent spec non-goal
- Attendance import/comparison — parent spec non-goal
- Notifications fan-out on publish — no table in our schema; deferred
- Owner surfaces: branches page, branch-manager assignment UI — single-branch pilot
- Custom stations (MeDo localStorage hack) — pilot fixes stations to 樓面 / 試衣 / 收銀

## 3. Conflict rules (single source of truth)

Rules implemented **twice, tested against shared fixtures**: TypeScript `detectConflicts()` for live board feedback, and SQL `private.roster_conflicts(week_id)` as the publish gate. Same rule ids, same severities.

| id | severity | rule |
|---|---|---|
| `double_booking` | hard | same employee, same `work_date`, shift time ranges overlap (overnight-aware: `end <= start` ⇒ +24h) |
| `overtime_hard` | hard | weekly hours > effective max **and** effective policy `hard_block_overtime = true` |
| `overtime` | soft | weekly hours > effective max, no hard block |
| `below_min` | soft | weekly hours < effective min (only if employee has any assignment that week) |
| `availability` | soft | assignment overlaps an `availability_notes.unavailable_slots` entry for that week |

Effective min/max = `hour_policies` row when present, else `employees` columns. (MeDo bug fix: reference never read `hour_policies`.)
`understaffed` stays **display-only** (cell counter), never a conflict row — same as MeDo.

Publish gate: any `hard` row ⇒ block, bilingual message listing employee + date. Soft rows ⇒ confirm dialog enumerating warnings, then publish allowed.

## 4. Server-side writes (migration `20260916000004_flow_roster_ops.sql`)

Phase 1 RLS has **no client INSERT on `audit_logs`** — audit must be server-side. Additive migration only:

1. `private.flow_audit()` trigger fn (SECURITY DEFINER, `search_path=public`) on `assignments`, `roster_weeks`, `employees`, `shift_templates`, `swap_requests`, `hour_policies`: writes `create|update|delete` rows with **populated `old_data`/`new_data`** (MeDo gap fix), `actor_id = auth.uid()`.
2. `private.roster_conflicts(wid uuid)` → setof(employee_id, work_date, kind, severity, detail jsonb). SQL mirror of §3.
3. `private.publish_roster_week(wid uuid)`: authorize via `user_manages_branch`; reject if not draft; reject if `roster_conflicts` yields hard; set status/published_at/published_by; audit `publish`. Raises ⇒ client shows bilingual error.
4. `private.unpublish_roster_week(wid uuid)`: manager-only; back to draft, null publish fields; audit `update` via trigger (no extra row).
5. `private.copy_roster_week(src uuid, dst uuid)`: manager-only; bulk-insert assignments shifted by week delta; audit `copy_week`.
6. `private.review_swap_request(id uuid, approve boolean, notes text)`: manager-only; set status/reviewed_*; **if approve and targeted swap: exchange the two assignments' `employee_id` in one transaction** (MeDo PRD promise, unimplemented in reference); open-bid approve closes without mutation; audit `approve_swap|reject_swap`.
7. `GRANT EXECUTE` on 3–6 to `authenticated` (intended RPC surface; helpers stay private-only).

No new tables. No RLS policy changes. One additive column: `availability_notes.unavailable_slots jsonb NOT NULL DEFAULT '[]'` (MeDo 00008 parity; staff entry UI deferred, column lands now so the `availability` conflict rule has data to read).

## 5. UI contract

- Shell/nav unchanged (links already exist as stubs); pages replace `FlowStubPage` for the six routes.
- Every string via `t()` from `FlowLocaleContext`; new keys under `roster.*` in `flowMessages.ts` (zh-HK + en). No hardcoded zh (MeDo gap fix).
- Empty states bilingual; loading skeletons; error banner with retry (parent spec §7).
- Board interactions: click/dialog only — **no drag-drop** (matches MeDo; avoids a11y + test cost).
- Dates: ISO weeks, Monday start; labels via locale (`zh-HK`: 週一…; en: Mon…).
- Dark ops look continues `flow.css` tokens; no new design system work (Open Design later).

## 6. Quality bar

- Unit: `conflicts.ts` fixture matrix (each rule × pass/fail, overnight cases, policy-override cases).
- Unit: RPC-free api layer with mocked supabase client.
- Component: board add/delete/undo/publish-blocked flows; each leaf page render + one mutation.
- SQL: verification run against pilot DB via Supabase MCP (`execute_sql`) — seed a draft week, assert `roster_conflicts` output equals TS output on same fixtures, assert publish raises on hard conflict.
- Typecheck + full vitest green; `/retail` untouched.

## 7. Acceptance (manual smoke)

Manager signs in → opens 排班 → week board loads draft → adds multi-employee shift → creates double-booking → red badge appears → publish blocked with bilingual reason → fixes → publishes → board read-only → unpublishes → copies previous week → approves a targeted swap and sees assignments exchanged → audit page shows create/publish/copy_week/approve_swap rows **with old/new diffs** → exports CSV opens in Excel with correct zh headers.
