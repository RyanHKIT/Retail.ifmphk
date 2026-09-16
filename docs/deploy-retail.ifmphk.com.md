# Deploying the pilot at `retail.ifmphk.com`

> Status: prepared, not yet live.
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

### The single most important thing

**You do not create a DNS record by hand.** Adding a public hostname to a
Cloudflare Tunnel creates the corresponding `CNAME` for you. There is nothing to
add in the DNS tab, and adding one manually will conflict.

That is why the existing tunnel records in the DNS list — `live-hkt-office` and
`live-texwood-b01` — exist without anyone having typed them.

### Build the bundle

The two Supabase values are compiled into the bundle, so the build must happen
where `apps/web/.env` exists. That file is gitignored on purpose. Build on the
development machine, then ship the folder.

```powershell
cd apps\web
npm ci
npm run build
```

Output: `apps\web\dist\`. Currently about 289 kB gzipped, which is fine over a
tunnel.

For the AI blocks to appear, `VITE_AI_ENABLED=1` must be in `apps/web/.env`
**before** this build, and the Edge Functions must already be deployed. The flag
is compiled in, so turning it on later means rebuilding.

### Serve it

Do not use `vite preview` on the host machine unless the repository is there.
Use the bundled server, which needs only Node and the `dist` folder:

```powershell
node scripts/serve-flow.mjs --dir apps/web/dist --port 4174 --host 127.0.0.1
```

It serves the build and, importantly, returns `index.html` with a 200 for any
unknown path. Without that, refreshing on `/flow/roster/swaps` returns 404.

### Point the tunnel at it

In the Cloudflare dashboard:

1. **Zero Trust** → **Networks** → **Tunnels**
2. Choose the tunnel that runs on the machine serving port 4174
3. **Public Hostname** tab → **Add a public hostname**
4. Fill in:
   - **Subdomain:** `retail`
   - **Domain:** `ifmphk.com`
   - **Path:** leave empty
   - **Service Type:** `HTTP`
   - **URL:** `127.0.0.1:4174`
5. Save. The DNS record appears automatically within a minute.

### Which machine, which tunnel — pick one

**Option A — the demo laptop, on demand.** Create a new tunnel on the machine
that runs the server, and run `cloudflared` only while needed. Fastest to set
up. The URL is dead whenever the laptop sleeps, so it is only suitable for a
live walkthrough.

**Option B — an always-on office machine, recommended.** Copy `dist/` and
`scripts/serve-flow.mjs` to the machine already running `tun-hkt-office`. Start
the server there and add the public hostname to that existing tunnel. The URL
then works around the clock, which is what a manager who wants to browse at
their own pace actually needs.

Note that `127.0.0.1:4174` is resolved on the machine running `cloudflared`, not
on the machine you are sitting at. A tunnel on a different box will not reach
your laptop's server.

### Optional: a second gate

Because this is a public hostname, you can put Cloudflare Access in front of it:
**Zero Trust** → **Access** → **Applications** → **Add self-hosted**, protect
`retail.ifmphk.com`, and allow only the manager's email address. Cloudflare then
emails a one-time code before the app loads.

Worth doing for a pilot. Be aware it adds a step for the person demonstrating,
and the code expires, so test it before relying on it.

---

## Part 3 — Verification

Run these after the tunnel is live. Each one is a specific failure mode, not a
formality.

| Check | Expected | If it fails |
|-------|----------|-------------|
| `https://retail.ifmphk.com/flow` | Flow login screen | Tunnel down, or wrong port |
| Refresh on `https://retail.ifmphk.com/flow/roster/swaps` | Same page, not 404 | SPA fallback missing; check you are using `scripts/serve-flow.mjs` |
| Sign in | Overview with charts | `VITE_SUPABASE_*` missing at build time |
| Overview honesty banner | Mentions `2026-09-16` | Demo pin removed |
| Any tab's analysis block | A headline and 2–3 observations | Edge Functions not deployed, or secrets missing |
| Type a question in the chat box | Streams an answer | Same as above |
| A path that does not exist, e.g. `/flwo` | Redirects to the app | Catch-all route missing |
| Browser console | No `Blocked request. This host is not allowed.` | `allowedHosts` missing in `vite.config.ts` |

Quick command-line probes:

```powershell
curl.exe -s -o NUL -w "%{http_code}`n" https://retail.ifmphk.com/flow
curl.exe -s -o NUL -w "%{http_code}`n" https://retail.ifmphk.com/flow/roster/swaps
```

Both must be `200`.

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

**`Blocked request. This host is not allowed.`**
Vite rejected the forwarded hostname. The `preview` block in
`apps/web/vite.config.ts` sets `allowedHosts: true` for this reason. If you see
this from `serve-flow.mjs` instead, the request is not reaching the server at
all and the tunnel is misconfigured.

**The tunnel is up but the site does not load.**
Check the port in the public hostname matches `--port`, and that the server
process is actually running on the host machine. A sleeping machine is the usual
cause.

**Everything loads but no data.**
The Supabase URL or anon key was missing when the bundle was built. Rebuild with
`apps/web/.env` present. You cannot fix this by editing the deployed files, as
the values are compiled in.

**Analysis blocks are missing entirely rather than erroring.**
`VITE_AI_ENABLED` was not `1` at build time. Rebuild.

**Charts are empty.**
The demo day is pinned, so this should not happen. Check that
`FLOW_DEMO_DAY` in `apps/web/src/lib/footfall/api.ts` is still set.
