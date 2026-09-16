# IFMP Retail — pilot

Front end for the IFMP Retail pilot: a Vite + React single-page app that reads
live data from Supabase. The product lives at **`/flow`**.

> **Note on history.** An earlier `/retail` demo was a static mock-up with no
> backend. It has been deleted and `/retail/*` now redirects to `/flow`. Some
> documents under `docs/superpowers/` still describe it; they are historical
> records, not current instructions.

## Requirements

- Node.js **20** or above
- npm

## Local development

Create `apps/web/.env` from the example, and fill in the two Supabase values:

```powershell
Copy-Item apps\web\.env.example apps\web\.env
# then edit apps\web\.env
```

```powershell
cd apps\web
npm install
npm run dev
```

Open **http://127.0.0.1:5174/flow**. The root path redirects there.

The dev server binds to `127.0.0.1:5174` and proxies `/api` to the existing
Express console on `:3000`. `/flow` does not use that proxy.

Set `VITE_AI_ENABLED=1` in `apps/web/.env` to show the per-tab analysis blocks
and the platform Q&A panel. Those features also need the Edge Functions
deployed; see `docs/flow-ai-deploy.md`.

## Build and test

```powershell
cd apps\web
npm ci
npm test
npm run build
npm run typecheck
```

Output goes to `apps/web/dist/`.

## Serving a build

`vite preview` is configured on port 4174, but it needs this repository present.
For a deployment the bundled server is used instead:

```powershell
node scripts/serve-flow.mjs --dir apps/web/dist --port 4174
```

It needs only Node and `dist/`. Unknown paths return `index.html` with a 200, so
deep links survive a refresh.

In production this is not started by hand. The `IFMP Flow Server` scheduled task
runs `scripts/serve-flow-task.ps1` at logon, which supervises `serve-flow.mjs`,
writes both stdout and stderr to `%LOCALAPPDATA%\ifmp-flow\serve-flow.log`, and
restarts the server if it exits. See `docs/deploy-retail.ifmphk.com.md`.

`retail.ifmphk.com` is a Cloudflare Tunnel pointing at that server on port 4174.
The server reads `dist` on every request, so a rebuilt bundle is live on the next
refresh with no deploy step and no restart.

## Deployment

- Tunnel hosting, the auto-start task, and manager instructions:
  `docs/deploy-retail.ifmphk.com.md`
- AI Edge Functions: `docs/flow-ai-deploy.md`
- Pilot smoke checklist: `docs/flow-pilot-phase5.md`

## Documents

- Product scope: `docs/PRODUCT.md`
- Design authority: `docs/superpowers/specs/2026-09-16-ifmp-flow-ux-authority-design.md`
- Shell contract, so the chrome can be replaced without touching screens:
  `docs/superpowers/specs/2026-09-16-ifmp-flow-pilot-v1-chrome-design.md`

## Notes

- Never commit `.env` or any key. `apps/web/.env` is gitignored. Every
  `VITE_*` value is compiled into the public bundle, so a secret placed there is
  published. Provider keys belong in Supabase secrets, not here.
- The demo day is pinned to `2026-09-16` in
  `apps/web/src/lib/footfall/api.ts`, so the seeded data does not run out. The
  UI states this on the Overview tab.
- `_handoff_extract`, `_reference` and `output` are development references, not
  runtime files.
- The pilot is served from the machine that runs the Cloudflare Tunnel, so the
  site is only reachable while that machine is awake. The tunnel and the server
  both auto-start, but the route has not been verified across a reboot: check
  `https://retail.ifmphk.com/flow` after the next one.
