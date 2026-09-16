# IFMP Retail · Gemini deck-generation instructions — Design

**Date:** 2026-09-17
**Status:** Approved (user confirmed 2026-09-17)
**Deliverable:** `docs/presentation/2026-09-17-gemini-ifmp-retail-instructions.md`
**Supersedes:** nothing. Follows `docs/presentation/2026-09-13-ifmp-retail-cantonese-flow.md` (approved narrative) as a formal re-cut.

## Goal

Produce one instruction document that a user pastes into Gemini so Gemini generates a
complete client-facing `.pptx` for **I.T. 時裝零售** (existing pilot client), presenting
the IFMP Retail platform and HKIT's delivery services, on the company template.

The instruction document is the artifact. Gemini's output is a draft deck that a human
then re-skins with the real corporate template.

## Constraints

- **Company template is mandatory.** The corporate `.pptx` exists only on the user's
  machine; it is not in this repository and cannot be read by the agent.
- **Gemini cannot inherit a PowerPoint slide master.** A generated `.pptx` will not
  carry the template's layouts, colours, or logo. Template fidelity must therefore be
  handled in two steps: (1) approximate the brand with explicit tokens, and (2) re-apply
  the real template after generation.
- **Gemini cannot embed our product screenshots.** Screenshots must be placed by hand.
- Slide content language: **香港繁體書面語** (not Cantonese colloquial). Speaker notes may
  describe Cantonese delivery.
- Content boundaries inherited from `docs/PRODUCT.md` §1.3 and the 2026-09-13 deck:
  no face-ID identification, no promise of HVAC control without write access, no city-wide
  rollout claim, no confirmed pricing figures, sample-data disclaimer on all product shots.
- Existing deck skills (`guizang-ppt-skill`, `dashi-ppt`, `zh-hk-deck-copy`) emit their own
  HTML decks and are **out of scope** — they cannot honour the locked corporate template.

## Decision

**Approach 1 — locked content + thin design brief**, with a two-pass gate embedded in the
instruction document.

Rejected alternatives:

- *Two-pass as two separate messages only* — kept as a gate inside the single document
  instead, so the user has one artifact to paste and one approval point.
- *Template XML surgery* — Gemini emits JSON keyed to template placeholders and a script
  merges into the `.pptx`. Most faithful, but heavy and belongs to the Cursor phase, not
  Gemini.
- *Let Gemini restructure the narrative* — rejected by the user; the structure is authored
  here from `PRODUCT.md` plus brand facts, and Gemini only decorates.

## Instruction document structure

The deliverable file has four sections, in this order.

**Section A — Role and hard rules.**
Sets Gemini's role (deck producer, not copywriter), the mandatory template-first rule, the
banned behaviours (inventing brand assets, pricing, rollout dates, competitor naming,
face-ID claims, HVAC control claims), and the language rule.

**Section B — Template token table.**
A table the user fills by opening the corporate `.pptx`. Fields: primary blue, secondary
neutral, accent, background, title font (CJK + Latin), body font (CJK + Latin), logo
position and variant on light vs dark, footer content, title placeholder geometry, body
placeholder geometry, slide size (16:9 vs 4:3). Gemini must use only these tokens for
colour and type. Also states the post-generation re-skin procedure.

**Section C — Locked slide map.**
18 slides, four acts. Each slide specifies: number, title, layout type, body copy, required
`[[SHOT: id]]` placeholder, and speaker note. Gemini may adjust layout within the token
system but must not alter, add, or reorder slides.

**Section D — Acceptance checklist and repair loop.**
A checklist Gemini must self-verify against before returning, plus a repair instruction for
when the user reports a defect (e.g. "slide 7 spills", "font wrong on act 3").

**Two-pass gate.** Section A instructs Gemini to first return only the slide list and a
one-line summary per slide, and to wait for explicit approval before generating the deck.

## Amendment 2026-09-17 — slide map re-cut against the shipped product

The first draft of this spec was written from `docs/PRODUCT.md`, which describes the
retired `/retail` demo. The shipped product is `/flow` and its surfaces differ. Verified
against `apps/web/src/App.tsx` routes, `src/i18n/flowMessages.ts` nav labels, and
`docs/flow-pilot-phase5.md`:

