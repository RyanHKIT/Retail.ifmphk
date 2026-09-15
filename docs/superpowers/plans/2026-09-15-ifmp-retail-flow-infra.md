# IFMP Retail Flow — Phase 1 Infra Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL for this phase: **superpowers:executing-plans** (inline). Do **not** default to subagent-driven-development for Phase 1 — tasks are short, sequential, and already specified. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up IFMP Retail pilot infrastructure: new Supabase project (roster + footfall schema, Auth, RLS), Vite `/flow` shell with login + i18n, without touching legacy `/retail` pitch.

**Architecture:** Sibling route tree under `apps/web` (`/flow/*`) with `FlowShell`, Supabase JS client (anon key only), migrations adapted from `_reference/hk-roster-planner` plus new footfall tables. FE never holds vendor or `service_role` secrets.

**Tech Stack:** Vite 8, React 19, react-router-dom 7, Vitest, Tailwind 4, Supabase (Postgres + Auth + RLS), `@supabase/supabase-js`

**Spec:** `docs/superpowers/specs/2026-09-15-ifmp-flow-design.md` (Approved)

## Global Constraints

- Product UI name: **IFMP Retail**; site label: **I.T. Causeway Bay** / **I.T. 銅鑼灣** — never show 优衣库/Uniqlo in customer chrome
- Locale: Traditional Chinese (zh-HK) + English toggle
- Do **not** modify `/retail/*` pages, `retail.css` global behavior, or legacy mock SoT except read-only reference
- No DongQia passwords or Supabase `service_role` in git / client bundle
- Primary role for pilot: **branch_manager**; staff UI out of this plan
- Publish target later: `retail.ifmphk.com` — not in this plan’s deploy cutover

**Out of this plan:** MeDo roster UI, 主控台 charts, heatmap redesign, Uniqlo ETL job, Open Design, 員工 app

## Execution strategy (ROI)

Optimise for **return on investment**: correct once, minimal rework — not the absolute cheapest model on every turn.

### Operator reminders (human)

- **Normal chat / planning / Q&A:** keep Cursor on **Auto**. No key switch required.
- **Before starting each phase implementation:** switch the **agent model** (and **API key** if your gateway uses separate keys per model — see below). Do this before the first implementation turn of that phase.
- Agent should **remind you** at the start of Phase 1 / 2 / 3 / 4 execution: which model + which key profile to select.

### API keys (Flash vs 5.3)

`glm-5.3-flash` and `glm-5.3` use **different API keys** on this gateway. Switching the model in Cursor is not enough if the active key only authorises one model.

| When | Model | Key / profile |
|------|--------|----------------|
| Phase 1 default implement | `glm-5.3-flash` | **Flash key** |
| Phase 1 escalate (RLS, Auth gate, hard migration debug) | **`qwen3.8-max`** (preferred — same gateway key as Auto) or `glm-5.3` | Prefer **no key switch** (max); switch to 5.3 key only if max unavailable |
| Phase 2 week board / conflicts / publish | `glm-5.3` | **5.3 key** for that slice |
| Phase 2 leaf CRUD pages | `glm-5.3-flash` | **Flash key** |
| Phase 3 ETL / field mapping | `glm-5.3` | **5.3 key** until mapping verified |
| Phase 3 chart widgets | `glm-5.3-flash` | **Flash key** |
| Phase 4 heatmap UX / interaction | `glm-5.3` | **5.3 key** |
| Phase 4 wiring after UX locked | `glm-5.3-flash` | **Flash key** |
| Normal chat | Auto | No change (whatever Auto uses) |

**Switch key when:** moving from Flash work → full 5.3 work, or the reverse.  
**Do not switch key when:** staying on Auto for discussion, or staying on the same model for consecutive tasks.

If a request fails with auth / model-not-allowed errors after a model change, the usual cause is **stale key for the newly selected model** — switch key profile, then retry.

### Models (gateway list prices, HKD / 1M tokens — indicative)

