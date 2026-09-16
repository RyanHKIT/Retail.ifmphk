"""Build the IFMP Retail client deck from the company template.

Reads the corporate template and writes a new deck onto its own layouts, so the
master background, logo, theme fonts and colour scheme are inherited rather than
reproduced. Screenshots are placed from `docs/presentation/shots/`. Copy comes
from `deck_content.py`.

Run:
    python scripts/deck/build_deck.py

The output path defaults to `docs/presentation/IFMP-Retail-deck-v1.pptx`.
"""

from __future__ import annotations

import io
import sys
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Cm, Pt
from lxml import etree

sys.path.insert(0, str(Path(__file__).resolve().parent))

from deck_content import FOOTER, SLIDES, STAMP  # noqa: E402

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

REPO_ROOT = Path(__file__).resolve().parents[2]
TEMPLATE = REPO_ROOT / "docs" / "presentation" / "company-template.pptx"
OUTPUT = REPO_ROOT / "docs" / "presentation" / "IFMP-Retail-deck-v1.pptx"

# --- Brand ------------------------------------------------------------------
# Taken from the template's own theme, which is the stock Office scheme:
# dk2 = 1F497D, accent1 = 4F81BD. Using them keeps the deck inside the
# template's palette instead of inventing a second one.
INK = RGBColor(0x1F, 0x49, 0x7D)
ACCENT = RGBColor(0x4F, 0x81, 0xBD)
BODY = RGBColor(0x33, 0x33, 0x33)
MUTED = RGBColor(0x7F, 0x8C, 0x9E)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
PALE = RGBColor(0xF2, 0xF6, 0xFA)
PALE_ALT = RGBColor(0xFF, 0xFF, 0xFF)
LINE = RGBColor(0xD6, 0xDE, 0xE8)

# The template's theme leaves the East Asian face empty, which falls back to
# 新細明體 on Chinese Windows. 微軟正黑體 ships with Windows and reads correctly
# in 繁體, so it is set explicitly on every run.
FONT_LATIN = "Calibri"
FONT_CJK = "微軟正黑體"

# --- Geometry ---------------------------------------------------------------
SLIDE_W = 33.867
SLIDE_H = 19.05
MARGIN_L = 1.27
MARGIN_R = 1.27
CONTENT_W = SLIDE_W - MARGIN_L - MARGIN_R
TITLE_TOP = 0.76
TITLE_W = SLIDE_W - MARGIN_L - 2.2
BODY_TOP = 4.34
BODY_BOTTOM = 17.20
BODY_H = BODY_BOTTOM - BODY_TOP
FOOTER_Y = 17.66
FOOTER_H = 1.01

# The template's own footer slots, reused at their template coordinates so the
# deck's furniture sits where the template intends it to.
SLOT_LEFT = (MARGIN_L, FOOTER_Y, 5.93, FOOTER_H)
SLOT_MID = (8.68, FOOTER_Y, 8.04, FOOTER_H)
SLOT_RIGHT = (18.20, FOOTER_Y, 5.93, FOOTER_H)


def cx(value: float) -> Cm:
    return Cm(value)


# --- Text helpers -----------------------------------------------------------
def set_typeface(run, size_pt: float, bold: bool = False) -> None:
    """Apply size, name and CJK face to a run, in schema order.

    python-pptx knows how to place `a:latin` but not `a:ea`/`a:cs`, so those are
    inserted directly after `a:latin`. PowerPoint rejects a run whose children
    are out of order, which is what produces a repair prompt on open.
    """
    run.font.size = Pt(size_pt)
    run.font.bold = bold
    rPr = run._r.get_or_add_rPr()
    latin = rPr.get_or_add_latin()
    latin.set("typeface", FONT_LATIN)
    for tag in ("a:ea", "a:cs"):
        for existing in rPr.findall(qn(tag)):
            rPr.remove(existing)
    ea = etree.Element(qn("a:ea"))
    ea.set("typeface", FONT_CJK)
    cs = etree.Element(qn("a:cs"))
    cs.set("typeface", FONT_CJK)
    # CT_TextCharacterProperties requires latin, then ea, then cs. Inserting ea
    # first and cs directly behind it is what keeps that order; inserting cs
    # straight after latin would leave cs before ea, which PowerPoint treats as
    # a malformed run.
    latin.addnext(ea)
    ea.addnext(cs)


