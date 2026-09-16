# Deploying the pilot at `retail.ifmphk.com`

> Status: live on Cloudflare Tunnel from a local machine; migration to Cloudflare
> Pages in progress. See Part 2.
> App entry point: `/flow`
> Demo day: `2026-09-16` (pinned in code; the app always shows this day)

This document has two audiences. Part 1 is for the person who will use the
system. Part 2 onwards is for whoever sets it up. Read the part you need.

---

## Part 1 — For the manager

### What this is

A working pilot of IFMP Retail, running against real Supabase tables with
sample data. It is not a mock-up and not a slide. Every screen reads the
database, and the numbers are seeded for demonstration, not measured from a
live store.

### How to get in

1. Open **`https://retail.ifmphk.com/flow`**
2. Sign in with the manager account. Credentials are shared separately and
   deliberately kept out of this repository.
3. You land on the Overview tab. The sidebar lists every area.

### What to look at first

| Area | Why it matters |
|------|----------------|
| **總覽 / Overview** | The day's footfall, plus an AI-written briefing at the top of each tab |
| **動線 / Journey** | Where visitors dwell inside the store, over the floor plan |
| **入口 / Entrances** | Whether the gates and the staffing are in balance |
| **排班 / Roster** | The week board, shift templates, and swap approvals |
| **設定 / Settings** | Switch language and light / night theme |

### Three things to know before you judge it

**The data is frozen on purpose.** The demo day is pinned to 2026-09-16, so the
pilot shows the same complete day whenever you open it. A banner on the Overview
says so. This is deliberate: seeded data would otherwise run out and the charts
would empty out.

**The AI text is generated, not measured.** Each tab has a short analysis block.
It reads only the aggregates already on that tab and is instructed never to
introduce a number that is not in the input. It is labelled as machine-written.
The chat box in the bottom-right corner explains how the platform works — what a
metric means, where a figure is recorded, which tab shows it. It intentionally
cannot report live numbers, because it is not given any.

**This is a pilot, not a release.** The visual shell is built to be thrown away
and replaced without touching the screens underneath.

### If something looks broken

- **A blank page** — check the URL. The entry point is `/flow`; the bare
  hostname redirects there.
- **"暫時無法產生分析" on every tab** — the AI service is not reachable. The
  rest of the app still works. Report it; do not retry repeatedly, as that
  counts against a per-hour limit.
- **The sign-in fails** — the account may have been reset. Ask for a new one.

---

## Part 2 — Deploying the web app

### Where it runs

Cloudflare Pages. A static host. There is no process to keep alive, no laptop to
leave open, and nothing to restart after a reboot.

This replaced an earlier setup that served the app from a local machine through a
Cloudflare Tunnel. The tunnel still works and is documented at the end of this
part as a fallback, but it has one failure mode that ruled it out for a pilot:
when the machine sleeps, the URL goes dead for everyone, silently.

### Build the bundle

Three values are compiled into the bundle, so the build must happen where
`apps/web/.env` exists. That file is gitignored on purpose, which is why the
Git-connected option below needs the same three values entered in the dashboard.

```powershell
cd apps\web
npm ci
npm run build
```