| Model | Input | Output | Cache | Role |
|-------|-------|--------|-------|------|
| `glm-5.3-flash` | ~0.75 | ~2.64 | ~0.19 | **Default implementer** for well-specified steps (**Flash key**) |
| `qwen3.8-max` | ~11 | ~33 | ~2 | **Preferred escalator / planner** — same key as Auto (**no extra switch**) |
| `glm-5.3` | ~7.54 | ~28.26 | ~1.88 | Alternate escalator when max unavailable (**5.3 key**) |
| Grok 4.6 (or similar high-cost) | — | — | — | **Not** default. Optional rare hard review only |

Flash is ~10× cheaper than full `glm-5.3`. Prefer Flash when the plan already contains exact SQL/files/tests. Escalate to `glm-5.3` when a wrong Auth/RLS or migration decision would force expensive rework.

### Phase 1 (this plan)

| Choice | Decision |
|--------|----------|
| Mode | **Inline** (executing-plans) in one session |
| Default model | **`glm-5.3-flash`** + **Flash API key** |
| Escalate | **`qwen3.8-max`** (same key as Auto — no switch) for Task 1 RLS policies, Task 6 Auth gate / `RequireManager`, migration diagnosis; `glm-5.3` + 5.3 key only if max unavailable |
| Subagents | **Avoid** — overhead outweighs benefit on short sequential tasks |
| Grok | **Do not use** for Phase 1 |
| Pre-flight (human) | Before Task 1: set model **Flash** + **Flash key**. Agent must remind once at phase start. |

### Later phases (guidance for upcoming plan docs)

| Phase | Mode | Model + key | Notes |
|-------|------|-------------|--------|
| **2 — Roster manager UI** | Hybrid: inline for week board core; subagents OK for leaf CRUD pages | Start phase on **5.3 key** for board/conflicts/publish; switch to **Flash key** for staff/templates/policies/audit | Optional **one** high-cost review of board+publish only — not per-task. **Remind model+key at phase start.** |
| **3 — 主控台** | Inline or light subagents after ETL contract locked | Start on **5.3 key** for Uniqlo→Supabase mapping; switch to **Flash key** for widgets | Wrong mapping wastes all widget work — spend here. **Remind at phase start.** |
| **4 — Journey heatmap** | Open Design for visual world first; then Cursor implement | Start implement on **5.3 key** (UX); switch to **Flash key** for wiring | Do not skin legacy `/retail/journey`. **Remind at phase start.** |
| Open Design / 員工 / cutover | Separate plans | Flash key for mechanical work; 5.3 key if deploy/auth edge cases | Auto OK for planning chat |

**Anti-patterns (all phases):** Grok (or equivalent) on every subagent; Flash-only on RLS/ETL with no review; subagent farms on Phase 1; forgetting to switch **key** when switching **model**.

### Pre-execution validation gate (this project)

Before Task 1 (human): switch session to **qwen3.8-max**. Run **one** validation pass over:

- `docs/superpowers/specs/2026-09-15-ifmp-flow-design.md`
- This plan

Check: spec coverage per task, RLS/Auth correctness, i18n keys, secret hygiene, `/retail` isolation, test steps executable. **Patch inline; do not rewrite the plan wholesale.** Then switch to Flash model + Flash key for execution.

### Workflow for future projects

| Stage | Model |
|-------|-------|
| Free chat / naming / scope Q&A | **Auto** |
| Superpowers brainstorming → spec approval | **qwen3.8-max** |
| Plan writing + self-review | **qwen3.8-max** |
| Pre-execution validation pass | **qwen3.8-max** (one pass; patch, not rewrite) |
| Execution | **Flash** (+ escalate max/Grok when stuck) |
| Normal chat | **Auto** |

Do **not** use max from the first message (early turns are human-driven). Do **not** wait until plan writing only (weak spec → wrong plan → rework).

---

## File map (Phase 1)