def add_box(slide, left, top, width, height, wrap: bool = True):
    box = slide.shapes.add_textbox(cx(left), cx(top), cx(width), cx(height))
    tf = box.text_frame
    tf.word_wrap = wrap
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    return box, tf


def add_line(
    tf,
    text: str,
    size: float,
    color: RGBColor = BODY,
    bold: bool = False,
    *,
    first: bool = False,
    space_before: float = 0,
    space_after: float = 6,
    align=PP_ALIGN.LEFT,
    line_spacing: float = 1.18,
):
    para = tf.paragraphs[0] if first else tf.add_paragraph()
    para.alignment = align
    para.space_before = Pt(space_before)
    para.space_after = Pt(space_after)
    para.line_spacing = line_spacing
    run = para.add_run()
    run.text = text
    set_typeface(run, size, bold)
    run.font.color.rgb = color
    return para


def add_bullets(tf, items, size: float, color: RGBColor, *, first: bool, space_after: float = 10):
    for i, item in enumerate(items):
        add_line(
            tf,
            f"· {item}",
            size,
            color,
            first=(first and i == 0),
            space_after=space_after,
            line_spacing=1.25,
        )


# --- Image helpers ----------------------------------------------------------
def add_image_fit(slide, path: Path, left: float, top: float, max_w: float, max_h: float, align: str = "left"):
    """Place an image scaled to fit a box, keeping its aspect ratio."""
    from PIL import Image

    if not path.exists():
        raise FileNotFoundError(f"missing screenshot: {path}")
    with Image.open(path) as im:
        ratio = im.width / im.height
    if ratio >= max_w / max_h:
        width = max_w
        height = max_w / ratio
    else:
        height = max_h
        width = max_h * ratio
    if align == "center":
        left = left + (max_w - width) / 2
    elif align == "right":
        left = left + (max_w - width)
    return slide.shapes.add_picture(
        str(path), cx(left), cx(top), cx(width), cx(height)
    )


def picture_box(slide, path: Path, left: float, top: float, width: float):
    """Add a hairline-bordered image box so screenshots read as deliberate."""
    pic = add_image_fit(slide, path, left, top, width, 99)
    frame = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, cx(left), cx(top), pic.width, pic.height
    )
    frame.fill.background()
    frame.line.color.rgb = LINE
    frame.line.width = Pt(0.75)
    frame.shadow.inherit = False
    return pic


# --- Table helper ------------------------------------------------------------
def add_table(slide, headers, rows, col_widths, left, top, width) -> None:
    total = sum(col_widths)
    scaled = [w / total * width for w in col_widths]
    row_h = 1.05
    shape = slide.shapes.add_table(
        len(rows) + 1, len(headers), cx(left), cx(top), cx(width), cx(row_h * (len(rows) + 1))
    )
    table = shape.table
    # Strip the built-in banded style; the fills below are the whole treatment.
    tbl = table._tbl
    tblPr = tbl.tblPr
    tblPr.set("firstRow", "1")
    tblPr.set("bandRow", "0")
    for el in tblPr.findall(qn("a:tableStyleId")):
        tblPr.remove(el)

    for i, w in enumerate(scaled):
        table.columns[i].width = cx(w)
    for r in range(len(rows) + 1):
        table.rows[r].height = cx(row_h)

    def fill_cell(cell, text, *, head: bool, rowh: int):
        cell.margin_left = cx(0.35)
        cell.margin_right = cx(0.35)
        cell.margin_top = cx(0.12)
        cell.margin_bottom = cx(0.12)
        cell.vertical_anchor = MSO_ANCHOR.MIDDLE
        cell.fill.solid()
        if head:
            cell.fill.fore_color.rgb = INK
        else:
            cell.fill.fore_color.rgb = PALE if rowh % 2 == 0 else PALE_ALT
        tf = cell.text_frame
        tf.word_wrap = True
        add_line(
            tf,
            text,
            15,
            WHITE if head else BODY,
            bold=head,
            first=True,
            space_after=0,
            line_spacing=1.15,
        )

    for c, header in enumerate(headers):
        fill_cell(table.cell(0, c), header, head=True, rowh=0)
    for r, row in enumerate(rows, start=1):
        for c, value in enumerate(row):
            fill_cell(table.cell(r, c), value, head=False, rowh=r)