Output: `apps/web/dist/`, about 289 kB gzipped.

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_SUPABASE_URL` | project URL | Public. Compiled in. |
| `VITE_SUPABASE_ANON_KEY` | anon key | Public by design. RLS and the login are the gate. |
| `VITE_AI_ENABLED` | `1` | Omit or set `0` to hide the analysis blocks and chat. |

The AI blocks also need the Edge Functions deployed. See `docs/flow-ai-deploy.md`.

Changing any of these means rebuilding. They are not read at runtime.

### Option A — direct upload, recommended for the pilot

Ships the exact artefact that was tested locally. Fewest unknowns.

```powershell
cd apps\web
npx wrangler login
npx wrangler pages deploy dist --project-name ifmp-retail
```

`wrangler login` opens a browser once. The first deploy creates the project and
prints a `*.pages.dev` URL.

Verify on that URL before touching DNS. In particular, refresh on
`/flow/roster/swaps`: it must reload the same page and not 404. Pages serves
`index.html` for paths that do not match a static asset, so this works with no
configuration. See the routing note below.

### Option B — Git-connected, for automatic deploys

Connects the GitHub repository so a push to `main` deploys. Worth doing once the
pilot settles; more moving parts than Option A.

In **Workers & Pages** → **Create** → **Pages** → **Connect to Git**:

| Setting | Value |
|---------|-------|
| Repository | `RyanHKIT/Retail.ifmphk` |
| Production branch | `main` |
| Framework preset | None |
| Build command | `cd apps/web && npm ci && npm run build` |
| Build output directory | `apps/web/dist` |
| Root directory | leave empty |

Then add the three variables from the table above under **Settings** →
**Environment variables**, for both Production and Preview. Without them the
build succeeds and the site loads, but every screen shows a login that cannot
authenticate. Set `NODE_VERSION` to `22` as well; the local build runs on 24, and
pinning the version avoids a surprise if the default changes.

### Custom domain, and the order that matters

There must be exactly one owner of the `retail` DNS record.

1. Verify the deployment on its `*.pages.dev` URL first.
2. **Delete the tunnel's public hostname for `retail.ifmphk.com`.** The DNS
   record disappears with it.
3. Then, in the Pages project: **Custom domains** → **Set up a domain** →
   `retail.ifmphk.com`. Pages creates the `CNAME` itself.

Doing 3 before 2 gives two systems claiming the same record. Keep the tunnel and
its local server running until step 1 passes, so the URL never goes dark.

### Routing — and why there is no `_redirects` file

Refreshing on `/flow/roster/swaps` works out of the box. When a path matches no
static asset, Pages serves the root `index.html` and lets React Router resolve
the route. That is the default when the project has no `404.html`.

An explicit `_redirects` file was tried and removed. Two concrete problems:

- `/*  /index.html  200` is the usual advice for SPAs, but Pages returns an
  "infinite loop detected" error and **ignores the rule**. Pages normalises
  `/index.html` to `/`, which then matches the rule again.
- The narrower `/flow/*  /index.html  200` was also ignored, and the surviving
  `/flow  /index.html  200` turned `GET /flow` into a `308` to `/`, an extra
  redirect hop for no benefit.

Verified locally against `wrangler pages dev` with no `_redirects` at all:

| Path | Result |
|------|--------|
| `/` | `200` |
| `/flow` | `200` — no redirect hop |
| `/flow/roster/swaps` | `200`, app shell |
| `/flwo` | `200`, app shell, then the app's catch-all sends it to `/flow` |
| `/assets/index-*.js` | `200`, JavaScript served as a script |
| `/assets/floor-plans/it-cwb-demo.png` | `200`, image bytes |

**The one thing not to do:** do not add `public/404.html`. Its presence turns
off the SPA fallback, and every deep link — including every page under `/flow` —
starts returning that page instead of the app. If a custom 404 is ever needed,
it must come with `_redirects` rules that survive the loop detection, tested on
a preview deployment first.

### Fallback: the tunnel

Still valid if a local machine has to serve the app.

```powershell
node scripts/serve-flow.mjs --dir apps/web/dist --port 4174 --host 127.0.0.1
```

It needs only Node and `dist/`, and returns `index.html` with a 200 for unknown
paths. Then **Zero Trust** → **Networks** → **Tunnels** → the tunnel on that
machine → **Public Hostname** → **Add**: subdomain `retail`, domain `ifmphk.com`,
service type `HTTP`, URL `127.0.0.1:4174`.

**You do not create the DNS record by hand.** Adding the public hostname creates
the matching `CNAME`. That is why the existing tunnel records — `live-hkt-office`
and `live-texwood-b01` — exist without anyone having typed them. Adding one
manually conflicts with the tunnel's own record.

`127.0.0.1:4174` is resolved on the machine running `cloudflared`, not on the
machine you are sitting at. A tunnel on a different box will not reach your
laptop's server.

### Optional: a second gate

Because this is a public hostname, you can put Cloudflare Access in front of it:
**Zero Trust** → **Access** → **Applications** → **Add self-hosted**, protect
`retail.ifmphk.com`, and allow only the manager's email address. Cloudflare then
emails a one-time code before the app loads.

This works the same whether the site is served by Pages or by a tunnel. Worth
doing for a pilot. Be aware it adds a step for the person demonstrating, and the
code expires, so test it before relying on it.

---

## Part 3 — Verification

Run these after the deployment is live. Each one is a specific failure mode, not
a formality. On Pages, use the `*.pages.dev` URL first, then repeat once the
custom domain resolves.

| Check | Expected | If it fails |
|-------|----------|-------------|
| `https://retail.ifmphk.com/flow` | Flow login screen | Wrong DNS owner, or the deployment is not the production one |
| Refresh on `https://retail.ifmphk.com/flow/roster/swaps` | Same page, not 404 | A `404.html` reached the build output, or DNS still points at the tunnel |
| Sign in | Overview with charts | `VITE_SUPABASE_*` absent at build time |
| Floor plan visible on Journey | Plan image, not a blank box | Asset missing from `dist/`; rebuild |
| Overview honesty banner | Mentions `2026-09-16` | Demo pin removed |
| Any tab's analysis block | A headline and 2–3 observations | Edge Functions not deployed, or secrets missing |
| Type a question in the chat box | Streams an answer | Same as above |
| A path that does not exist, e.g. `/flwo` | Redirects to the app | Catch-all route missing |

Quick command-line probes:

```powershell
$urls = @(
  'https://retail.ifmphk.com/flow',
  'https://retail.ifmphk.com/flow/roster/swaps',
  'https://retail.ifmphk.com/assets/floor-plans/it-cwb-demo.png',
  'https://retail.ifmphk.com/flwo'
)
foreach ($u in $urls) {
  $r = curl.exe -s -o NUL -w "%{http_code} %{redirect_url}" $u
  Write-Output ("{0,-62} {1}" -f $u, $r)
}
```

All four must be `200` with an empty redirect target.

- A `308` on the first line means a redirect rule has been reintroduced.
- A `404` on the second means the SPA fallback is off.
- A `404` on the third means a rewrite is swallowing `/assets/*`.
- The fourth is the catch-all. `200` is correct here: the app itself redirects
  `/flwo` to `/flow` on the client, after the shell has loaded.

---

## Part 4 — Deploying the AI functions

Separate from all of the above, and it involves no DNS. The functions live on
Supabase's own hostname. See `docs/flow-ai-deploy.md` for the full record.

```powershell
npx supabase login
npx supabase link --project-ref dntmvxfgqmqremdrswij
npx supabase functions deploy ai-insight --project-ref dntmvxfgqmqremdrswij
npx supabase functions deploy ai-ask --project-ref dntmvxfgqmqremdrswij
```

Secrets are already set in the Supabase dashboard. `AI_DISABLE_THINKING`
defaults to true in code and must stay that way unless `AI_TIMEOUT_MS` is raised
to match — see `supabase/.env.example` for why.

Do this **before** building the web bundle, so the AI blocks are compiled in and
actually work on the day.

---

## Part 5 — Troubleshooting

**A blank page, with the console showing failed `/assets/*.js` requests.**
Almost always a redirect or rewrite rule rewriting the JavaScript to `index.html`.
A 200 rewrite of a script returns HTML, which the browser refuses to execute.
Check the deployment has no `_redirects` in it, per the routing note above.

**404 on refresh, but the app works when navigated to.**
The SPA fallback is off, which means a `404.html` is present in the build output.
Delete it. Do not work around this with a blanket `_redirects` rule; see the
routing note for why that rule is rejected.

**Everything loads but no data, and the login never succeeds.**
The Supabase URL or anon key was absent when the bundle was built. They are
compiled in, so editing deployed files cannot fix it. Rebuild with
`apps/web/.env` present, or set the variables in the Pages project and redeploy.

**Analysis blocks are missing entirely rather than erroring.**
`VITE_AI_ENABLED` was not `1` at build time. Rebuild.

**The site is stale after a deploy.**
`index.html` is served with a revalidation header, so this is usually a cached
browser tab. Hard-reload, or check the deployment is the production one rather
than a preview URL.

**Charts are empty.**
The demo day is pinned, so this should not happen. Check that `FLOW_DEMO_DAY` in
`apps/web/src/lib/footfall/api.ts` is still set.

### Only applies if you fell back to the tunnel

**`Blocked request. This host is not allowed.`**
Vite rejected the forwarded hostname. The `preview` block in
`apps/web/vite.config.ts` sets `allowedHosts: true` for this reason. If it comes
from `serve-flow.mjs` instead, the request is not reaching the server at all and
the tunnel route is misconfigured.

**The tunnel is up but the site does not load.**
Check the port in the public hostname matches `--port`, and that the server
process is running on the host machine. A sleeping machine is the usual cause.
This failure mode is the reason the pilot moved to Pages.
