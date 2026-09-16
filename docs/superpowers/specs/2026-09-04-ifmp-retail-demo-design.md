# IFMP Retail — I.T. Client Demo Design

> **Status:** Approved — implementation plan next  

> **Date:** 2026-09-04  
> **Product:** IFMP Retail (ifmphk / 智築 IFMP family)  
> **Client case:** I.T. (HK fashion retail) — fictional stores until real assets arrive  
> **Horizon:** Ambitious ~2-week client demo that nails every in-scope surface  
> **Sources:** `IT_Retail_Platform_Handoff` zip · `PRODUCT.md` · `_reference/hk-roster-planner`

---

## 1. Goal & success

### 1.1 Goal

Ship a **standalone, pitch-ready** retail ops demo that proves IFMP can help I.T. **increase sales efficiency** and **reduce cost**, with a dual-device story (door counters + in-store cameras) and a full action layer—not dashboards alone.

### 1.2 Demo success (done when)

- Cold-start walkthrough (~18–25 min) runs reliably on laptop and/or `retail.ifmphk.com`
- **Every in-scope page** is first-class (no “appendix” quality): Overview, Footfall, Journey, People, Service Gap, Roster (demand + week board), Coach, Energy, Settings
- Approach 2 visual rewrite reads as **fashion-floor ops** under IFMP branding (interim name/logo)
- **繁中-first:** default UI + all mock strings in Traditional Chinese; EN is secondary (switch may remain, but EN parity is not a demo blocker)
- Counter vs Camera sourcing is visible where it matters
- Chart **pop-in / enter animations** retained; polish via `animate` skill when rewriting shell/charts (Recharts defaults + CSS enter where needed)
- Dispatch + roster edits work in-session; Energy beat includes monitor + conditional-control honesty
- `npm run build` passes; static deploy notes exist for `retail.ifmphk.com`

### 1.3 Explicitly out of this demo build

- Live door counters or 一見 webhooks in the meeting room
- POS / membership funnel
- Real I.T. corporate logo lockup or CAD floor plan (swap-ready later)
- Production auth / merge into `estate-ai-ops` for the pitch
- Supabase-backed AI roster generate as a **hard** requirement (stretch only if board + demand link already solid)

---

## 2. Decisions locked

| Topic | Decision |
|-------|----------|
| Demo bar | Client-looking mock; fictional I.T.-style stores + generic fashion floor |
| Ambition | Nail every in-scope aspect; 2 weeks constrains method, not quality bar |
| Codebase | Standalone `ifmp-shop` |
| URL | Family domain e.g. `retail.ifmphk.com` |
| Branding | Interim: **IFMP Retail** / ifmphk; new logo + Chinese product name TBD — keep IFMP until assets land; I.T. = case study |
| Visual | Approach 2 fashion-ops rewrite; IFMP teal accent; keep chart animations (`animate` skill for pop-ins) |
| Story | Two-act 增收 → 降本; Energy = planned short 降本 beat |
| Devices | **A:** door counters for footfall; in-store cameras (一見) for zones/people/gaps |
| Package B | Core path: roster + dispatch; coach when time allows (still ship polished) |
| Language | **繁中-first** (Cantonese talk / zh-Hant UI). EN not prioritized for the demo; saves translation surface and build tokens |
| Data platform | **New Supabase project** for retail when backend is needed — do not share production IFMP DB (see §4.5) |
| Roster depth | Demand chart **plus** rebranded week board from `_reference/hk-roster-planner` (mock/local first) |
| Energy | In script (~2–3 min): monitor + rules; control labelled conditional/demo |

---

## 3. Product positioning

**One-liner:** Store video AI + door counters + ops board that raises conversion opportunities and cuts waste staffing—with dispatch, roster, coach, and energy as a utilities cost lever—not analytics alone.

**Commercial packaging (unchanged from PRODUCT):**

| Package | Role in demo |
|---------|----------------|
| A 看見 | Core evidence pages |
| B 行動 | Core action path (dispatch, roster board, coach) |
| D 綠色 | Planned 降本 beat |
| C 閉環 | Roadmap talk only |

---

## 4. Architecture

### 4.1 Repo layout

```
ifmp-shop/
  apps/web/                 # Vite + React + React Router (from handoff web-next)
  public/mock/retail/       # JSON mocks (fictional I.T.-style)
  docs/                     # PRODUCT port + this spec + demo script
  _reference/hk-roster-planner/  # UX/schema reference (not runtime dependency)
  _handoff_extract/         # Original handoff (may be folded then removed)
```

### 4.2 Runtime

- Dev: `127.0.0.1:5174` → `/retail`
- Data: mock-only for the pitch (`VITE_DATA_SOURCE=mock`)
- Deploy: static `dist` → CDN/host; DNS `retail.ifmphk.com`
- No Express/estate-ai-ops required to present

### 4.3 Ingest story (product truth; demo mocked)

