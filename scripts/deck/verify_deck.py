"""Check a generated deck for geometry problems, before anyone opens it.

Two objective checks, both cheap enough to run after every build:

1. Any shape that falls outside the slide.
2. Any text frame whose estimated rendered height exceeds the height of the box
   it sits in — the usual cause of text spilling under a neighbouring element.

The height estimate is deliberately conservative. It treats every CJK character
as one em wide and every Latin character as half an em, which over-estimates
Latin and so errs towards reporting a problem that is not there. A clean report
is therefore meaningful; a short report is worth a look.

Usage:
    python scripts/deck/verify_deck.py docs/presentation/IFMP-Retail-deck-v1.pptx
"""

from __future__ import annotations

import io
import math
import sys
from pathlib import Path

from pptx import Presentation
from pptx.oxml.ns import qn
from pptx.util import Emu

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

CM = 360000


def is_cjk(ch: str) -> bool:
    code = ord(ch)
    return (
        0x2E80 <= code <= 0x9FFF
        or 0xF900 <= code <= 0xFAFF
        or 0xFF00 <= code <= 0xFF60
        or 0x3000 <= code <= 0x303F
    )


def text_width_em(text: str) -> float:
    return sum(1.0 if is_cjk(ch) else 0.5 for ch in text)


def estimate_height_cm(tf, box_width_cm: float) -> float:
    total = 0.0
    for para in tf.paragraphs:
        text = "".join(run.text for run in para.runs)
        if not text.strip():
            total += 0.35
            continue
        size = None
        for run in para.runs:
            if run.font.size is not None:
                size = run.font.size.pt
                break
        size = size or 18.0
        spacing = para.line_spacing if isinstance(para.line_spacing, float) else 1.2
        # A point is 1/72 inch; 2.54 cm per inch.
        size_cm = size / 72 * 2.54
        usable = max(box_width_cm - 0.1, 1.0)
        lines = max(1, math.ceil(text_width_em(text) * size_cm / usable))
        total += lines * size_cm * max(spacing, 1.0) * 1.15
        if para.space_after is not None:
            total += para.space_after.pt / 72 * 2.54
    return total


def rect(shape) -> tuple[float, float, float, float]:
    left = (shape.left or 0) / CM
    top = (shape.top or 0) / CM
    return left, top, left + (shape.width or 0) / CM, top + (shape.height or 0) / CM


def overlap_area(a, b) -> float:
    ax0, ay0, ax1, ay1 = a
    bx0, by0, bx1, by1 = b
    dx = min(ax1, bx1) - max(ax0, bx0)
    dy = min(ay1, by1) - max(ay0, by0)
    if dx <= 0 or dy <= 0:
        return 0.0
    return dx * dy


def describe(shape) -> str:
    if shape.has_text_frame and shape.text_frame.text.strip():
        return repr(shape.text_frame.text.strip()[:28])
    return str(shape.shape_type).split(" ")[0]


def check_overlaps(slide) -> list[str]:
    """Report text that sits on top of other content.

    A picture and the hairline frame drawn around it are meant to overlap, so
    frames are skipped. Anything else overlapping a text box is either a
    collision or a text box drawn over a neighbour, and both are worth seeing.
    """
    findings: list[str] = []
    solids = []
    texts = []
    for shape in slide.shapes:
        if shape.shape_type is not None and "PICTURE" in str(shape.shape_type):
            solids.append((shape, rect(shape)))
        elif shape.has_text_frame and shape.text_frame.text.strip():
            texts.append((shape, rect(shape)))
        elif shape.shape_type is not None and "AUTO_SHAPE" in str(shape.shape_type):
            # Decorative cards and bands: text over them is intended.
            continue

    for i, (tshape, trect) in enumerate(texts):
        for oshape, orect in solids:
            area = overlap_area(trect, orect)
            if area <= 0.6:
                continue
            findings.append(
                f"  text over image: {describe(tshape)} overlaps "
                f"{describe(oshape)} by {area:.1f} cm2"
            )
        for oshape, orect in texts[i + 1 :]:
            area = overlap_area(trect, orect)
            if area <= 1.0:
                continue
            findings.append(
                f"  text over text: {describe(tshape)} overlaps "
                f"{describe(oshape)} by {area:.1f} cm2"
            )
    return findings


