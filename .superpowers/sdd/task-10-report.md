# Task 10 Report — Roster week board (mock-backed)

**Status:** Complete  
**Branch:** `feature/ifmp-retail-demo`  
**BASE before work:** `1ad361cbd503b3ea3b6082dc2c17fb2a1c811f9a`  
**Commit:** (see git) — `feat: mock roster week board for retail demo`  
**Date:** 2026-09-04  

---

## Deliverables

| Path | Action |
|------|--------|
| `apps/web/src/mocks/roster-board.json` | Mock employees / teal templates / assignments; stations 樓面·試衣·收銀 |
| `apps/web/src/lib/rosterBoardStore.ts` | `loadBoard` / `upsertAssignment` / `removeAssignment` / `detectConflicts`; session override |
| `apps/web/src/lib/rosterBoardStore.test.ts` | Hard double_booking; soft under/overstaff; persist; stations |
| `apps/web/src/components/retail/HourBar.tsx` | Weekly hours bar (IFMP teal / warning / danger) |
| `apps/web/src/components/retail/RosterWeekBoard.tsx` | Week grid, chips, add dialog, conflict badges, hours sidebar |
| `apps/web/src/pages/retail/Roster.tsx` | Tabs **需求 \| 週更表**; board section composed |
| `apps/web/src/pages/retail/Roster.test.tsx` | Tab + stations smoke |
| `apps/web/src/i18n/messages.ts` | `roster.sectionDemand` / `roster.sectionBoard` |
| `apps/web/src/retail.css` | Week board + hour-bar tokens (no amber restaurant theme) |

### Target headcount formula (in store comment)

`targetHeadcount = max(demandSuggested[])` — peak of demand-layer hourly suggested (session override from demand tuner wins). Soft understaff when unique day assignees &lt; target; soft overstaff when count &gt; target × 1.5.

---

## TDD evidence

### RED

```
FAIL  rosterBoardStore.test.ts
Error: Failed to resolve import "./rosterBoardStore"
```

Failure reason: feature missing (store not yet created).

### GREEN

```
Test Files  1 passed (1)
     Tests  5 passed (5)
```

Full suite after UI:

```
Test Files  13 passed (13)
     Tests  37 passed (37)
```

---

## Verification

| Check | Result |
|-------|--------|
| `npm test` (`apps/web`) | Exit 0 — 37/37 pass |
| `npm run build` (`tsc -b && vite build`) | Exit 0 — chunk &gt;500 kB warning only, pre-existing |

---

## Concerns

- Day target is a single peak shared across the week (one demand curve mock); not per-weekday demand.
- Soft understaff fires on most days with sparse seed assignments vs peak 9 — intentional demo signal.
- Hours sidebar hidden below ~1100px; grid remains usable.

## Follow-ups

Task 11: Coach + Energy + Settings polish if still pending.
