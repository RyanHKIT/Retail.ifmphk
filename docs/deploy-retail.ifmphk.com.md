# Deploying the pilot at `retail.ifmphk.com`

> Status: live on Cloudflare Tunnel, served from the demo laptop.
> Cloudflare Pages is parked: not in progress and not planned. The Pages notes
> are kept in Part 2b as reference for a possible future move.
> App entry point: `/flow`
> Demo day: `2026-09-16` (pinned in code; the app always shows this day)
>
> **Action after the next reboot:** confirm the tunnel route still resolves. The
> tunnel and the server both auto-start, but the route itself has never been
> verified across a reboot.

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

A Cloudflare Tunnel on this laptop, serving `apps/web/dist` through
`scripts/serve-flow.mjs`. Two things must be alive:

| Piece | What it is | Survives a reboot? |
|-------|-----------|--------------------|
| `Cloudflared` Windows service | `cloudflared.exe tunnel run --token-file C:\ProgramData\cloudflared\token` | Expected — `StartMode` is `Auto` |
| `IFMP Flow Server` scheduled task | Runs `scripts/serve-flow-task.ps1`, which runs `serve-flow.mjs` on `127.0.0.1:4174` | Expected — `AtLogOn` trigger, plus a supervisor loop |

"Expected" is deliberate. Both are configured for it, but the reboot has not been
tested. See **After a reboot** below.

Neither needs starting by hand. The task is what makes the server come back, and
it is also the log and the crash recovery.

The tunnel is token-managed, so its ingress rules live in the Cloudflare
dashboard, not in a local config file. There is nothing under `~/.cloudflared`;
the only local state is `C:\ProgramData\cloudflared\token`.

### The `IFMP Flow Server` task

| | |
|---|---|
| Trigger | At logon for `TWT\rchan`, delayed 20s |
| Action | `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "<repo>\scripts\serve-flow-task.ps1"` |
| Principal | Current user, `InteractiveToken`, `Limited`. No password is stored and admin rights are not needed. |
| Log | `%LOCALAPPDATA%\ifmp-flow\serve-flow.log` — outside the repository, so it cannot dirty the working tree |

Every path in the action is absolute because Task Scheduler runs with a working
directory of `System32`.

Check it:

```powershell
Get-ScheduledTask -TaskName 'IFMP Flow Server' | Select-Object TaskName, State
Get-ScheduledTaskInfo -TaskName 'IFMP Flow Server'
```

Restart it, which is also the way to pick up an edit to `serve-flow-task.ps1`:

```powershell
Stop-ScheduledTask -TaskName 'IFMP Flow Server'
Start-ScheduledTask -TaskName 'IFMP Flow Server'
```

Read the log:

```powershell
Get-Content "$env:LOCALAPPDATA\ifmp-flow\serve-flow.log" -Tail 40
```

The supervisor keeps the file open while the server runs, so `Get-Content` is the
reliable way to read it. Some editors show it as locked, or do not refresh on
their own.

Expect a `state` of `Running` while the site is up. `Ready` means the task is not
running, and the URL is almost certainly down.

### Crash recovery lives in the wrapper, not in Task Scheduler

The task also has restart-on-failure configured, but that setting was tested and
**did not work** for this case. Killing the server left the task in the `Ready`
state with result `0xC000013A` and no restart was attempted, so the URL stayed
dead until it was started by hand.

Recovery therefore happens in `scripts/serve-flow-task.ps1`, which runs the server
in a loop:

- If the server exits, it is started again after a short delay.
- A run that lasted at least a minute counts as healthy and resets the delay to
  3s. This is the common case, so a crash on a server that has been up for hours
  recovers in seconds.
- Only a process that keeps dying immediately escalates, doubling 2s, 4s, 8s,
  16s, and capping at 30s, so a permanent problem does not spin the log.

This was verified by killing the live server: it was back and answering within
about 2 seconds, and the log recorded `exited with code -1 after 62s (healthy
run, backoff reset)` followed by `restarting in 3s`.

