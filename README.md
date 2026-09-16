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
For a machine that only has the built files, use the bundled server:

```powershell
node scripts/serve-flow.mjs --dir apps/web/dist --port 4174
```

It needs only Node and `dist/`. Unknown paths return `index.html` with a 200, so
deep links survive a refresh.

This is the fallback path. The pilot is hosted on Cloudflare Pages, which needs
no local process. See `docs/deploy-retail.ifmphk.com.md`.

## Deployment

- Tunnel, hosting and manager instructions: `docs/deploy-retail.ifmphk.com.md`
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