- Service gap and Coach are **not shipped** and have no route. There is no page to
  screenshot, so a slide promising "服務缺口 → 一鍵調度" would be an unbacked claim.
- AI analysis and platform Q&A are `awaiting approval` in
  `docs/superpowers/specs/2026-09-17-ifmp-flow-ai-insights-design.md` — not shipped.
- Shipped surfaces are richer than PRODUCT.md implies: roster carries a full governance
  set (week board, staff registry, shift templates, hour policies, swap approval, audit),
  plus Compare, Holidays and Devices, none of which PRODUCT.md lists.

User decision: **re-cut to shipped surfaces.** Service gap, dispatch, coach, AI, POS,
multi-store and energy move to a single roadmap slide, explicitly labelled 未上線, with no
screenshot. This keeps every product screenshot in the deck backed by a real page.

## Locked slide map (re-cut, 18 slides)

**Act 1 · Why talk (S1–S4)**
1. 封面 — IFMP Retail｜零售營運主控台; I.T. 方案介紹 · 示範畫面; HKIT 智域 × 百度一見
2. 本日三項重點
3. 現場四項痛點
4. 常見失敗模式（類型對照，不點名競品）

**Act 2 · What the platform is (S5–S7)**
5. 方案一句話
6. 架構一頁 — 門禁計數／鏡頭 → 一見（感知）→ IFMP（營運）→ 店長工作流程
7. 誠實邊界 — 刻意不做的事項

**Act 3 · How the service lands (S8–S14)**
8. 平台導覽（橫向故事板）
9. 主控台
10. 出入口
11. 動線熱力
12. 客群畫像 與 同期對比
13. 節假日 與 設備
14. 排班與管治（週板 + 名冊／模板／政策／調更／審計）

**Act 4 · Delivery and next step (S15–S18)**
15. 已上線 與 路線圖（服務缺口、調度、教練、AI、POS、多店、能源，明標未上線）
16. HKIT 實施服務（現場標定、平台對接、平面圖與區域設定、人員識別基礎、培訓與支援）
17. 試點如何開始（四步 + 請貴司決定事項）
18. 封底

Dropped from the 2026-09-13 map: the standalone capability slide (folded into 15) and the
separate energy slide (folded into 15). Package C stays roadmap-only. Package packaging
(A 看見／B 行動／C 閉環／D 綠色) is described by scope, never by price.

Placeholder ids actually used: `golden-path`, `overview`, `entrances`, `journey`,
`audience`, `compare`, `holidays`, `devices`, `roster-week`, `roster-swaps`,
`roster-audit`, `architecture`.

## Acceptance criteria

- The instruction document can be pasted into Gemini with no missing context and no
  reference to files Gemini cannot see.
- Every slide in the map has title, layout type, body copy, placeholder list, speaker note.
- **Every product screenshot placeholder maps to a route that exists in `App.tsx`.** Any
  capability not shipped appears on slide 15 only, labelled 未上線, with no placeholder.
- Section B is complete enough that a user with the template open can fill it in under
  five minutes.
- Banned-content rules appear in both Section A and Section D (so they survive a long
  generation).
- The two-pass gate is unambiguous about stopping after the slide list.
- No pricing figures, no dates, no competitor names appear anywhere in the locked copy.
- No Cantonese colloquial characters in slide body copy (嘅／咗／喺／唔／係／嗰／啲).

## Out of scope

- The Cursor-generated deck path. Separate phase, to be designed after the Gemini document
  is reviewed. Likely `python-pptx` against the real template, or HTML → PPTX.
- Producing the actual `.pptx`. That is Gemini's job plus a human re-skin.
- Reading or modifying the corporate template.

## Risks

| Risk | Mitigation |
|------|-----------|
| Gemini ignores token table and invents its own palette | Hard rule in A, repeated in D; repair loop names the offending slide |
| Generated deck overflows Chinese text in Latin-sized boxes | Section B records CJK font; Section D checks overflow per slide |
| User pastes template tokens wrongly, deck looks off-brand | Token table asks for values copied from `設計 > 佈景主題` inspector, not eyeballed |
| Two-pass gate skipped, wasted generation | Gate is the first instruction in Section A |
| Screenshots not yet captured when deck is generated | Placeholder ids fixed in Section C and listed as a follow-up checklist in Section D |