| Path | Responsibility |
|------|----------------|
| `supabase/config.toml` | Local/linked Supabase project config (CLI) |
| `supabase/migrations/20260915000001_flow_roster_core.sql` | MeDo-adapted roster enums/tables + RLS helpers |
| `supabase/migrations/20260915000002_flow_footfall_core.sql` | Footfall / zones / calendar tables + RLS |
| `supabase/migrations/20260915000003_flow_seed_causeway.sql` | Branch + manager seed placeholders |
| `apps/web/.env.example` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| `apps/web/src/lib/supabase.ts` | Browser client factory |
| `apps/web/src/context/FlowAuthContext.tsx` | Session + profile role |
| `apps/web/src/context/FlowLocaleContext.tsx` | zh-HK \| en |
| `apps/web/src/i18n/flowMessages.ts` | Flow string catalog |
| `apps/web/src/components/flow/FlowShell.tsx` | Nav + top bar |
| `apps/web/src/pages/flow/Login.tsx` | Email/password login |
| `apps/web/src/pages/flow/OverviewPlaceholder.tsx` | Post-login landing stub |
| `apps/web/src/styles/flow.css` | Dark ops tokens (minimal shell) |
| `apps/web/src/App.tsx` | Mount `/flow` routes + home hub link |
| `apps/web/src/**/*.test.tsx` | Vitest coverage for shell/auth gate |

---

### Task 1: Supabase CLI project + roster core migration

**Files:**
- Create: `supabase/config.toml` (via CLI init if missing)
- Create: `supabase/migrations/20260915000001_flow_roster_core.sql`
- Reference: `_reference/hk-roster-planner/supabase/migrations/00001_initial_schema.sql`

**Interfaces:**
- Produces: tables `profiles`, `branches`, `branch_managers`, `employees`, `shift_templates`, `roster_weeks`, `assignments`, `swap_requests`, `audit_logs`, `hour_policies`, `availability_notes`; enums `user_role`, `roster_status`, `swap_status`, `audit_action`; RLS enabled; helper `public.is_branch_manager(uuid)` (or equivalent from MeDo 00004 pattern)

- [ ] **Step 1: Init Supabase at repo root**

```bash
cd "C:\Users\rchan\物業管理 AI\ifmp-shop"
npx supabase init
```

Expected: `supabase/config.toml` exists. If already present, skip init.

- [ ] **Step 2: Create roster migration by adapting MeDo 00001**

Copy enums + tables from `_reference/hk-roster-planner/supabase/migrations/00001_initial_schema.sql` into `supabase/migrations/20260915000001_flow_roster_core.sql`.

Required edits vs MeDo:
- Default `employees.station` check / comment: allow `樓面` | `試衣` | `收銀` (retail)
- Keep RLS `ENABLE` on all tables
- Include profile sync trigger on `auth.users` from MeDo file
- Read `_reference/hk-roster-planner/supabase/migrations/00003_fix_rls_staff_visibility.sql` and `00004_fix_rls_helper_and_fix_staff_policies.sql` (names as shipped) for the **helper-function pattern** (`is_branch_manager` or equivalent). Copy the helper into this migration; do not invent a different authorization helper.
- Manager policies: SELECT/UPDATE/INSERT on branch-scoped rows via the helper; **no client-side write policies on `audit_logs`** (writes happen via DB triggers or later server-side only).
- Staff can SELECT own employee row only (policies OK even if UI deferred)

- [ ] **Step 3: Apply migration to linked project**

```bash
npx supabase login
npx supabase link --project-ref <NEW_PROJECT_REF>
npx supabase db push
```

Expected: migration applied without error. Create the Supabase project in dashboard first (new project — not shared prod IFMP if that exists).

- [ ] **Step 4: Commit**

```bash
git add supabase/config.toml supabase/migrations/20260915000001_flow_roster_core.sql
git commit -m "feat(flow): add Supabase roster core migration"
```

---

### Task 2: Footfall + zones schema migration

**Files:**
- Create: `supabase/migrations/20260915000002_flow_footfall_core.sql`