XML_ORDER = ["a:ln", "a:solidFill", "a:latin", "a:ea", "a:cs"]


def check_run_order(prs) -> list[str]:
    """Verify parent/child order inside every run's rPr.

    PowerPoint prompts to repair a file whose run properties are out of schema
    order, and the damage is invisible in a render, so it is checked here.
    """
    findings: list[str] = []
    ranks = {qn(tag): i for i, tag in enumerate(XML_ORDER)}

    def walk(frames, where: str):
        for tf in frames:
            for para in tf.paragraphs:
                for run in para.runs:
                    rPr = run._r.find(qn("a:rPr"))
                    if rPr is None:
                        continue
                    seen = [child.tag for child in rPr if child.tag in ranks]
                    ordered = sorted(seen, key=lambda t: ranks[t])
                    if seen != ordered:
                        names = [t.split("}")[-1] for t in seen]
                        findings.append(
                            f"  rPr child order: {names} in {where} -> {run.text[:20]!r}"
                        )

    for i, slide in enumerate(prs.slides, start=1):
        text_frames = [s.text_frame for s in slide.shapes if s.has_text_frame]
        for shape in slide.shapes:
            if shape.has_table:
                for row in shape.table.rows:
                    for cell in row.cells:
                        text_frames.append(cell.text_frame)
        walk(text_frames, f"slide {i}")
    return findings


def main(path_str: str) -> int:
    path = Path(path_str)
    if not path.exists():
        print(f"missing: {path}")
        return 1

    prs = Presentation(str(path))
    slide_w = prs.slide_width / CM
    slide_h = prs.slide_height / CM

    problems = 0
    print(f"deck: {path.name}   slide {slide_w:.2f} x {slide_h:.2f} cm   slides: {len(prs.slides)}")
    print("footer band starts at 17.66 cm; content must finish above it")
    print()

    FOOTER_TOP = 17.60

    for i, slide in enumerate(prs.slides, start=1):
        notes: list[str] = []
        for shape in slide.shapes:
            left = (shape.left or 0) / CM
            top = (shape.top or 0) / CM
            width = (shape.width or 0) / CM
            height = (shape.height or 0) / CM
            right = left + width
            bottom = top + height

            if right > slide_w + 0.05 or bottom > slide_h + 0.05 or left < -0.05 or top < -0.05:
                notes.append(
                    f"  out of bounds: {shape.shape_type} at "
                    f"({left:.2f},{top:.2f}) size ({width:.2f}x{height:.2f}) "
                    f"-> right {right:.2f} bottom {bottom:.2f}"
                )

            # The footer slots live at 17.66; anything starting above that and
            # reaching into the band will print on top of the footer text.
            if bottom > FOOTER_TOP and top < 17.5:
                label = ""
                if shape.has_text_frame and shape.text_frame.text.strip():
                    label = f" {shape.text_frame.text[:26]!r}"
                notes.append(
                    f"  into footer band: bottom {bottom:.2f} (top {top:.2f}){label}"
                )

            if not shape.has_text_frame:
                continue
            text = shape.text_frame.text
            if not text.strip():
                continue
            estimated = estimate_height_cm(shape.text_frame, width)
            if estimated > height + 0.35:
                notes.append(
                    f"  text may overflow: {text[:34]!r} "
                    f"est {estimated:.2f}cm in box {height:.2f}cm (w {width:.2f}cm)"
                )

        notes.extend(check_overlaps(slide))

        if notes:
            problems += len(notes)
            print(f"[slide {i:02d}] {slide.shapes.title.text if slide.shapes.title is not None else '(no title)'}")
            for n in notes:
                print(n)
            print()

    order_findings = check_run_order(prs)
    if order_findings:
        problems += len(order_findings)
        print("[run property order]")
        for n in order_findings:
            print(n)
        print()

    print(f"total findings: {problems}")
    return 0


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "docs/presentation/IFMP-Retail-deck-v1.pptx"
    raise SystemExit(main(target))