---

## Amendment 2026-09-17 — the deck is now built directly on the template

The requirement changed to "a deck needing the fewest possible manual
adjustments". That rules out the Gemini route as the primary path: a generated
`.pptx` carries no slide master, so every one of the 19 slides would have to be
re-imported, re-laid-out and re-typed. That is the most adjustment, not the
least.

### What changed

- **Primary path is now `python-pptx` against the corporate template.** The
  template was provided at `docs/presentation/company-template.pptx` and is
  git-ignored (it is the company's file, not ours). Slides are created on the
  template's own layouts, so the master background, logo, theme colours and
  fonts are inherited rather than reproduced.
- **The Gemini instruction document is demoted to a fallback.** It remains at
  `docs/presentation/2026-09-17-gemini-ifmp-retail-instructions.md` for the
  separate Gemini trial. Its Part C is now out of date — see "Drift" below.

### What the template turned out to be

Measured with `scripts/deck/inspect_template.py`, not assumed:

- 16:9, 33.87 × 19.05 cm, 12 stock Office layouts, one empty title slide.
- Theme is the stock **Office** scheme: Calibri, and accent1 `4F81BD`,
  dk2 `1F497D`. No corporate colour or font set exists in it.
- The master carries three images. Only one produces visible ink: the
  **百度智能雲 | HKIT lockup in the top-right corner**, x 24.6–32.5 cm,
  y 0.4–1.3 cm. A pale hexagon sits top-left. Nothing below y 1.9 cm is darker
  than 200/255, so the whole lower slide is usable for content.
- Consequence: no brand assets need to be drawn or placed, and the stock layout
  geometry is safe. The East Asian theme face is empty, which falls back to
  新細明體, so 微軟正黑體 is set explicitly on every run.

### Screenshots

Eleven captures at 1920×1080 in `docs/presentation/shots/`, taken from the
running app on 5174 with the manager session. `browser_take_screenshot` returns
only the visible browser pane (1031×1080), so captures go through
`Page.captureScreenshot` with `captureBeyondViewport` instead.

Product truth as at this date, verified against `App.tsx`:

- **AI analysis is shipped and live**, contrary to the `awaiting approval`
  status on `2026-09-17-ifmp-flow-ai-insights-design.md`. It is a real slide,
  not a roadmap line.
- Service gap, dispatch and coach remain unbuilt. The action-layer draft
  (`2026-09-17-ifmp-flow-action-layer-design.md`) is still under review, so they
  stay on the roadmap slide with no screenshot.

That takes the deck from 18 to **19 slides**: the AI slide is new, and the
roadmap slide drops AI analysis and platform Q&A from its roadmap column.

### Verification

Adjustment happens when a deck is only checked by eye. `scripts/deck/` therefore
verifies before hand-over:

| Script | Purpose |
|---|---|
| `inspect_template.py` | Reports template size, layouts, theme, media usage |
| `build_deck.py` | Builds the deck from template + content |
| `verify_deck.py` | Out-of-bounds shapes, footer-band collisions, estimated text overflow, text-over-image and text-over-text overlaps, and `rPr` child order |
| `make_contact_sheet.py` | Contact sheets for review |

`verify_deck.py` found one real defect (a strip caption row running off the
slide) and one latent one: `a:cs` was being written before `a:ea` inside `rPr`,
which is out of schema order and a repair-prompt risk. Both are fixed, and the
order rule is now checked automatically. The deck renders through PowerPoint COM
to PNG for a visual pass.

Current state: 19 slides, 0 findings.

### Regeneration

```powershell
python scripts/deck/build_deck.py
python scripts/deck/verify_deck.py docs/presentation/IFMP-Retail-deck-v1.pptx
```

Copy lives in `scripts/deck/deck_content.py`, separate from layout code, so the
copy can be edited without touching geometry. This matters because the action
layer is expected soon: when `/flow/service-gap`, `/flow/dispatch` and
`/flow/coach` ship, the roadmap slide shrinks, those features get their own
screenshots, and the deck is regenerated in one command.

### Drift

The Gemini document's Part C still describes 18 slides and does not contain the
AI slide. If the Gemini trial goes ahead, Part C must be rebuilt from
`deck_content.py`, which is now the single source of truth for slide order and
copy.