The retry loop also covers a startup race. Restarting the task while the old
socket is still closing produces `Port 4174 is already in use`, and an
un-supervised process would simply fail there. The loop retried, and the third
attempt bound the port successfully.

### The laptop is still a single point of failure

`retail.ifmphk.com` works only while this machine is awake. Both pieces now
auto-start, so a reboot heals itself, but a closed lid or a shutdown still takes
the pilot down for everyone, and Cloudflare will answer with an error rather than
refusing the connection. Notices about it are deliberate: during a pilot, an
error page that looks like a broken app is a worse outcome than an obvious
downtime.

Do not rely on a sleeping laptop for anything the manager might open unplanned.
Part 2b records the alternative, whenever a host independent of this machine is
wanted.

### After a reboot — verify this

Both pieces are configured to start themselves, but **the reboot has not been
tested.** A reboot cannot be performed from inside this session, so the logon
trigger firing, and the tunnel route still resolving afterwards, are assumptions
rather than verified facts.

What is expected to happen with no intervention:

1. The `Cloudflared` service starts, because its `StartMode` is `Auto`.
2. Roughly 20 seconds after logon, the `IFMP Flow Server` task starts and
   `serve-flow.mjs` binds `127.0.0.1:4174`.

Check it after the next reboot, which takes about a minute:

```powershell
Get-Service Cloudflared | Select-Object Name, Status
Get-ScheduledTask -TaskName 'IFMP Flow Server' | Select-Object TaskName, State
Get-NetTCPConnection -LocalPort 4174 -State Listen
curl.exe -s -o NUL -w "%{http_code}`n" https://retail.ifmphk.com/flow
```

Expected: `Running`, `Running`, one listening row, and `200`.

If the port is listening but the URL fails, the problem is the tunnel rather than
the server. If nothing is listening, the task did not run: start it with
`Start-ScheduledTask -TaskName 'IFMP Flow Server'` and read the log, which will
say whether it ran at all. No log entry at all means the trigger did not fire, and
the task's own settings are what to inspect.

### Rebuilding the tunnel route from scratch

Only needed if the tunnel or its public hostname is ever lost.

**Zero Trust** → **Networks** → **Tunnels** → the tunnel on the serving machine →
**Public Hostname** → **Add**: subdomain `retail`, domain `ifmphk.com`, service
type `HTTP`, URL `127.0.0.1:4174`.

**You do not create the DNS record by hand.** Adding the public hostname creates
the matching `CNAME`. That is why the existing tunnel records — `live-hkt-office`
and `live-texwood-b01` — exist without anyone having typed them. Adding one
manually conflicts with the tunnel's own record.

`127.0.0.1:4174` is resolved on the machine running `cloudflared`, not on the
machine you are sitting at. Here both run on the same laptop, which is why
`127.0.0.1` is correct. Pointing the route at a different machine means
`serve-flow.mjs` has to run on that machine instead.

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

### A rebuild publishes itself

The server reads `apps/web/dist` from disk on every request, so there is no
upload step and no cache to wait out. `npm run build` is the whole deploy. The
result is live on `retail.ifmphk.com` on the next refresh, with no restart of the
server.

This is the tunnel's real advantage right now: a UI change such as the
login-page rebrand reaches the public URL as soon as `dist` is rebuilt.

Verified on 2026-09-17: `dist` was rebuilt at `02:03:18`, and
`https://retail.ifmphk.com/flow` returned HTML byte-identical to
`http://127.0.0.1:4174/flow` on this machine, both referencing bundle
`index-BjTkgiCX.js`.

One consequence worth knowing: if a build fails, `dist` keeps the previous
output and the site quietly serves the older bundle rather than reporting an
error.

### Optional: a second gate

Because this is a public hostname, you can put Cloudflare Access in front of it:
**Zero Trust** → **Access** → **Applications** → **Add self-hosted**, protect
`retail.ifmphk.com`, and allow only the manager's email address. Cloudflare then
emails a one-time code before the app loads.

