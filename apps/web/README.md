# `@ifmp/web-next` — frontend rework package

Parallel Vite + React app for the IFMP UI rework.

## Why a separate package

- Keep the **current console** (`/` root `src/`, port **5173**) stable for demos and production.
- Rebuild IA/layout/visuals in **`apps/web-next`** (port **5174**) without merge conflicts in every page.
- Reuse the same Express `/api` and live-gateway proxies; no second backend.

When the rework is ready, cut over by pointing production static hosting at `apps/web-next/dist` (or swapping root `src/` in a planned migration). Do **not** rewrite root `src/` in place until cutover.

## Quick start

From this folder:

```bash
npm install
npm run dev
```

Or from repo root:

```bash
npm run web-next:install
npm run web-next:dev
```

Open [http://127.0.0.1:5174/](http://127.0.0.1:5174/).

In another terminal, run the existing API:

```bash
npm run start
```

Optional: point the proxy at another origin:

```bash
# PowerShell
$env:IFMP_API_ORIGIN = "http://127.0.0.1:3000"
npm run dev
```

## Layout

```text
apps/web-next/
  src/           # new UI only
  vite.config.ts # :5174 + /api + /live-gw proxies
```

Shared brand assets can be copied/linked from repo `public/brand` when needed. Prefer importing API contracts from fresh client code here rather than deep-coupling to root `src/api` until shared packages are extracted.

## Out of scope (for now)

- Full npm workspaces monorepo migration
- Moving Express into `apps/api`
- Sharing shadcn/ui trees with root until the design system for Next is settled
