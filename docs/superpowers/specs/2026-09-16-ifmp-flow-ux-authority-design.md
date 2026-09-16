# IFMP Retail (Flow) — UX authority: light Verkada density

> **Date:** 2026-09-16
> **Status:** Approved 2026-09-16. **Amended same day:** tools-first restored. Phase 4 heatmap ships on current `/flow` chrome. Full Verkada harvest remains after estate-ai-ops Task 6. **Amended again:** Phase 5 ships a **reduced** `pilot-v1` chrome now (`docs/superpowers/specs/2026-09-16-ifmp-flow-pilot-v1-chrome-design.md`) so the pilot is demo-able; that folder is delete-able.
> **Product:** IFMP Retail pilot (`/flow` in `apps/web`)
> **Parent:** `docs/superpowers/specs/2026-09-15-ifmp-flow-design.md`
> **Supersedes in parent:** §6 shell line “Verkada-inspired dark ops” (look target, not Phase 4 work). Parent §8 step 6 Open Design stays **after** Phase 4 tools.
> **Related:** estate-ai-ops `docs/superpowers/specs/2026-09-16-ifmp-verkada-rework-design.md` (pattern source, different product)
> **Anti-references:** `apps/web/src/styles/flow.css` (navy + Inter); DongQia `keliu.dongqia.com` chrome; `/retail` pitch SPA

## 1. Problem

`/flow` shipped widgets 1–8 with a night-first navy Inter shell. That look is accidental vendor-dashboard gravity, not the product. The user does not want it.

`docs/DESIGN.md` still describes a **teal paper** world scoped to the `/retail` pitch. That pitch will be trashed when `/flow` is the live product. Do not keep teal as Flow’s identity.

Good UI on this project failed when code led and comps followed. That order reverses.

## 2. Goal

Make `/flow` a **light-first Operate console** with Verkada-grade density and calm.

Success: a 分店經理 can scan Overview on a bright back-office laptop; Night theme still works for evening floor demos; heatmap and widgets share one shell after restyle. Phase 4 ships the heatmap **before** that restyle.

## 3. Scope

**In (restyle pass, after Phase 4 + Task 6)**

- `/flow/*` chrome only (`FlowShell`, `flow.css` tokens). Heatmap renderer already shipped.
- Rewrite Flow visual tokens (and a Flow surface brief / `DESIGN.md` Flow section) to the world in §5.
- Harvest **patterns** from estate-ai-ops after its Verkada Task 6 finish-review: icon rail, page bar, command palette, sit-back-down elevation, compact 32px controls, Signal Blue as the one pointer.

**Out**

- `/retail/*`. Do not restyle. Trash when Flow cutover is ready (parent §8 step 8).
- DongQia extras (53-week / 12-month / 13-week peak charts, 駐留 as a separate IA dump, 承載力預警, 客流日報, 銷售/租營, 微信/郵箱). Backlog after Phase 4 at most: 進店率 KPI if passersby is trustworthy.
- Copying Verkada trademarks, black-canvas default, or estate-ai-ops Live wall / Events desk pages (those are FM cameras, not retail).
- Restyling `/flow` chrome during Phase 4. Heatmap uses existing `flow.css`.
- Implementing the heatmap in this UX-authority file — that is `docs/superpowers/specs/2026-09-16-ifmp-flow-phase4-journey-design.md`.

## 4. Users and mode

**Operate.** 分店經理 / 區域營運. Scan KPIs, drill, act (調度 / 排班 later). Brand lives in precise chrome. Charts may move; chrome stays quiet.

Locale: 繁中 first, English toggle. Same type metrics for both (no separate EN/zh ramps).

## 5. Visual world (locked)

| Role | Decision |
|------|----------|
| Default | **Light.** Cool paper field, hairline cards, charcoal ink. |
| Night | Second theme, same layout, swapped tokens. Evening / dark-floor demo. Not a second product. |
| Pointer | **One Signal Blue** (`#2563eb` light / `#3b82f6` night). Nav active, focus ring, primary button. |
| Status | Success / warning / danger / info for state only. Blue never means error. |
| Type | One UI family + Noto Sans TC. **Banned as brand face:** Inter, IBM Plex, teal-Sora lock from the `/retail` DESIGN.md. |
| Density | Compact controls (~32px), slim rail, tables/charts eat the remaining viewport. |
| Elevation | Flat at rest (1px line). Lift on hover / overlay, then sit back down. No stacked card shadows, no glow chrome. |
| Motion | Press feedback on buttons; chart enter opacity + 8px rise; `prefers-reduced-motion` = opacity only. |