Worth doing for a pilot. Be aware it adds a step for the person demonstrating,
and the code expires, so test it before relying on it. It works the same whether
the site is served by the tunnel or by Pages.

---

## Part 2b — Cloudflare Pages (parked, not being pursued)

Not in progress and not planned. The decision was to keep the tunnel as the
hosting method. Nothing here needs doing.

It is kept because the findings were expensive to obtain and would otherwise have
to be rediscovered: the `wrangler login` failure and its API-token workaround, the
`_redirects` infinite-loop trap, and the never-add-`404.html` rule. All still
apply if the move is ever picked up.

The constraint that makes deferring it cheap:

**One hostname has exactly one DNS owner.** `retail.ifmphk.com` cannot point at
the tunnel and at Pages at the same time. Whoever owns the record wins, and two
claims on one record is what takes the URL down.

**Two different hostnames can run at once with no conflict.** The tunnel keeps
`retail.ifmphk.com`; Pages lives on its own name — its `*.pages.dev` URL, or a
subdomain such as `pilot.ifmphk.com`. Both work simultaneously.

That removes the ordering trap entirely. Validate Pages at leisure while the
tunnel keeps serving, and never touch the `retail` record unless you decide to
switch.

### Blocker: `wrangler login` fails on this machine

Observed on 2026-09-17 while attempting the direct-upload path:

    X [ERROR] OAuth error: request_forbidden
    The request is not allowed. No CSRF value available in the session cookie.
    Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76

Wrangler opens a browser for OAuth and expects a session cookie on the callback.
The CSRF error means the callback arrived without that cookie, so the flow never
completes. Usual causes are a browser or profile that blocks cookies for the
callback, a hardened default browser, or the callback opening in a different
browser from the one that started it. It is a local browser-session problem, not
an account or permissions problem, and repeating the same attempt tends to
reproduce it.

**Workaround: a scoped API token instead of OAuth.** Two environment variables
and wrangler skips the browser entirely:

```powershell
$env:CLOUDFLARE_API_TOKEN  = '<token>'
$env:CLOUDFLARE_ACCOUNT_ID = '<account id>'
npx wrangler pages deploy dist --project-name ifmp-retail
```

Create the token at **Cloudflare dashboard** → **My Profile** → **API Tokens** →
**Create Token**. The account ID is on the same page, and in the dashboard URL
for the account.

Scope it to the minimum the deploy needs. Only one scope was used and verified
here: **Account → Cloudflare Pages → Edit**. Nothing beyond that was tested, so
treat any other scope as unverified, and prefer a token limited to a single
account.

Only needed if the Pages path is ever pursued. The tunnel requires none of this.

### Option A — direct upload

Ships the exact artefact that was tested locally, without wiring up Git.

```powershell
cd apps\web
npx wrangler pages deploy dist --project-name ifmp-retail
```

With OAuth working, `npx wrangler login` runs once first. If it fails as above,
use the token instead. The first deploy creates the project and prints a
`*.pages.dev` URL.

Verify on that URL. In particular, refresh on `/flow/roster/swaps`: it must
reload and not 404. Pages serves `index.html` for paths that match no static
asset, so this works with no configuration. See the routing note below.

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

### Only if you later move this exact hostname

Skip this unless you have decided to retire the tunnel. It applies only when
Pages takes over `retail.ifmphk.com` itself. While Pages stays on its own
hostname, there is nothing to do here.

There must be exactly one owner of the `retail` record.

1. Verify the Pages deployment on its own hostname first. Refresh on
   `/flow/roster/swaps`; it must reload and not 404.
2. **Delete the tunnel's public hostname for `retail.ifmphk.com`** in
   **Zero Trust** → **Networks** → **Tunnels**. Its DNS record disappears with it.
3. Then add the domain in the Pages project: **Custom domains** →
   **Set up a domain** → `retail.ifmphk.com`. Pages creates the CNAME itself.