# --- Furniture --------------------------------------------------------------
def add_footer(slide, page: int, *, sample: bool) -> None:
    left, tf = add_box(slide, SLOT_LEFT[0], SLOT_LEFT[1], SLOT_LEFT[2], SLOT_LEFT[3])
    left.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
    if sample:
        add_line(tf, STAMP, 11, MUTED, first=True, space_after=0)

    mid, tf_mid = add_box(slide, SLOT_MID[0], SLOT_MID[1], SLOT_MID[2], SLOT_MID[3])
    tf_mid.vertical_anchor = MSO_ANCHOR.MIDDLE
    add_line(tf_mid, FOOTER, 11, MUTED, first=True, space_after=0, align=PP_ALIGN.CENTER)

    right, tf_right = add_box(slide, SLOT_RIGHT[0], SLOT_RIGHT[1], SLOT_RIGHT[2], SLOT_RIGHT[3])
    tf_right.vertical_anchor = MSO_ANCHOR.MIDDLE
    add_line(
        tf_right, str(page), 11, MUTED, first=True, space_after=0, align=PP_ALIGN.RIGHT
    )


def set_title(slide, text: str) -> None:
    title = slide.shapes.title
    title.left, title.top = cx(MARGIN_L), cx(TITLE_TOP)
    title.width, title.height = cx(TITLE_W), cx(3.17)
    tf = title.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    para = tf.paragraphs[0]
    para.alignment = PP_ALIGN.LEFT
    run = para.add_run()
    run.text = text
    set_typeface(run, 30, True)
    run.font.color.rgb = INK


def add_closing_line(slide, text: str, top: float, *, width: float = CONTENT_W, left: float = MARGIN_L):
    _, tf = add_box(slide, left, top, width, 0.9)
    add_line(tf, text, 15, INK, bold=True, first=True, space_after=0)


# --- Renderers --------------------------------------------------------------
def render_cover(slide, spec, page: int) -> None:
    slide.shapes.title.text_frame.paragraphs[0].text = spec["title"]
    title_run = slide.shapes.title.text_frame.paragraphs[0].runs[0]
    set_typeface(title_run, 44, True)
    title_run.font.color.rgb = INK

    sub = slide.placeholders[1]
    tf = sub.text_frame
    tf.word_wrap = True
    add_line(tf, spec["subtitle"], 26, INK, bold=True, first=True, space_after=18)
    for line in spec["lines"]:
        add_line(tf, line, 15, MUTED, space_after=4)


def render_points(slide, spec, page: int) -> None:
    items = spec["points"]
    gap = 0.9
    col_w = (CONTENT_W - gap * (len(items) - 1)) / len(items)
    for i, (head, text) in enumerate(items):
        left = MARGIN_L + i * (col_w + gap)
        card = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE, cx(left), cx(BODY_TOP), cx(col_w), cx(11.4)
        )
        card.fill.solid()
        card.fill.fore_color.rgb = PALE
        card.line.color.rgb = LINE
        card.line.width = Pt(0.75)
        card.shadow.inherit = False
        card.adjustments[0] = 0.06

        _, tf = add_box(slide, left + 0.7, BODY_TOP + 0.9, col_w - 1.4, 9.6)
        add_line(tf, head, 20, INK, bold=True, first=True, space_after=14)
        add_line(tf, text, 15, BODY, space_after=0, line_spacing=1.35)


def render_table(slide, spec, page: int) -> None:
    add_table(
        slide,
        spec["headers"],
        spec["rows"],
        spec["col_widths"],
        MARGIN_L,
        BODY_TOP + 0.5,
        CONTENT_W,
    )
    if spec.get("closing"):
        rows = len(spec["rows"]) + 1
        add_closing_line(slide, spec["closing"], BODY_TOP + 0.5 + rows * 1.05 + 0.55)


def render_statement(slide, spec, page: int) -> None:
    band = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, cx(MARGIN_L), cx(BODY_TOP + 1.2), cx(CONTENT_W), cx(7.6)
    )
    band.fill.solid()
    band.fill.fore_color.rgb = PALE
    band.line.color.rgb = LINE
    band.line.width = Pt(0.75)
    band.shadow.inherit = False

    _, tf = add_box(slide, MARGIN_L + 1.3, BODY_TOP + 2.1, CONTENT_W - 2.6, 5.9)
    for i, line in enumerate(spec["lines"]):
        add_line(
            tf,
            line if line else " ",
            19,
            INK if i == 0 else BODY,
            bold=(i == 0),
            first=(i == 0),
            space_after=8,
            line_spacing=1.35,
        )
    add_closing_line(slide, spec["highlight"], BODY_TOP + 9.9)


