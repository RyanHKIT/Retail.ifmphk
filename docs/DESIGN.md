---
name: IFMP Retail
description: Fashion-floor store ops dashboard — dual-source evidence (counter + camera) into dispatch, roster, and energy actions.
colors:
  accent: "#0c6f6a"
  accent-hover: "#0a5c58"
  accent-pressed: "#084845"
  accent-soft: "rgba(12, 111, 106, 0.12)"
  accent-bright: "#14a39c"
  ink: "#14202b"
  ink-secondary: "#3d4f5f"
  ink-muted: "#6b7c8c"
  paper: "#f7f9fb"
  paper-elevated: "#ffffff"
  paper-sidebar: "#eef2f6"
  line: "#cfd8e2"
  line-strong: "#b3c0ce"
  success: "#1f7a4c"
  warning: "#b86e00"
  danger: "#c0392b"
  info: "#2a6f97"
  chart-1: "#0c6f6a"
  chart-2: "#2a6f97"
  chart-3: "#c45c26"
  chart-4: "#5a6b7d"
  night-ink: "#e8eef4"
  night-ink-secondary: "#a8b6c4"
  night-ink-muted: "#7a8b9a"
  night-paper: "#0f161c"
  night-paper-elevated: "#172029"
  night-paper-sidebar: "#121a22"
  night-line: "#2a3642"
  night-line-strong: "#3a4754"
  night-accent: "#14a39c"
  night-accent-soft: "rgba(20, 163, 156, 0.18)"
typography:
  display:
    fontFamily: "Sora, Noto Sans TC, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  ui:
    fontFamily: "Noto Sans TC, Source Sans 3, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  kpi:
    fontFamily: "Sora, Noto Sans TC, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  mono:
    fontFamily: "JetBrains Mono, Noto Sans Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.35
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 14px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "#ffffff"
  source-chip:
    backgroundColor: "{colors.paper-elevated}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
    height: "22px"
  sidebar:
    width: "208px"
    backgroundColor: "{colors.paper-sidebar}"
  topbar:
    height: "56px"
    backgroundColor: "{colors.paper-elevated}"
---

# IFMP Retail DESIGN

> **Status:** Locked for Task 3+ implementation  
> **Scope:** `/retail` demo only (Approach 2 rewrite)  
> **Locale:** 繁中-first UI strings; English secondary  

## Mode

**Operate** (store ops dashboard)

Store managers and regional ops scan KPIs, dual-source evidence, and act (調度 / 排班 / 教練 / 能源). Brand lives in precise chrome and teal actions — not marketing theatrics on charts.

## Brand (interim)

| Role | Value |
|------|--------|
| Product | **IFMP Retail** |
| Mark | Small ifmphk mark in sidebar; Chinese product name placeholder until assets land |
| Case line | `I.T. demo · sample data` / 繁中: `I.T. 示範 · 樣本數據` (no fake I.T. trademark lockup) |
| Accent teal | `#0c6f6a` (IFMP family) |
| Ink | `#14202b` |
| Paper | `#f7f9fb` |
| Line | `#cfd8e2` |

Hero brand signal in the shell: sidebar title **IFMP Retail** at display weight — not a nav afterthought.

### CSS color tokens (normative)

Map these 1:1 in `apps/web` (Task 3). Day is default; Night via `[data-theme='night']` on `.app-shell`.

```css
.app-shell {
  /* Brand / accent */
  --accent: #0c6f6a;
  --accent-hover: #0a5c58;
  --accent-pressed: #084845;
  --accent-soft: rgba(12, 111, 106, 0.12);
  --accent-bright: #14a39c;
  --on-accent: #ffffff;

  /* Day neutrals */
  --ink: #14202b;
  --ink-secondary: #3d4f5f;
  --ink-muted: #6b7c8c;
  --paper: #f7f9fb;
  --paper-elevated: #ffffff;
  --paper-sidebar: #eef2f6;
  --line: #cfd8e2;
  --line-strong: #b3c0ce;

  /* Semantic */
  --success: #1f7a4c;
  --warning: #b86e00;
  --danger: #c0392b;
  --info: #2a6f97;

  /* Charts — no purple */
  --chart-1: #0c6f6a;
  --chart-2: #2a6f97;
  --chart-3: #c45c26;
  --chart-4: #5a6b7d;
}

.app-shell[data-theme='night'] {
  --accent: #14a39c;
  --accent-hover: #1bb5ad;
  --accent-pressed: #0c6f6a;
  --accent-soft: rgba(20, 163, 156, 0.18);
  --on-accent: #0f161c;

  --ink: #e8eef4;
  --ink-secondary: #a8b6c4;
  --ink-muted: #7a8b9a;
  --paper: #0f161c;
  --paper-elevated: #172029;
  --paper-sidebar: #121a22;
  --line: #2a3642;
  --line-strong: #3a4754;

  --success: #3d9b68;
  --warning: #d4922a;
  --danger: #e05545;
  --info: #4a8fba;
}
```