Doing 3 before 2 gives two systems claiming the same record, which is what takes
the URL down. Do not add the DNS record by hand in either direction.

Reversible: re-add the tunnel public hostname, then
`Start-ScheduledTask -TaskName 'IFMP Flow Server'`.

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

---

## Part 3 — Verification

Run these against `https://retail.ifmphk.com` after any change to `dist`, to the
server, or to the tunnel. Each one is a specific failure mode, not a formality.

| Check | Expected | If it fails |
|-------|----------|-------------|
| `https://retail.ifmphk.com/flow` | Flow login screen | Task not running, or the tunnel route is wrong |
| Refresh on `https://retail.ifmphk.com/flow/roster/swaps` | Same page, not 404 | Server not running `serve-flow.mjs`; check the log |
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

### Tunnel, the current setup

**The site is down.**

```powershell
Get-ScheduledTask -TaskName 'IFMP Flow Server' | Select-Object TaskName, State
Get-NetTCPConnection -LocalPort 4174 -State Listen
```

A task state of `Ready` means the supervisor is not running, so nothing is being
retried. Start it with `Start-ScheduledTask -TaskName 'IFMP Flow Server'`.

If the task is `Running` but nothing is listening, the supervisor is alive and the
server itself is failing to start. Read the log:

```powershell
Get-Content "$env:LOCALAPPDATA\ifmp-flow\serve-flow.log" -Tail 40
```

Look for a repeating pattern. `Built index.html` missing means `dist` is absent, so
run `npm run build`. A `Port 4174 is already in use` that then resolves is normal
after a restart and can be ignored. The log records every attempt with a
timestamp, an exit code, and the delay before the next one, so an unexplained
outage should not be a mystery.

**The server keeps restarting.**
The log shows the exit code and how long each run lasted. A short run with an
increasing delay means the process is dying on startup rather than crashing later.
The cause is usually a missing or corrupt `dist`, or something else holding
port 4174.

**Cloudflare returns an error page although the server is running.**
The tunnel cannot reach the port. Confirm the public hostname URL matches the port
in the task, and that the service is up: `Get-Service Cloudflared`.

**A UI change is not visible on the live site.**
Confirm the build succeeded and wrote to `dist`. A failed build leaves the
previous output in place, so the site keeps serving the older bundle rather than
reporting an error. Check that the hash in `apps/web/dist/assets/index-*.js`
changed, then hard-reload the browser tab. No restart of the server is needed: it
reads `dist` on every request.

**`Blocked request. This host is not allowed.`**
That message comes from Vite, not from the tunnel, so the request reached a
`vite dev` or `vite preview` server instead of `serve-flow.mjs`. The `preview`
block in `apps/web/vite.config.ts` sets `allowedHosts: true` for this reason. Make
sure the port the tunnel points at is the port the task owns.

### General

**Everything loads but no data, and the login never succeeds.**
The Supabase URL or anon key was absent when the bundle was built. They are
compiled in, so editing deployed files cannot fix it. Rebuild with
`apps/web/.env` present.

**Analysis blocks are missing entirely rather than erroring.**
`VITE_AI_ENABLED` was not `1` at build time. Rebuild.

**Charts are empty.**
The demo day is pinned, so this should not happen. Check that `FLOW_DEMO_DAY` in
`apps/web/src/lib/footfall/api.ts` is still set.

### Only applies to the optional Pages path

**A blank page, with the console showing failed `/assets/*.js` requests.**
Almost always a rewrite rule rewriting the JavaScript to `index.html`. A 200
rewrite of a script returns HTML, which the browser refuses to execute. Check the
deployment has no `_redirects` in it, per the routing note in Part 2b.

**404 on refresh, but the app works when navigated to.**
The SPA fallback is off, which means a `404.html` is present in the build output.
Delete it. Do not work around this with a blanket `_redirects` rule; that routing
note explains why the rule is rejected.