def render_flow(slide, spec, page: int) -> None:
    steps = spec["steps"]
    box_h = 2.3
    gap = 0.52
    top = BODY_TOP + 0.35
    for i, (head, text) in enumerate(steps):
        y = top + i * (box_h + gap)
        box = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE, cx(MARGIN_L + 2.4), cx(y), cx(CONTENT_W - 2.4), cx(box_h)
        )
        box.fill.solid()
        box.fill.fore_color.rgb = PALE if i % 2 == 0 else WHITE
        box.line.color.rgb = ACCENT
        box.line.width = Pt(1)
        box.shadow.inherit = False
        box.adjustments[0] = 0.12

        _, tf = add_box(slide, MARGIN_L + 3.1, y + 0.28, CONTENT_W - 3.8, box_h - 0.5)
        add_line(tf, head, 17, INK, bold=True, first=True, space_after=2)
        add_line(tf, text, 14, BODY, space_after=0)

        if i < len(steps) - 1:
            _, atf = add_box(slide, MARGIN_L + 2.4, y + box_h, CONTENT_W - 2.4, gap)
            add_line(atf, "▼", 12, ACCENT, first=True, space_after=0, align=PP_ALIGN.CENTER)

    add_closing_line(slide, spec["closing"], top + len(steps) * (box_h + gap) + 0.15)


def render_strip(slide, spec, page: int) -> None:
    items = spec["items"]
    per_row = 3
    gap = 1.0
    # The grid is capped so two rows of thumbnails plus their captions plus the
    # closing line all finish above the footer band. At full column width the
    # second row of captions collides with the footer.
    img_w = 8.9
    img_h = img_w * 9 / 16
    caption_h = 0.75
    row_spacing = img_h + caption_h + 0.35
    grid_w = per_row * img_w + (per_row - 1) * gap
    grid_left = MARGIN_L + (CONTENT_W - grid_w) / 2
    top = BODY_TOP + 0.1
    for i, (path, label) in enumerate(items):
        col = i % per_row
        row = i // per_row
        left = grid_left + col * (img_w + gap)
        y = top + row * row_spacing
        picture_box(slide, REPO_ROOT / path, left, y, img_w)
        _, tf = add_box(slide, left, y + img_h + 0.12, img_w, caption_h)
        add_line(tf, label, 14, INK, bold=True, first=True, space_after=0, align=PP_ALIGN.CENTER)
    rows = (len(items) + per_row - 1) // per_row
    add_closing_line(slide, spec["closing"], top + (rows - 1) * row_spacing + img_h + caption_h + 0.25)


def render_image_right(slide, spec, page: int) -> None:
    img_w = spec.get("image_width", 21.5)
    picture_box(slide, REPO_ROOT / spec["image"], MARGIN_L, BODY_TOP + 0.15, img_w)

    text_left = MARGIN_L + img_w + 0.9
    _, tf = add_box(slide, text_left, BODY_TOP + 0.6, SLIDE_W - MARGIN_R - text_left, 11.0)
    add_line(tf, spec["lead"], 20, INK, bold=True, first=True, space_after=16, line_spacing=1.3)
    add_bullets(tf, spec["bullets"], 15, BODY, first=False, space_after=14)


def render_image_wide(slide, spec, page: int) -> None:
    from PIL import Image

    path = REPO_ROOT / spec["image"]
    with Image.open(path) as im:
        ratio = im.width / im.height
    width = CONTENT_W
    height = width / ratio

    # Centre the lead/image/caption block in the content area; a very wide
    # screenshot otherwise leaves a third of the slide empty underneath.
    lead_h = 1.4
    caption_h = 1.6
    block_h = lead_h + 0.35 + height + 0.5 + caption_h
    top = BODY_TOP + max(0.1, (BODY_H - block_h) / 2)

    _, tf = add_box(slide, MARGIN_L, top, CONTENT_W, lead_h)
    add_line(tf, spec["lead"], 20, INK, bold=True, first=True, space_after=0)

    image_top = top + lead_h + 0.35
    left = MARGIN_L + (CONTENT_W - width) / 2
    add_image_fit(slide, path, left, image_top, width, height, align="center")
    frame = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, cx(left), cx(image_top), cx(width), cx(height)
    )
    frame.fill.background()
    frame.line.color.rgb = LINE
    frame.line.width = Pt(0.75)
    frame.shadow.inherit = False

    _, ctf = add_box(slide, MARGIN_L, image_top + height + 0.5, CONTENT_W, caption_h)
    add_line(ctf, spec["caption"], 15, BODY, first=True, space_after=0, line_spacing=1.3)