Legacy aliases (optional bridge during rewrite): `--text-primary` → `--ink`, `--bg-base` → `--paper`, `--border` → `--line`. Do not keep rose `#e11d48` or purple chart accents.

## Overview

IFMP Retail is a **fashion-floor ops board**: charcoal ink on cool off-white paper, soft stone rules, one teal accent for primary actions (一鍵調度, CTAs, active nav). Density sits between marketing dashboards and CCTV grids — scannable tables and charts, calm chrome, lively data enters.

Physical scene: store back-office / manager laptop under cool retail lighting → **Day default**; Night is a retained toggle for dark floors / evening demos, not the identity.

Color strategy: **Restrained** — neutrals + one teal accent.

## Colors

- **Accent** carries primary actions, selected nav, focus rings, and chart series 1 only.
- **Semantic** colors are for state (success / warning / danger / info), never decoration.
- **Warning** `#b86e00` is distinct from restaurant-roster amber `#B45309` — do not import Miaoda / hk-roster-planner amber theme.
- Heatmap / journey intensity may use a teal→earth ramp within the chart tokens; never violet/purple fills.

## Typography

繁中 is the design target. Load **Noto Sans TC** + **Source Sans 3** + **Sora** (+ JetBrains Mono for tabular codes).

| Token | Stack | Use |
|-------|--------|-----|
| `--font-display` | `Sora, "Noto Sans TC", system-ui, sans-serif` | Shell brand, page titles (Latin); CJK falls through to Noto |
| `--font-ui` | `"Noto Sans TC", "Source Sans 3", system-ui, sans-serif` | Nav, body, labels, forms, tables |
| `--font-kpi` | `Sora, "Noto Sans TC", system-ui, sans-serif` | KPI numerals / big metrics (`font-variant-numeric: tabular-nums`) |
| `--font-mono` | `"JetBrains Mono", "Noto Sans Mono", ui-monospace, monospace` | IDs, timestamps, raw event codes |

### Type scale (fixed rem — Operate)

| Step | Size | Weight | Role |
|------|------|--------|------|
| display | 1.375rem (22px) | 600 | Shell brand / page H1 |
| title | 1.125rem (18px) | 600 | Section heads |
| body | 0.875rem (14px) | 400 | Default UI |
| label | 0.75rem (12px) | 500 | Filters, chips, meta |
| kpi | 1.75rem (28px) | 600 | Overview KPI value |
| micro | 0.6875rem (11px) | 500 | SourceChip text, case line |

Scale ratio ~1.125–1.2. No fluid `clamp()` headings inside the app shell.

**Banned faces for this product:** Inter, Roboto, Arial, system-ui alone as the brand face, IBM Plex (incumbent handoff), and restaurant OPPOSans amber world.

## Layout

### Shell

| Element | Locked value |
|---------|----------------|
| Sidebar width | **208px** (slim; was 240px in handoff) |
| Sidebar bg | `--paper-sidebar` |
| Topbar height | **56px** |
| Topbar content | Store select · Date · Period · Day/Night · (optional EN) |
| Content padding | `20px 24px` |
| Main bg | `--paper` |
| Panels / cards | `--paper-elevated` + 1px `--line` |
| Max content column | fluid; tables may go full width |

Nav labels (繁中 primary):

總覽 · 客流 · 動線 · 人員 · 服務缺口 · 排班 · 教練 · 能源 · 設定

### SourceChip

Component: `SourceChip({ source: 'counter' | 'camera' | 'iot' })`

| Prop | Label 繁中 | Label EN |
|------|------------|----------|
| `counter` | 門禁計數 | Counter |
| `camera` | 店內攝像 | Camera |
| `iot` | IoT | IoT |

Styles:

```css
.source-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--paper-elevated);
  color: var(--ink-secondary);
  font-family: var(--font-ui);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.02em;
}
.source-chip__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent); /* camera */
}
.source-chip[data-source='counter'] .source-chip__dot { background: var(--info); }
.source-chip[data-source='camera'] .source-chip__dot { background: var(--accent); }
.source-chip[data-source='iot'] .source-chip__dot { background: var(--chart-3); }
```

Place on Footfall / Journey / Service Gap / Energy headers (and Overview dual-source hint).

### Density

- Row / control height target: **36px** primary controls; table rows **40px**
- Gap between KPI tiles: **12px**
- Card internal padding: **16px**
- Radius: controls `8px`; chips `6px`; panels `12px` max — no pill clusters

## Elevation & Depth

