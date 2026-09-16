# IFMP Retail — Phase 5 pilot-close checklist

> Branch: `feature/ifmp-flow-infra`
> Date: 2026-09-16
> Demo day pin: `FLOW_DEMO_DAY = '2026-09-16'`

This doc records the static checks and browser smoke steps for the Phase 5 close.

## 1. Static checks (automated)

Run from repo root (PowerShell):

```powershell
# No page or lib imports the deletable shell implementation
rg "from '@/shell/pilot-v1'" apps/web/src/pages apps/web/src/lib
# Banned command-center tokens
rg "Inter|38BDF8|0B0F17" apps/web/src/shell/pilot-v1
# No competitor references
rg "优衣库|Uniqlo" apps/web/src supabase/migrations/20260916000009_flow_roster_demo_seed.sql
# The retail demo is removed; nothing may still import it
rg "pages/retail|components/retail|api/retail|retail\.css|Retail[A-Z]|DemoSpine" apps/web/src
```

Expected: first two produce no output; third only the "Never 优衣库" comment; fourth empty.

The former `/retail` demo was deleted once `/flow` superseded it. `/flow` had no
import dependency on it (`chartStyle.ts` and `journeyMetrics.ts` are shared and
were kept). Legacy `/retail` and `/retail/*` links redirect to `/flow`.

Run from `apps/web`:

```powershell
npx tsc --noEmit --project tsconfig.json --ignoreDeprecations 6.0
npx vitest run src/lib/roster/api.test.ts src/lib/footfall/api.test.ts src/pages/flow/Overview.test.tsx src/pages/flow/Settings.test.tsx src/components/flow/FlowShell.test.tsx src/pages/flow/roster/WeekBoard.test.tsx src/App.test.tsx
npx vite build
```

Expected: `tsc` exits 0; 7 test files pass; build succeeds.

## 2. Seeded demo IDs

Migration: `supabase/migrations/20260916000009_flow_roster_demo_seed.sql`

| Entity | IDs |
|--------|-----|
| Branch | `a0000000-0000-4000-8000-000000000001` |
| Employees | `b0000000-0000-4000-8000-000000000001` … `0008` |
| Shift templates | `b0000000-0000-4000-8000-000000000011` … `0016` |
| Roster weeks | `b0000000-0000-4000-8000-000000000021` (ISO 37, published) / `0022` (ISO 38, draft) |
| Hour policies | `b0000000-0000-4000-8000-000000000041` / `0042` |
| Availability note | `b0000000-0000-4000-8000-000000000051` (Suki, Sat afternoon) |
| Named assignments (swap) | `b0000000-0000-4000-8000-000000000201` (e1, Mon 14 Sep) / `0202` (e2, Wed 16 Sep) |
| Swap request | `b0000000-0000-4000-8000-000000000031` (e1 ↔ e2, pending) |

Apply the migration to the Supabase project before browser smoke:

```bash
supabase migration up
# or apply via Supabase dashboard SQL editor
```

## 3. Browser smoke checklist

1. Start the dev server: from `apps/web`, `npm run dev` on **5174**.
2. Log in with the DongQia manager account (credentials kept outside git).
3. Walk each path:

### `/flow` — Overview
- Widgets show numbers; no empty "尚未匯入資料" cards.
- Honesty line includes the pinned demo day: `定格於 2026-09-16`.
- Compact heatmap is rendered inside the shop walls.

### `/flow/journey` — Journey heatmap
- Heat inside walls; zone name boxes use black text on the label box.
- Data reflects the demo day (`2026-09-16`), not an empty future date.

### `/flow/roster` — Week board
- Week 2026-09-14 (ISO 38) is selected automatically.
- Grid shows employees: 陳嘉欣 / 林子軒 / 黃詩琪 / 周浩然 / 吳詠琳 / 鄭曉彤 / 馬偉明 / 李芷晴.
- Stations include 樓面 / 試衣 / 收銀.
- Soft conflict badges may appear; the draft week must **not** be blocked by hard conflicts (publish button enabled).

### `/flow/roster/swaps` — Swap approvals
- One pending swap row is visible.

### `/flow/roster/staff` — Staff registry
- Eight employee rows.

### `/flow/settings` — Settings
- Heading is 設定 / Settings after toggling locale.
- Light / Night radios switch the `data-theme` attribute and repaint the chrome.
- Night uses navy tokens; Light returns paper.
- Locale EN shows "I.T. Causeway Bay".

### Responsive (< 900px)
- Nav collapses to a horizontal chip row.
- Overview widgets remain reachable and scrollable.

## 4. Known pre-existing issues

- `Templates.test.tsx` has a 5-second timeout. Do not treat as a Phase 5 regression.
- TypeScript emits deprecation warning `TS5101 baseUrl` (pre-existing). Add `--ignoreDeprecations 6.0` to silence.
- Vite build warns about a single JS chunk > 500 kB (pre-existing monolith; not addressed in this phase).
- The full suite is load-sensitive. Under CPU contention roughly 15 tests across 10 files
  fail on jsdom timeouts, and the run takes about 27s instead of 8s. Seen once on
  2026-09-17 and re-run clean. Treat a sudden mass failure with no code change as
  contention: check the duration first, and re-run before investigating. Fixing it
  properly means changing the Vitest pool (`vmThreads`) or `isolate`, which is
  out of scope here.