def render_image_pair(slide, spec, page: int) -> None:
    gap = 1.0
    col_w = (CONTENT_W - gap) / 2
    for i, (path, label, desc) in enumerate(spec["pairs"]):
        left = MARGIN_L + i * (col_w + gap)
        _, tf = add_box(slide, left, BODY_TOP + 0.05, col_w, 0.8)
        add_line(tf, label, 19, INK, bold=True, first=True, space_after=0)
        picture_box(slide, REPO_ROOT / path, left, BODY_TOP + 1.0, col_w)
        _, dtf = add_box(slide, left, BODY_TOP + 1.0 + col_w * 9 / 16 + 0.35, col_w, 2.4)
        add_line(dtf, desc, 15, BODY, first=True, space_after=0, line_spacing=1.3)


def render_roster(slide, spec, page: int) -> None:
    _, tf = add_box(slide, MARGIN_L, BODY_TOP + 0.05, CONTENT_W, 0.9)
    add_line(tf, spec["lead"], 17, INK, bold=True, first=True, space_after=0)

    # Capped so the closing line clears the footer band; a wider main image
    # pushes that line onto the footer.
    main_w = 18.6
    main_top = BODY_TOP + 1.1
    picture_box(slide, REPO_ROOT / spec["main"], MARGIN_L, main_top, main_w)

    right_left = MARGIN_L + main_w + 0.9
    right_w = SLIDE_W - MARGIN_R - right_left
    _, gtf = add_box(slide, right_left, BODY_TOP + 1.1, right_w, 2.6)
    add_line(gtf, spec["governance"], 14, BODY, first=True, space_after=0, line_spacing=1.35)

    thumb_w = (right_w - 0.6) / 2
    thumb_top = BODY_TOP + 4.2
    for i, (path, label) in enumerate(spec["thumbs"]):
        left = right_left + i * (thumb_w + 0.6)
        picture_box(slide, REPO_ROOT / path, left, thumb_top, thumb_w)
        _, ltf = add_box(slide, left, thumb_top + thumb_w * 9 / 16 + 0.12, thumb_w, 0.7)
        add_line(ltf, label, 13, INK, bold=True, first=True, space_after=0, align=PP_ALIGN.CENTER)

    add_closing_line(slide, spec["closing"], main_top + main_w * 9 / 16 + 0.45)


def render_roadmap(slide, spec, page: int) -> None:
    gap = 0.8
    col_w = (CONTENT_W - gap * 2) / 3
    columns = [
        (spec["live_title"], spec["live"], INK, PALE),
        (spec["next_title"], spec["next"], ACCENT, WHITE),
        (spec["later_title"], spec["later"], MUTED, WHITE),
    ]
    for i, (head, items, color, fill) in enumerate(columns):
        left = MARGIN_L + i * (col_w + gap)
        card = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE, cx(left), cx(BODY_TOP + 0.2), cx(col_w), cx(11.2)
        )
        card.fill.solid()
        card.fill.fore_color.rgb = fill
        card.line.color.rgb = color
        card.line.width = Pt(1)
        card.shadow.inherit = False
        card.adjustments[0] = 0.06

        _, tf = add_box(slide, left + 0.7, BODY_TOP + 1.0, col_w - 1.4, 10.3)
        add_line(tf, head, 19, color, bold=True, first=True, space_after=14)
        for item in items:
            add_line(tf, f"· {item}", 14, BODY, space_after=9, line_spacing=1.28)

    add_closing_line(slide, spec["closing"], BODY_TOP + 11.5)


