# IFMP Retail Flow — Phase 2 handoff (for fresh chat / GLM 5.3)

Date: 2026-09-16. Branch: `feature/ifmp-flow-infra` (base `master`, local-only, no remote).

## Read these first (full context lives here)

- Spec: `docs/superpowers/specs/2026-09-16-ifmp-flow-roster-design.md` (§3 conflicts, §4 server writes, §5 UI contract)
- Plan: `docs/superpowers/plans/2026-09-16-ifmp-flow-roster.md` (11 tasks, file map, model strategy)
- Phase 1 plan: `docs/superpowers/plans/2026-09-15-ifmp-retail-flow-infra.md`

## State: Tasks 1–4 DONE, Task 5 (Week board) is next

Commits:
- `58dd890` singleton Supabase client (fixes GoTrueClient echo cascade — do NOT create clients per call; use `createFlowSupabase()` from `apps/web/src/lib/supabase.ts`, it's a module singleton)
- `e2a75a8` Phase 2 spec + plan docs
- `a9280ac` **T1** ops migration `supabase/migrations/20260916000004_flow_roster_ops.sql` — applied to Supabase project `dntmvxfgqmqremdrswij` via MCP. Contains: audit trigger (`private.flow_audit()` on 6 tables, populates old_data/new_data, skips when `auth.uid()` null or `flow.skip_audit=on`), `private.roster_conflicts(wid)` (double_booking hard / overtime_hard / overtime / below_min / availability; overnight = end<=start ⇒ +24h), RPCs `publish_roster_week` / `unpublish_roster_week` / `copy_roster_week` / `review_swap_request` (approve exchanges the two assignments' employee_id), `availability_notes.unavailable_slots jsonb` column. RPCs raise P0001 with stable codes: HARD_CONFLICT, NOT_DRAFT, FORBIDDEN, NOT_FOUND, NOT_PENDING, CROSS_BRANCH. All SQL-verified (conflict detection, publish gate, copy, swap exchange, trigger payload) and cleaned up.
- `3973b27` **T2** TS conflicts engine `apps/web/src/lib/roster/{types.ts,conflicts.ts,conflicts.test.ts}` — pure `detectConflicts(week)` + `effectiveLimits()`; 14 tests green; SQL parity table in fixtures.
- `480e27e` **T3+T4** api layer `apps/web/src/lib/roster/{api.ts,api.test.ts}` (fetchWeekData fetch-or-create, addAssignments batch, removeAssignment, publish/unpublish/copy/reviewSwap RPC wrappers, fetchSwaps, fetchAudit paged, staff/template/policy CRUD, RosterError + mapRpcError, isoWeekInfo/addDays) + ~130 `roster.*`/`common.*` i18n keys (zh-HK + en) in `apps/web/src/i18n/flowMessages.ts` + locale round-trip test. 36 tests green.

Test command (from `apps/web`): `npx vitest run src/lib/roster/ src/context/FlowLocaleContext.test.tsx`

## Task 5 — Week board (remaining strong-model task in T1–5 slice)

Files to create: `apps/web/src/components/roster/*` (BoardGrid, CellDialog, ConflictBadges, HourSidebar, MonthGrid, CopyDialog, ExportMenu) + `apps/web/src/pages/flow/roster/WeekBoard.tsx`; modify `apps/web/src/App.tsx` (replace FlowStubPage route for `/flow/roster`).

Contract (spec §5 + plan Task 5): 7 day columns Mon-start ISO; group by station (default) / employee toggle; month view; cell dialog multi-select employees + template filter; delete confirm; undo stack (20, client-side only — no server undo); copy prev-week / copy-day dialogs (copyWeek RPC for week); conflict badges from `detectConflicts` (red = hard, amber = soft); hour sidebar 4 states (ok/under/overtime-hard/overtime-soft); headcount x/target; publish disabled + reason when hard conflicts, soft-confirm dialog listing soft warnings; unpublish back to draft; exports CSV ×2 (BOM) + print PDF; every string via `t()` from `useFlowLocale` (roster.* keys already exist); error banner maps RosterError codes to bilingual copy (`roster.error.HARD_CONFLICT` etc.). No drag-drop — click/dialog only. Dark ops styling via existing `flow.css` tokens.

Failing component test first (TDD): renders 7 columns; add dialog batch-selects 2 employees; double-booking shows red badge; publish disabled with reason; undo restores.

## After T5: Tasks 6–10 (leaf CRUD pages — Flash model OK, parallelizable)

Staff (`/flow/roster/staff`), Templates (`/flow/roster/templates`), Policies (`/flow/roster/policies`), Swaps (`/flow/roster/swaps`), Audit (`/flow/roster/audit`) — pages replace stubs in `App.tsx`. Then T11 closeout. Phase 3 = footfall 主控台; Phase 4 = Open Design visual pass (intentionally last).

## Environment quirks (Windows)

- Shell tool needs `request_smart_mode_approval: true` (sandbox backend unavailable — not a permission denial). PowerShell: use `;` not `&&`.
- Supabase MCP `apply_migration` / destructive `execute_sql` may trigger approval cards; re-send same call with `requestSmartModeApproval: true` + block reason. Read-only `execute_sql` runs fine.
- No git remote / no `gh` CLI — commits are local-only by user choice.
- Pilot login: `manager@ifmphk.com` / `demo1234` (branch_manager, I.T. 銅鑼灣 branch `a0000000-0000-4000-8000-000000000001`).
