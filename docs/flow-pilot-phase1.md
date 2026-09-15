# IFMP Retail (Flow pilot) — Phase 1 smoke checklist

Phase 1 delivers: Supabase schema (roster core + footfall/主控台), Auth with RLS, `/flow` shell (zh-HK/en), login gate, home hub link. **Open Design not yet** — that starts after Phase 3 has real widgets to comp against.

## 1. One-time setup

1. **Supabase project** (new project — not a shared/prod IFMP DB):
   - Create at <https://supabase.com/dashboard>.
   - Note the **project ref** and URL.
2. **Link + push migrations** (repo root):
   ```powershell
   npx supabase login
   npx supabase link --project-ref <PROJECT_REF>
   npx supabase db push
   ```
   Expected: 3 migrations applied (`flow_roster_core`, `flow_footfall_core`, `flow_seed_causeway`).
3. **Env** — `apps/web/.env` (gitignored; copy from `.env.example`):
   ```
   VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```
   Anon key only. Never `service_role` in the client.
4. **Seed branch manager** — follow `scripts/flow-seed-manager.md` (Dashboard user → promote to `branch_manager` → link to I.T. Causeway Bay branch). Password stays out of the repo.

## 2. Smoke path

```powershell
cd apps\web
npm run dev
```

1. Open `http://127.0.0.1:5174/` → home hub shows both links: legacy 零售 demo + **IFMP Retail（pilot）**.
2. Click **IFMP Retail（pilot）** → redirected to `/flow/login`.
3. Sign in with seeded manager → land `/flow` shell (dark ops, left nav, top bar).
4. Top bar: site shows **I.T. 銅鑼灣**; locale toggle flips to **I.T. Causeway Bay** / English nav.
5. Any nav item → stub page (`即將推出 — Phase 2 / 3 / 4`).
6. Sign out → back to `/flow/login`. Direct URL `/flow` while signed out → login redirect.
7. Legacy check: `/retail` still renders the old demo untouched.

## 3. Automated checks

```powershell
cd apps\web
npx tsc -b --noEmit
npx vitest run
```

Expected: typecheck clean; 27 test files / 94+ tests passing (incl. 8 new flow tests).

## 4. Out of scope (later phases)

| Phase | Content |
|-------|---------|
| 2 | 排班 manager UI (MeDo parity) |
| 3 | 主控台 widgets 1–8 + Uniqlo-period ETL |
| 4 | Journey heatmap redesign + AI floorplan |
| — | Open Design comps, 員工 flows, `retail.ifmphk.com` cutover |