def render_loop(slide, spec, page: int) -> None:
    """Three-step operational loop plus the efficiency work that ships with it.

    This is the slide that answers the deck's own second-page question about
    seeing not being enough. Everything on it is unbuilt, so it carries no
    screenshot and says so in the closing line.
    """
    steps = spec["loop"]
    gap = 1.0
    card_w = (CONTENT_W - gap * (len(steps) - 1)) / len(steps)
    card_h = 4.0
    top = BODY_TOP + 0.15
    for i, (head, text) in enumerate(steps):
        left = MARGIN_L + i * (card_w + gap)
        card = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE, cx(left), cx(top), cx(card_w), cx(card_h)
        )
        card.fill.solid()
        card.fill.fore_color.rgb = PALE
        card.line.color.rgb = ACCENT
        card.line.width = Pt(1)
        card.shadow.inherit = False
        card.adjustments[0] = 0.08

        _, tf = add_box(slide, left + 0.7, top + 0.5, card_w - 1.4, card_h - 1.0)
        add_line(tf, head, 18, INK, bold=True, first=True, space_after=10)
        add_line(tf, text, 14, BODY, space_after=0, line_spacing=1.3)

        if i < len(steps) - 1:
            _, atf = add_box(slide, left + card_w, top, gap, card_h)
            atf.vertical_anchor = MSO_ANCHOR.MIDDLE
            add_line(atf, "▶", 13, ACCENT, first=True, space_after=0, align=PP_ALIGN.CENTER)

    _, ntf = add_box(slide, MARGIN_L, top + card_h + 0.2, CONTENT_W, 0.8)
    add_line(ntf, spec["loop_note"], 15, INK, first=True, space_after=0)

    _, etf = add_box(slide, MARGIN_L, top + card_h + 1.15, CONTENT_W, 0.8)
    add_line(etf, spec["efficiency_title"], 19, INK, bold=True, first=True, space_after=0)

    items = spec["efficiency"]
    row_h = 1.0
    row_gap = 0.15
    list_top = top + card_h + 2.05
    label_w = 7.0
    for i, (head, text) in enumerate(items):
        y = list_top + i * (row_h + row_gap)
        bar = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE, cx(MARGIN_L), cx(y), cx(CONTENT_W), cx(row_h)
        )
        bar.fill.solid()
        bar.fill.fore_color.rgb = PALE if i % 2 == 0 else WHITE
        bar.line.color.rgb = LINE
        bar.line.width = Pt(0.75)
        bar.shadow.inherit = False
        bar.adjustments[0] = 0.10

        _, htf = add_box(slide, MARGIN_L + 0.8, y + 0.15, label_w, row_h - 0.3)
        htf.vertical_anchor = MSO_ANCHOR.MIDDLE
        add_line(htf, head, 16, INK, bold=True, first=True, space_after=0)

        _, ttf = add_box(
            slide, MARGIN_L + label_w + 1.6, y + 0.15, CONTENT_W - label_w - 2.4, row_h - 0.3
        )
        ttf.vertical_anchor = MSO_ANCHOR.MIDDLE
        add_line(ttf, text, 14, BODY, first=True, space_after=0, line_spacing=1.25)

    bottom = list_top + len(items) * row_h + (len(items) - 1) * row_gap
    add_closing_line(slide, spec["closing"], bottom + 0.3)


def render_services(slide, spec, page: int) -> None:
    gap = 0.45
    row_h = (BODY_H - 0.3 - gap * (len(spec["services"]) - 1)) / len(spec["services"])
    for i, (head, text) in enumerate(spec["services"]):
        y = BODY_TOP + 0.15 + i * (row_h + gap)
        bar = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE, cx(MARGIN_L), cx(y), cx(CONTENT_W), cx(row_h)
        )
        bar.fill.solid()
        bar.fill.fore_color.rgb = PALE if i % 2 == 0 else WHITE
        bar.line.color.rgb = LINE
        bar.line.width = Pt(0.75)
        bar.shadow.inherit = False
        bar.adjustments[0] = 0.10

        _, htf = add_box(slide, MARGIN_L + 0.8, y + 0.22, 7.6, row_h - 0.4)
        htf.vertical_anchor = MSO_ANCHOR.MIDDLE
        add_line(htf, head, 17, INK, bold=True, first=True, space_after=0)

        _, ttf = add_box(slide, MARGIN_L + 8.6, y + 0.22, CONTENT_W - 9.4, row_h - 0.4)
        ttf.vertical_anchor = MSO_ANCHOR.MIDDLE
        add_line(ttf, text, 15, BODY, first=True, space_after=0, line_spacing=1.25)