**Thesis:** Fashion-floor ops board that borrows Verkada’s *density grammar*, not Verkada’s night identity.

**Own-world:** Paper Deck cool light + one Signal Blue pointer + bilingual chrome. Night is a shift.

**Anti-references (do not polish toward these)**

- Current `/flow` navy `#0d1220` + accent `#2f81f7` + Inter.
- DongQia blue KPI slabs, occupancy museum modal, export-first vendor IA.
- Purple SaaS, restaurant amber, `/retail` rose `#e11d48` + IBM Plex.

## 6. Shell (intent, not CSS)

Adapt estate-ai-ops RoleShell patterns to **retail nav**, not camera nav.

- Left rail: 主控台, 動線熱力, 排班 (and existing `/flow` children). Bottom: theme, language, user. Labels via tooltip if icon-only; keep text labels if the rail is wider — pick one in comps, do not ship both.
- Page bar: page title + store/date filters that already exist + optional command palette (pages + widgets, not cameras).
- Main: padded work surface. Journey heatmap may go fuller-bleed; Overview stays a widget board.
- Mobile: rail collapses to chips; one layout system.

Do not invent a Live wall or Events three-pane for footfall.

## 7. Process (binding)

**Tools first, then visual world.** Parent §9: Open Design after widgets exist. Phase 3 widgets exist. Phase 4 adds the last mandated tool (動線熱力) on the **current** shell so comps later have real data and real routes. Restyling first would redo every heatmap layout after Verkada Task 6.

Sequence:

1. **Phase 4 now** — floorplan + zones + density renderer + `/flow/journey` + Overview compact card. Keep `flow.css`. See Phase 4 spec.
2. **Wait** estate-ai-ops Task 6 finish-review (`feature/roleshell-status-board`).
3. **Harvest** RoleShell patterns. Analysis only.
4. **Comps (G1)** — OpenDesign for Overview + Journey bound to §5. User approves.
5. **Restyle** `FlowShell` + tokens. Heatmap renderer stays; only chrome/tokens change.
6. **Impeccable** `critique` then `polish`. Browser path: login → Overview → Journey.

Phase 3 data/widgets stay. This spec does not reopen ETL, RLS, or widget mandate 1–8.

## 8. Phase 4 relationship

Phase 4 = parent §8 step 4 **tooling only** (floorplan, seed, Gaussian overlay, metric toggle, zone focus). Not the Verkada restyle.

DongQia 駐留 is not a Phase 4 page. Dwell is a metric toggle on the same five zones.

## 9. Risks

| Risk | Mitigation |
|------|------------|
| Harvesting FM Signal Blue into a teal DESIGN.md fight | This spec wins for `/flow`. Teal DESIGN.md applies only to dying `/retail`. |
| Cloning Verkada black because screenshots are dark | Default is light. Night is the toggle. |
| Starting restyle while Task 6 still pending | Phase 4 may ship heatmap. No `/flow` **chrome** PR until Task 6 + G1. |
| Agent “improves” UI mid-heatmap | Point at this file. Keep `flow.css`. Comps after Phase 4. |

## 10. Open decisions (must not invent in code)

- Exact rail for the **next** shell after Task 6 + G1: icon-only 56px vs labeled slim. **`pilot-v1` (Phase 5) is labeled 208px** — see chrome design spec.
- Whether command palette ships in that later restyle. **Phase 5: no palette.**
- Precise paper/ink hex for the **next** shell may come from estate-ai-ops Paper Deck. **`pilot-v1` hex is already pinned** in Phase 5 §6.3.

---

## Approval

Visual authority, `/flow`-only scope, two themes (light default), Verkada restyle **after** Phase 4 + Task 6, `/retail` ignored: **approved 2026-09-16**; tools-first amendment same day.