**Interfaces:**
- Consumes: `public.branches(id)`
- Produces: tables below; all RLS on; manager SELECT for assigned branch

```sql
-- Conceptual shape (put full SQL in migration file)

create table public.entrances (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  name_zh text not null,
  name_en text not null default '',
  sort_order int not null default 0
);

create table public.footfall_hourly (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  hour_start timestamptz not null,
  in_count int not null default 0,
  out_count int not null default 0,
  passersby_count int not null default 0,
  unique (branch_id, hour_start)
);

create table public.footfall_daily (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  day date not null,
  in_count int not null default 0,
  out_count int not null default 0,
  unique_visitors int not null default 0, -- 去重 = unique
  unique (branch_id, day)
);

create table public.entrance_hourly (
  id uuid primary key default gen_random_uuid(),
  entrance_id uuid not null references public.entrances(id) on delete cascade,
  hour_start timestamptz not null,
  in_count int not null default 0,
  out_count int not null default 0,
  unique (entrance_id, hour_start)
);

create table public.audience_daily (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  day date not null,
  gender text not null,      -- male | female | unknown
  age_group text not null,   -- e.g. 0-17 | 18-24 | 25-34 | 35-44 | 45-54 | 55+
  visitor_count int not null default 0,
  unique (branch_id, day, gender, age_group)
);

create table public.calendar_days (
  day date primary key,
  is_holiday boolean not null default false,
  name_zh text not null default '',
  name_en text not null default ''
);

create table public.zones (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  zone_key text not null,
  name_zh text not null,
  name_en text not null default '',
  anchor_x numeric not null,
  anchor_y numeric not null,
  anchor_r numeric not null default 10,
  unique (branch_id, zone_key)
);

create table public.heatmap_daily (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.zones(id) on delete cascade,
  day date not null,
  visit_count int not null default 0,
  avg_dwell_sec numeric not null default 0,
  intensity numeric not null default 0,
  unique (zone_id, day)
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  name text not null,
  status text not null default 'online',
  last_seen_at timestamptz
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  severity text not null default 'info',
  title_zh text not null,
  title_en text not null default '',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- branches also store floor_plan_url text default ''
alter table public.branches add column if not exists floor_plan_url text not null default '';
alter table public.branches add column if not exists floor_plan_label_zh text not null default '';
alter table public.branches add column if not exists floor_plan_label_en text not null default '';
```

- [ ] **Step 1: Write migration file** with full SQL (enums not required; text checks OK for pilot) + RLS policies mirroring roster manager scope

RLS notes for this migration:
- All new tables: `ENABLE ROW LEVEL SECURITY`.
- Manager: SELECT on rows whose `branch_id` is assigned via `branch_managers` (reuse helper from Task 1).
- **No INSERT/UPDATE/DELETE policies for client roles** on footfall / audience / calendar / heatmap tables — data arrives via ETL (service role or SQL), never from the browser.
- `calendar_days`: SELECT for authenticated manager (or anon read-only if you prefer; keep manager-only for pilot).
- `alerts` / `devices`: manager SELECT; resolve/write later server-side.

- [ ] **Step 2: Push**

```bash
npx supabase db push
```