- Default: flat panels, **1px** `--line` borders — no multi-layer shadows, no glow.
- Soft lift only for popovers / dropdowns: `0 8px 24px rgba(20, 32, 43, 0.08)` (Day) / `0 8px 24px rgba(0, 0, 0, 0.45)` (Night).
- No frosted glass stacking that hurts scan.
- Active nav: `--accent-soft` fill + `--accent` text/icon — not a heavy bar shadow.

## Shapes

- `--radius-xs: 4px` · `--radius-sm: 6px` · `--radius-md: 8px` · `--radius-lg: 12px`
- Primary buttons: `8px`, solid teal fill, white (Day) / near-black (Night) label
- Avoid `rounded-full` pills except true circular status dots (6px)

## Motion

Apple-design informed: respond on press, interruptible state changes, chrome calm / charts lively. No bounce on chart enter.

### Tokens

```css
.app-shell {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --duration-press: 100ms;
  --duration-ui: 200ms;
  --duration-enter: 220ms;
  --duration-enter-stagger: 40ms;
}
```

### Rules

| Concern | Spec |
|---------|------|
| Chart / card enter | `opacity: 0 → 1` + `translateY(8px) → 0`, **220ms** `var(--ease-out)` (allowed range 200–250ms) |
| KPI row stagger | **40ms** per item |
| Press feedback | `:active` `scale(0.97)` at **100ms** ease-out on buttons only |
| Dispatch / state | opacity + color swap ≤ **200ms** ease-out; interruptible (no input lock) |
| `prefers-reduced-motion: reduce` | **opacity only** — drop translate/scale |
| Forbidden | `scale(0)` entrances; **ease-in** entrances; glow/pulse on chrome; bounce on chart load |

```css
@keyframes chart-enter {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.chart-enter {
  animation: chart-enter var(--duration-enter) var(--ease-out) both;
}
@media (prefers-reduced-motion: reduce) {
  .chart-enter {
    animation: none;
    opacity: 1;
    transform: none;
  }
  .chart-enter-reduced {
    animation: fade-only 180ms var(--ease-out) both;
  }
}
```

Recharts enter/pop-in from handoff is retained; polish with the `animate` skill under these tokens.

## Components

### Primary button (調度 / CTA)

- Fill `--accent`, label `--on-accent`, height 36px, padding `8px 14px`, radius 8px
- Hover `--accent-hover`; active `--accent-pressed` + press scale
- Focus-visible: 2px ring `--accent` at 40% opacity offset 2px

### Nav link

- Inactive: `--ink-secondary`, 14px / 500
- Hover: `--paper` wash or `--bg-hover` equivalent `#e4ebf1` Day / elevated Night
- Active: `--accent-soft` + `--accent` text

### Panels / KPI tiles

- Elevated paper + 1px line; no decorative gradient headers
- KPI: label micro muted → value `--font-kpi` → delta success/danger

## Do's and Don'ts

### Do

- Lead shell with **IFMP Retail** + teal accent actions
- Default locale **zh-Hant**; keep SourceChips visible where data provenance matters
- Keep charts animated; keep chrome quiet
- Re-skin roster week board to **these** tokens (teal chips, cool paper)

### Don't — Anti-references

| Forbidden look | Why |
|----------------|-----|
| **Purple SaaS** gradients / violet chart series / `#8b5cf6` badges | Generic AI-dashboard cliché; handoff `chart-2` purple is out |
| **Restaurant amber** (`#B45309` / warm cream kitchen sheets) | Miaoda / `_reference/hk-roster-planner` world — UX reference only, not visual |
| **Property-twin chrome clone** | Dark rose `#e11d48` accent + IBM Plex zinc shell from incumbent `retail.css` / estate IFMP — evidence only, replace |
| Cream + terracotta editorial | Training-data cluster; not fashion-ops IFMP |
| Glow, pulse, multi-shadow chrome | Noise on an ops board |

### Incumbent anti-reference (read-only)

`apps/web/src/retail.css` today: night-first zinc base, **rose accent `#e11d48`**, purple chart-2, sidebar **240px**, IBM Plex. Task 3 rewrites tokens/shell against **this** file as anti-reference — do not polish that look.

## Direction contract (retail shell)

Recorded for Task 3 implementers (also mirrored in `docs/surfaces/retail-shell.md`):

- **THESIS:** Fashion-floor ops board — evidence in, action out; refuses purple SaaS and property-estate chrome.
- **OWN-WORLD:** Cool paper `#f7f9fb`, ink `#14202b`, stone lines, single teal `#0c6f6a`, Sora + Noto Sans TC.
- **STORY:** Manager sees today's gaps and sources, then 調度 / 排班.
- **FIRST VIEWPORT:** Slim 208px sidebar (IFMP Retail brand) + 56px filter topbar + Overview KPI row entering 8px up.
- **FORM:** Operate / Restrained teal; brief-pinned (no concept re-roll).
- **FINISH:** Unreviewed and undocumented is unfinished; CSS rewrite ends when tokens match this file and SourceChip ships.
