"""Build contact sheets from rendered slide PNGs, for review.

Reading a grid of six slides costs far less context than reading six full
screenshots, which matters when checking a whole deck for overflow.

Usage:
    python scripts/deck/make_contact_sheet.py <render-dir> <glob> <out.png> [per_sheet]
"""

from __future__ import annotations

import io
import sys
from pathlib import Path

from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

CELL_W = 620
CELL_H = 349
COLS = 2
ROWS = 3
PAD = 8
BG = (28, 32, 38)


def main(render_dir: str, pattern: str, out_prefix: str, per_sheet: int = 6) -> int:
    files = sorted(Path(render_dir).glob(pattern))
    if not files:
        print(f"no files matched {pattern} in {render_dir}")
        return 1

    per_sheet = max(1, per_sheet)
    sheets = [files[i : i + per_sheet] for i in range(0, len(files), per_sheet)]

    for index, group in enumerate(sheets, start=1):
        cols = COLS if len(group) > 3 else 1
        rows = (len(group) + cols - 1) // cols
        sheet = Image.new(
            "RGB",
            (cols * CELL_W + (cols + 1) * PAD, rows * CELL_H + (rows + 1) * PAD),
            BG,
        )
        for i, path in enumerate(group):
            with Image.open(path) as im:
                thumb = im.convert("RGB").resize((CELL_W, CELL_H), Image.LANCZOS)
            x = PAD + (i % cols) * (CELL_W + PAD)
            y = PAD + (i // cols) * (CELL_H + PAD)
            sheet.paste(thumb, (x, y))
        target = f"{out_prefix}-{index}.png"
        sheet.save(target)
        print(f"{target}  <- {', '.join(p.name for p in group)}")

    return 0


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(__doc__)
        raise SystemExit(2)
    extra = int(sys.argv[4]) if len(sys.argv) > 4 else 6
    raise SystemExit(main(sys.argv[1], sys.argv[2], sys.argv[3], extra))
