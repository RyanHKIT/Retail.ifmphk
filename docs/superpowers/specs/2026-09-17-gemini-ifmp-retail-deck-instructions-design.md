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

## Locked slide map

**Act 1 · Why talk (S1–S4)**
1. Cover — IFMP Retail｜店內客流與營運智能化; HKIT 智域 × 百度一見
2. 本日三項重點
3. 現場四項痛點
4. 常見失敗模式（類型對照，不點名競品）

**Act 2 · What the platform is (S5–S8)**
5. 方案一句話
6. 架構一頁 — 門禁計數／鏡頭 → 一見（感知）→ IFMP（規則＋看板＋行動）→ 店長工作流程
7. 為何選擇本方案（對照表）
8. 誠實邊界 — 刻意不做的事項

**Act 3 · How the service lands (S9–S15)**
9. Golden path 總覽
10. 總覽 Overview
11. 客流 Footfall
12. 動線 Journey（熱力）
13. 服務缺口 → 一鍵調度
14. 排班建議 Roster
15. 服務教練 Coach

**Act 4 · Delivery and next step (S16–S18)**
16. 能源 — 降本短節、誠實表述
17. 套餐地圖 A／B（主推）／C／D + HKIT 實施服務（標定、Webhook 對接、工服庫、培訓、支援）
18. 試點如何開始 + 下一步 + 封底

Removed relative to the 2026-09-13 map: the standalone capability slide (old S17), folded
into slide 17. Package C is roadmap-only and stays off the main line.

Placeholder ids: `[[SHOT: overview]]`, `footfall`, `journey`, `service-gap`, `roster`,
`coach`, `energy`, `architecture`.

## Acceptance criteria

- The instruction document can be pasted into Gemini with no missing context and no
  reference to files Gemini cannot see.
- Every slide in the map has title, layout type, body copy, placeholder list, speaker note.
- Section B is complete enough that a user with the template open can fill it in under
  five minutes.
- Banned-content rules appear in both Section A and Section D (so they survive a long
  generation).
- The two-pass gate is unambiguous about stopping after the slide list.
- No pricing figures, no dates, no competitor names appear anywhere in the locked copy.

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