Expected: success

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260915000002_flow_footfall_core.sql
git commit -m "feat(flow): add footfall and zone schema"
```

---

### Task 3: Seed I.T. Causeway Bay + manager user

**Files:**
- Create: `supabase/migrations/20260915000003_flow_seed_causeway.sql` (branch + entrances + empty structure only)
- Create: `scripts/flow-seed-manager.md` (manual steps — no password in repo)

**Interfaces:**
- Produces: one `branches` row named I.T. Causeway Bay / I.T. 銅鑼灣; 2–3 `entrances`; auth user created in Dashboard with `profiles.role = branch_manager` and `branch_managers` link

- [ ] **Step 1: Seed branch SQL** (no auth users in SQL — Auth dashboard or `supabase auth` admin locally)

```sql
insert into public.branches (id, name_zh, name_en, address, is_active)
values (
  'a0000000-0000-4000-8000-000000000001',
  'I.T. 銅鑼灣',
  'I.T. Causeway Bay',
  'Hong Kong',
  true
)
on conflict (id) do nothing;
```

(Use fixed UUID only if `branches.id` insert allowed; otherwise insert without id and document the generated id in `scripts/flow-seed-manager.md`.)

- [ ] **Step 2: Document manager seed**

In `scripts/flow-seed-manager.md`:
1. Dashboard → Authentication → Add user (email/password) — password only in password manager
2. Set `profiles.role = 'branch_manager'`
3. Insert `branch_managers (profile_id, branch_id)`
4. Verify login works with anon key from local app later

- [ ] **Step 3: Push seed migration + commit**

```bash
npx supabase db push
git add supabase/migrations/20260915000003_flow_seed_causeway.sql scripts/flow-seed-manager.md
git commit -m "feat(flow): seed Causeway Bay branch placeholders"
```

- [ ] **Step 4: Order note (human, after push)**

1. Push this migration **before** creating the auth user (profile trigger needs tables).
2. Create manager in Auth dashboard → verify `profiles` row exists with role default.
3. Update `profiles.role = 'branch_manager'`, then insert `branch_managers` row.
4. Record the profile UUID in `scripts/flow-seed-manager.md` (no passwords).

---

### Task 4: Install Supabase client + env

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/.env.example`
- Create: `apps/web/src/lib/supabase.ts`
- Create: `apps/web/src/lib/supabase.test.ts`
- Ensure: `apps/web/.env` gitignored — **verified at repo root** `.gitignore` (`.env`, `.env.*`, `!.env.example`); no extra work unless someone adds a conflicting app-level ignore

**Interfaces:**
- Produces: `createFlowSupabase(): SupabaseClient` reading `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

- [ ] **Step 1: Write failing test**

```ts
// apps/web/src/lib/supabase.test.ts
import { describe, expect, it, vi } from 'vitest'