```
Door counter (IR / camera) ──► footfall (pass-by / enter / leave)
In-store cameras + 一見     ──► zone / role / service_gap
                ↓
         IFMP Retail (rules + board + actions)
                ↓
     dispatch / roster board / coach · energy
```

API layer keeps a thin conceptual split (`footfall` vs `vision` sources) so Phase 1 adapters can land without UI rewrites. Mock `meta.source` values: `counter` | `camera` | `iot`.

### 4.4 Client state (demo)

| Concern | Persistence |
|---------|-------------|
| Dispatch “已調度” | `sessionStorage` |
| Roster demand overrides | local store (existing pattern) |
| Roster board edits | local/session store (mock) |
| Settings thresholds | local store |

Presenter reset: refresh clears dispatch; document any local keys to clear.

### 4.5 Supabase / data separation

**Recommendation: new Supabase project for IFMP Retail** when we leave pure-mock (roster board persistence, Phase 1 ingest, stretch AI generate)—not a schema branch inside the current IFMP project.

| Option | Verdict |
|--------|---------|
| **New Supabase project** | **Preferred** — product-line isolation, separate keys/RLS/backups, no risk of retail demo data mixing with property IFMP, cleaner `retail.ifmphk.com` secrets |
| Branch / schemas in existing IFMP Supabase | Possible but couples blast radius, migrations, and access control across products |
| Git branch only | Orthogonal — use git branches for code; does **not** replace DB separation |

Demo pitch week stays **mock/local** unless stretch AI roster is explicitly pulled in; if pulled in, it must use the **new** retail Supabase project (feature-flagged), never production IFMP credentials.

---

## 5. Information architecture & walkthrough

### 5.1 Nav (all first-class)

Overview · Footfall · Journey · People · Service Gap · Roster · Coach · Energy · Settings

### 5.2 Scripted path

| Beat | Page | Show | Goal |
|------|------|------|------|
| 0 | Overview | KPIs, 待調度, dual-source hint | Frame |
| 1 | Footfall | Pass-by / enter / miss / rate · hourly | 增收 — counter |
| 2 | Journey | Heatmap, dwell, top paths | Conversion opportunity |
| 3 | People | Customer / staff / passer-by · staff by hour | Who’s in store |
| 4 | Service Gap | ≥2 min · under/over % · area | Service + labour waste signal |
| 5 | Gap → Dispatch | One-click 已調度 | 行動 |
| 6 | Roster | Demand vs plan/actual **and** week board | 降本 — labour |
| 7 | Coach | Zone filter + VL summaries | Weekly ops |
| 8 | Energy | Monitor + conditional control | 降本 — utilities |

### 5.3 Page jobs

| Page | One job |
|------|---------|
| Overview | Situation + next action |
| Footfall | Counter truth at the door |
| Journey | Where dwell and attention concentrate |
| People | Mix + staff presence |
| Service Gap | Find / confirm / dispatch |
| Roster | Match people to demand (chart + week board) |
| Coach | Review gaps with VL narrative |
| Energy | Cost lever with control caveat |
| Settings | Thresholds (gap 120s, SLA 90s), demo stores |

### 5.4 Client reference capabilities (must be demonstrable)

1. 店面客流 — entrance + pass-by not entered  
2. 店内动线 — heatmap + dwell  
3. 人员分类 — customer vs passer-by (+ staff)  
4. 员工监控 — staff counts by period / efficiency framing via gaps & roster  
5. 服务缺口 — long unserved dwell; under/over staff % and area  

---

## 6. Visual / brand (Approach 2)

### 6.0 Design craft process (early, bounded — not optional)

IFMP’s current UI/UX is weak largely from **missing design planning**, not missing React. For this ambitious demo we invest early in craft, without boiling the ocean.

| Use | Do | Don’t |
|-----|-----|--------|
| **impeccable** | Mode = **Operate** (ops dashboard). Early: `init` / PRODUCT for retail · shape visual world · write `docs/DESIGN.md` · craft-floor before UI edits | Run every command; redesign property IFMP; Persuade/landing theatrics on charts |
| **apple-design** | Response on press, interruptible state changes, springs only where gesture/feedback needs them, spatial enter/exit, reduced motion | Bounce on every chart; translucent stacking that kills scan; marketing parallax |
| **animate** | Chart/card pop-ins, KPI enter, dispatch feedback — transform/opacity, ease-out, &lt;300ms UI | Animate high-frequency chrome; `scale(0)`; ease-in entrances |

**Gate before bulk UI rewrite:** approved `docs/DESIGN.md` (tokens, type, shell, density, motion rules) aligned with this spec §6. Implementation plan starts with that artifact, then pages.

**Demo-stage bound:** one visual world for `/retail` only; no component-library migration of `estate-ai-ops`.

### 6.1 Brand chrome

- Product name (interim): **IFMP Retail** (hero in shell) — swap when new logo + Chinese name arrive
- Small ifmphk mark; Chinese name placeholder until redesign lands
- Case line: “I.T. demo · sample data” (no fake corporate I.T. trademark lockup)