def render_steps(slide, spec, page: int) -> None:
    gap = 0.55
    row_h = 2.15
    top = BODY_TOP + 0.25
    for i, (head, text) in enumerate(spec["steps"]):
        y = top + i * (row_h + gap)
        _, htf = add_box(slide, MARGIN_L, y, 12.0, row_h)
        htf.vertical_anchor = MSO_ANCHOR.MIDDLE
        add_line(htf, head, 18, INK, bold=True, first=True, space_after=0)

        _, ttf = add_box(slide, MARGIN_L + 12.6, y, CONTENT_W - 12.6, row_h)
        ttf.vertical_anchor = MSO_ANCHOR.MIDDLE
        add_line(ttf, text, 15, BODY, first=True, space_after=0, line_spacing=1.3)

        if i < len(spec["steps"]) - 1:
            rule = slide.shapes.add_shape(
                MSO_SHAPE.RECTANGLE,
                cx(MARGIN_L),
                cx(y + row_h + gap / 2 - 0.01),
                cx(CONTENT_W),
                cx(0.02),
            )
            rule.fill.solid()
            rule.fill.fore_color.rgb = LINE
            rule.line.fill.background()
            rule.shadow.inherit = False

    add_closing_line(
        slide,
        spec["closing"],
        top + len(spec["steps"]) * (row_h + gap) + 0.1,
    )


RENDERERS = {
    "cover": render_cover,
    "points": render_points,
    "table": render_table,
    "statement": render_statement,
    "flow": render_flow,
    "strip": render_strip,
    "image_right": render_image_right,
    "image_wide": render_image_wide,
    "image_pair": render_image_pair,
    "roster": render_roster,
    "roadmap": render_roadmap,
    "loop": render_loop,
    "services": render_services,
    "steps": render_steps,
}


def find_layout(prs: Presentation, name: str):
    for layout in prs.slide_layouts:
        if layout.name == name:
            return layout
    raise KeyError(f"layout not found: {name}")


def drop_existing_slides(prs: Presentation) -> None:
    """Remove the template's own placeholder slides, keeping the layouts."""
    xml_slides = prs.slides._sldIdLst
    for sld in list(xml_slides):
        rId = sld.get(qn("r:id"))
        prs.part.drop_rel(rId)
        xml_slides.remove(sld)


def normalize_package(path: Path) -> None:
    """Rewrite the .pptx zip with fixed entry timestamps.

    PowerPoint does not care, but a zip records the wall-clock time of every
    entry, so two builds of identical content produce different bytes. Fixing
    the timestamps makes a rebuild byte-identical, which keeps the deck from
    showing up as a modified file every time the generator runs.
    """
    import zipfile

    fixed = (1980, 1, 1, 0, 0, 0)
    with zipfile.ZipFile(path) as src:
        entries = [(i, src.read(i.filename)) for i in src.infolist()]

    temp = path.with_suffix(".tmp")
    with zipfile.ZipFile(temp, "w", zipfile.ZIP_DEFLATED) as out:
        for info, data in entries:
            clone = zipfile.ZipInfo(info.filename, date_time=fixed)
            clone.compress_type = info.compress_type
            clone.external_attr = info.external_attr
            out.writestr(clone, data)
    temp.replace(path)


def main() -> int:
    if not TEMPLATE.exists():
        print(f"missing template: {TEMPLATE}")
        return 1

    prs = Presentation(str(TEMPLATE))
    drop_existing_slides(prs)

    title_layout = find_layout(prs, "Title Slide")
    body_layout = find_layout(prs, "Title Only")

    for index, spec in enumerate(SLIDES, start=1):
        kind = spec["kind"]
        layout = title_layout if kind == "cover" else body_layout
        slide = prs.slides.add_slide(layout)

        if kind != "cover":
            set_title(slide, spec["title"])

        RENDERERS[kind](slide, spec, index)

        # Product screenshots only appear on some slides; the sample-data stamp
        # belongs on exactly those.
        uses_shot = kind in {
            "strip",
            "image_right",
            "image_wide",
            "image_pair",
            "roster",
        }
        if kind != "cover":
            add_footer(slide, index, sample=uses_shot)

        slide.notes_slide.notes_text_frame.text = spec["notes"]

    prs.save(str(OUTPUT))
    normalize_package(OUTPUT)
    print(f"wrote {OUTPUT}  ({len(SLIDES)} slides)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