describe('createFlowSupabase', () => {
  it('throws when env missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    const { createFlowSupabase } = await import('./supabase')
    expect(() => createFlowSupabase()).toThrow(/VITE_SUPABASE/)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL** (module missing)

```bash
cd apps/web && npm test -- src/lib/supabase.test.ts
```

- [ ] **Step 3: Implement**

```bash
cd apps/web && npm install @supabase/supabase-js
```

```ts
// apps/web/src/lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function createFlowSupabase(): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required')
  }
  return createClient(url, anon)
}
```

`.env.example`:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd apps/web && npm test -- src/lib/supabase.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/.env.example apps/web/src/lib/supabase.ts apps/web/src/lib/supabase.test.ts
git commit -m "feat(flow): add Supabase browser client"
```

---

### Task 5: Flow locale + messages

**Files:**
- Create: `apps/web/src/i18n/flowMessages.ts`
- Create: `apps/web/src/context/FlowLocaleContext.tsx`
- Create: `apps/web/src/context/FlowLocaleContext.test.tsx`

**Interfaces:**
- Produces: `useFlowLocale(): { locale: 'zh-HK' | 'en'; setLocale, t: (key: string) => string }`
- Persist key: `ifmp_flow_locale`

- [ ] **Step 1: Failing test** — render provider, click toggle, expect `nav.overview` English string

Repo test conventions: `vitest` with `globals: true` and `src/test/setup.ts` (jest-dom). Existing tests import matchers implicitly; import `test` explicitly from `vitest` for clarity.

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { test } from 'vitest'
import { FlowLocaleProvider, useFlowLocale } from './FlowLocaleContext'

function Probe() {
  const { t, setLocale } = useFlowLocale()
  return (
    <div>
      <span>{t('nav.overview')}</span>
      <button type="button" onClick={() => setLocale('en')}>EN</button>
    </div>
  )
}

test('toggles overview label to English', async () => {
  render(
    <FlowLocaleProvider>
      <Probe />
    </FlowLocaleProvider>,
  )
  expect(screen.getByText('主控台')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'EN' }))
  expect(screen.getByText('Overview')).toBeInTheDocument()
})
```

If `@testing-library/user-event` missing: `npm install -D @testing-library/user-event`

- [ ] **Step 2: Implement messages + provider** with at least keys: `product.name` (IFMP Retail), `site.name`, `nav.overview`, `nav.login`, `nav.roster`, `nav.journey`, `auth.signIn`, `auth.signOut`

- [ ] **Step 3: Tests pass + commit**

```bash
cd apps/web && npm test -- src/context/FlowLocaleContext.test.tsx
git add apps/web/src/i18n/flowMessages.ts apps/web/src/context/FlowLocaleContext.tsx apps/web/src/context/FlowLocaleContext.test.tsx
git commit -m "feat(flow): add zh-HK/en locale context"
```

---

### Task 6: Auth context + login page + route gate

**Files:**
- Create: `apps/web/src/context/FlowAuthContext.tsx`
- Create: `apps/web/src/pages/flow/Login.tsx`
- Create: `apps/web/src/pages/flow/Login.test.tsx`
- Create: `apps/web/src/components/flow/RequireManager.tsx`

**Interfaces:**
- Consumes: `createFlowSupabase`, `profiles.role`
- Produces: `useFlowAuth(): { session, profile, signIn, signOut, loading }`
- `RequireManager` redirects to `/flow/login` when no session

- [ ] **Step 1: Write Login test with mocked supabase** — `vi.mock('@/lib/supabase', …)` returning fake client; submitting email/password calls `signInWithPassword`; on success navigates to `/flow`

- [ ] **Step 2: Implement Auth context + Login + RequireManager**

Login copy: product **IFMP Retail**, site hint I.T. Causeway Bay. Errors bilingual via `t()`.

`RequireManager` must redirect to `/flow/login` when: no session, profile missing, or `profile.role !== 'branch_manager'` (pilot). Show loading state while session resolves (no flash of login for signed-in manager).

- [ ] **Step 3: Tests pass + commit**

```bash
git commit -m "feat(flow): add manager login and auth gate"
```

---

### Task 7: FlowShell + placeholder overview + wire App.tsx

**Files:**
- Create: `apps/web/src/styles/flow.css`
- Create: `apps/web/src/components/flow/FlowShell.tsx`
- Create: `apps/web/src/pages/flow/OverviewPlaceholder.tsx`
- Create: `apps/web/src/components/flow/FlowShell.test.tsx`
- Modify: `apps/web/src/App.tsx`
- CSS: import `flow.css` **inside `FlowShell.tsx`** (not `main.tsx`); all selectors scoped under `.flow-app` wrapper class so retail pages are unaffected

**Interfaces:**
- Nav links (manager): Overview, Journey, Entrances, Audience, Compare, Holidays, Roster (+ children), Devices, Settings — children may 404-stub with “Coming in Phase 2/3”
- Top bar: product name, site name, locale toggle, sign out

- [ ] **Step 1: Failing test** — FlowShell shows `IFMP Retail` and link to `/flow/roster`

- [ ] **Step 2: Implement shell + placeholder overview** (“主控台 — Phase 3” bilingual)

- [ ] **Step 3: Wire routes in App.tsx**

```tsx
// Pattern — keep all existing /retail routes unchanged
<Route path="/flow/login" element={<LoginPage />} />
<Route
  path="/flow"
  element={
    <FlowLocaleProvider>
      <FlowAuthProvider>
        <RequireManager>
          <FlowShell />
        </RequireManager>
      </FlowAuthProvider>
    </FlowLocaleProvider>
  }
>
  <Route index element={<OverviewPlaceholder />} />
  {/* stub Outlet children as needed */}
</Route>
```

Add home hub `Link` to `/flow` labeled **IFMP Retail** (pilot) beside legacy demo link.

- [ ] **Step 4: Manual smoke**

```bash
cd apps/web && npm run dev
```

Open `http://127.0.0.1:5174/flow/login` → sign in with seeded manager → land `/flow` shell. Confirm `/retail` still works.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(flow): add FlowShell and wire /flow routes"
```

---

### Task 8: Phase 1 README + smoke checklist

**Files:**
- Create: `docs/flow-pilot-phase1.md`

- [ ] **Step 1: Write doc** covering env setup, supabase link, seed manager, smoke path login → shell, explicit “Open Design not yet”

- [ ] **Step 2: Commit**

```bash
git add docs/flow-pilot-phase1.md
git commit -m "docs(flow): Phase 1 smoke checklist"
```

---

## Spec coverage (Phase 1 only)

| Spec item | Task |
|-----------|------|
| New Supabase + roster tables | T1 |
| Footfall / zones tables | T2 |
| Causeway Bay tenant | T3 |
| Auth + RLS manager | T1 policies + T3 + T6 |
| Client never writes footfall data | T2 RLS notes (ETL-only writes) |
| `/flow` shell, i18n | T5–T7 |
| Don’t break `/retail` | T7 constraint |
| No secrets in client | T4 |
| 主控台 widgets / roster UI / heatmap / ETL / OD | **Deferred** → later plans |

## Next plans (do not implement in Phase 1)

Write each as its own `docs/superpowers/plans/YYYY-MM-DD-*.md`. Carry forward the **Execution strategy (ROI)** section (or link back here) so agents do not default to expensive subagent farms.

### Phase 2 — Roster manager UI

- **Scope:** MeDo-parity manager surfaces under `/flow/roster/*` (week board, staff, templates, policies, swap approvals, audit, export as needed).
- **Execution:** Hybrid. **`glm-5.3`** for week board + conflict detection + draft/publish. **`glm-5.3-flash`** for CRUD/list pages (staff, templates, policies, audit). Subagents allowed for independent leaf pages after board contract exists.
- **Avoid:** Grok (or high-cost) on every task; Flash-only for publish/conflicts without a `glm-5.3` pass.

### Phase 3 — 主控台 (widgets 1–8)

- **Scope:** Uniqlo-period traffic ETL → Supabase (display as I.T. Causeway Bay); overview + drill routes for mandated footfall widgets.
- **Execution:** **`glm-5.3`** locks field mapping / ETL first. **Flash** builds charts once TypeScript/SQL contracts are stable. Light subagents OK for parallel widget pages.
- **Avoid:** Building eight charts before the import schema is verified.

### Phase 4 — Journey heatmap

- **Scope:** New AI floorplan asset; zone remap; significant Journey UX redesign; metrics consistent with imported totals; `/flow/journey` + overview compact heat.
- **Execution:** Open Design for visual direction after shell + data shapes exist; implement with **`glm-5.3`** (UX/interaction), wire with **Flash**.
- **Avoid:** Reusing legacy fake `public/mock/retail/heatmap.json` as source of truth; skinning `/retail/journey` without redesign.

### Later

- Open Design polish pass (shell/overview density).
- 員工 flows (only after manager pages complete).
- Cutover: move legacy pitch off `retail.ifmphk.com`; serve pilot.

### Model + key cheat sheet (all later plans)

| Work type | Prefer model | Prefer key |
|-----------|--------------|------------|
| Normal chat / planning | Auto | No switch |
| Boilerplate UI, tests from a detailed plan, wiring | `glm-5.3-flash` | **Flash key** |
| Auth, RLS, ETL mapping, roster conflicts/publish, heatmap UX | `qwen3.8-max` (same key as Auto) or `glm-5.3` | **Auto/ToAi key** preferred; 5.3 key fallback |
| Default multi-task subagent | Flash | **Flash key** |
| Expensive frontier model | Optional single review | That model’s key only |

**Before each phase run:** human switches model + matching key; agent reminds once at phase kickoff.
