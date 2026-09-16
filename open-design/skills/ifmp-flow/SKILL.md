---
name: ifmp-flow
zh_name: "IFMP Flow 主控台"
en_name: "IFMP Flow Console"
description: |
  Build Operate-mode web prototypes for IFMP Flow — IFMPHK ecosystem footfall / people-flow
  ops console plus MeDo-parity roster. Features mirror 客流管家 主控台; visual language is
  Verkada Command–inspired (dark ops shell, dense telemetry, calm chrome)—not a Verkada brand clone.
  Data scope: one mock I.T. store in Hong Kong only. Do not invent other brands or cities.
  Sibling to IFMP Retail; do not reuse /retail UI.
  Trigger: IFMP Flow, 客流管家, 主控台, footfall, roster, Verkada-style ops dashboard.
zh_description: |
  IFMP Flow（ifmphk 生態）客流運維主控台 + 排班 Operate 原型：功能對齊客流管家主控台與 MeDo 排班，
  視覺參考 Verkada Command。數據僅限一間模擬 I.T. 香港門店。與 IFMP Retail 並列，勿混用 /retail。
en_description: |
  IFMP Flow console prototypes for ifmphk: 客流管家 feature parity, MeDo-parity roster,
  Verkada-inspired look, one mock I.T. Hong Kong store only. Sibling to IFMP Retail.
triggers:
  - "IFMP Flow"
  - "ifmp-flow"
  - "客流管家"
  - "主控台"
  - "footfall"
  - "roster"
  - "排班"
  - "Verkada-style dashboard"
  - "I.T. Hong Kong"
od:
  mode: prototype
  surface: web
  scenario: operation
  category: dashboard
  preview:
    type: html
  example_prompt: |
    Design the IFMP Flow 主控台 overview for the mock I.T. Hong Kong store: left nav, KPI strip,
    today footfall trend, Verkada Command–inspired dark ops shell. Brand as IFMP Flow.
  example_prompt_i18n:
    zh-CN: "為模擬 I.T. 香港門店設計 IFMP Flow 主控台總覽：左側導航、KPI 條、今日客流趨勢，Verkada Command 風格深色運維殼，品牌標示 IFMP Flow。"
  design_system:
    requires: true
  craft:
    requires: [typography, color, anti-ai-slop, accessibility-baseline, state-coverage]
  critique:
    policy: opt-in
---

# IFMP Flow — workflow

## Product lock

- **Product:** **IFMP Flow** (ifmphk ecosystem) — footfall ops console + MeDo-parity 排班.
- **Bar:** customer pilot (店長/經理 daily use) — not pitch-only demo.
- **Feature sources:** 客流管家 主控台 + full MeDo 排班 parity.
- **Look:** Verkada Command–inspired. Not Verkada logos or trademarks.
- **Data:** **One mock I.T. store in Hong Kong only.** No 北京优衣库. No other brands/cities.
- **Isolation:** Sibling to **IFMP Retail** (`/retail`). Surface `/flow`. Do not copy retail IA or tokens.

## Brand chrome

- Product name: **IFMP Flow**. Optional subtitle 客流主控台 / 排班.
- Ecosystem: IFMP / ifmphk. Not “keliu”, not 动恰/客流管家 as product title (source refs only).
- Site label: use the agreed mock I.T. HK store name (see references/brief.md).

## What to make

Single-file (or few-file) **web prototype** for one screen per run unless user asks for a set.

Typical screens:

1. Overview / home 主控台
2. Real-time / live footfall
3. Trends & reports
4. Zones / heat / floorplan overlays
5. Alerts / exceptions
6. Device / camera / sensor status
7. Roster (MeDo-parity week board and related flows)
8. Settings / org (read-only stub OK early)

Default if unnamed: **Overview 主控台**.

## Visual direction (when no DESIGN.md wins)

Prefer active Design System. Else:

- Dark navy/charcoal shell; clear hierarchy
- Left nav + top context (site = mock I.T. HK store)
- KPI row: 进店 / 客流 / related metrics; Chinese or EN to match brief
- One primary time series + secondary table/list
- No purple AI gradients, glass spam, or emoji chrome
- Dense ops UI; high scanability

## Workflow

1. Read Design System + craft rules.
2. Confirm screen + primary job (scan / decide / drill-down).
3. IA: 客流管家 / MeDo language; brand chrome = IFMP Flow.
4. Write `index.html`. Static nav; single-store data only.
5. Mark sample data if not live.
6. Self-check: focusable controls; contrast on dark shell.
7. Stop. No marketing landing pages.

## Anti-goals

- No Verkada trademarks.
- No IFMP Retail `/retail` IA or tokens.
- No 北京优衣库 or non–I.T. HK stores.
- No passwords, API keys, or live credentials in artifacts.