### 6.2 Look

- Charcoal ink, warm off-white paper, soft stone lines  
- **Avoid:** purple SaaS gradients, cream+terracotta cliché, property-twin clone, restaurant amber from the Miaoda roster app  
- **Accent:** IFMP-family **teal** for primary actions (dispatch, CTAs)  
- Typography: expressive display + clear UI sans; **繁中** is the design target  
- Density: retail ops — tighter than marketing, clearer than CCTV grids  

### 6.3 Motion

- **Keep:** Recharts chart enter / pop-in from handoff  
- **Add lightly:** Overview KPI enter, dispatch state change, gap row emphasis, roster board row/cell micro-feedback  
- Charts lively; chrome calm — no glow/pulse noise  

### 6.4 Shell

- Slim sidebar; store / date / period in top bar  
- Day/Night retained  
- Locale: default **zh-Hant**; EN switch optional / low priority  
- Source chips: `Counter` / `Camera` / `IoT` on relevant pages  

---

## 7. Roster module (ambitious)

### 7.1 Two layers on one Roster route

1. **Demand layer (from handoff):** hourly suggested vs expected vs detected vs enter — editable suggested headcount  
2. **Board layer (from `_reference/hk-roster-planner`):** week grid, shift chips, hour bars, soft/hard conflict hints — **rebranded** to IFMP Retail visual system  

### 7.2 Data for demo

- Board populated from mock employees / templates / assignments  
- Demand curve informs “target headcount” callouts on the board (even if assignment AI is mock)  
- No Supabase required for pitch; schema/functions in `_reference` guide Phase 1+  

### 7.3 Stretch (only after layers 1–2 are excellent)

- Optional Supabase project + AI generate edge function, feature-flagged  
- Must not block demo if offline  

---

## 8. Data, i18n, errors

### 8.1 Mocks

- Keep handoff `ApiResponse<T>` envelope  
- 2–3 fictional I.T.-style stores (e.g. Causeway Bay / TST), fashion zones: entrance, apparel, fitting, cashier  
- All user-visible strings **繁中** first; EN only if cheap leftovers from handoff — do not spend the sprint on EN parity  
- Coherent funnel math (pass-by / enter / not-entered)

### 8.2 Errors / empty

- Failed fetch → calm retry; no raw stack/strings in the room  
- Empty filter → short empty state  

### 8.3 Rules defaults

```yaml
service_gap:
  dwell_threshold_sec: 120
  staff_proximity_m: 3
sla:
  first_contact_sec: 90
staffing:
  overstaff_multiplier: 1.5
```

Editable in Settings (mock persistence).

---

## 9. Energy (降本 beat)

- Full page quality, in nav  
- Show temp/humidity/kWh (mock) + footfall-linked **suggested** lighting/HVAC rules  
- Copy must state: **control only when site has rights**; else monitoring + alerts  
- Script: ~2–3 minutes after roster  

---

## 10. Delivery & acceptance checklist

- [ ] App runs from `apps/web` with documented `npm i` / `npm run dev`  
- [ ] All nav pages polished under Approach 2 chrome  
- [ ] Script path cold-runs; **繁中** spot-check on Overview, Footfall, Gap, Roster, Energy (EN optional)  
- [ ] Counter vs Camera (and IoT) sourcing visible  
- [ ] Chart animations retained  
- [ ] Dispatch + roster demand + roster board editable in-session  
- [ ] Energy conditional-control framing present  
- [ ] `npm run build` OK; notes for `retail.ifmphk.com` static host  
- [ ] Presenter one-pager: script beats + reset tips  

---

## 11. Implementation priority (for planning skill)

1. Scaffold `ifmp-shop` from handoff; port PRODUCT  
2. **Design world pass** — impeccable Operate + apple-design principles → `docs/DESIGN.md` (tokens/type/shell/motion) before bulk CSS rewrite  
3. Visual system + shell rewrite from DESIGN.md; chart pop-ins via `animate`  
4. Fictional I.T. mocks + **繁中** strings  
5. Harden A pages + Overview narrative  
6. Service Gap + dispatch polish  
7. Roster demand + **week board** integration (rebrand reference UX)  
8. Coach polish  
9. Energy polish + script copy  
10. Settings linkage  
11. Deploy path + presenter script  
12. Stretch: optional Supabase AI roster on **new retail project** only (flagged)

---

## 12. Risks

| Risk | Mitigation |
|------|------------|
| Ambition overruns calendar | Priority order above; stretch is explicitly optional |
| Roster board merge fights retail CSS | Re-skin to teal tokens; do not import restaurant amber theme |
| Glass-door counting skepticism | Demo labels counters as dedicated devices; mock honesty |
| No HVAC control at mall | Energy copy always conditional |
| Reference app Supabase coupling | Mock board for demo; keep `_reference` for later |

---

## 13. Approval

- Design sections §1–§5 and ambitious scope: **approved** 2026-09-04  
- Next: user reviews this written spec → `writing-plans` implementation plan → build
