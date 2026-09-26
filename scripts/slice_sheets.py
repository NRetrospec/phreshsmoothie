"""Slice the two character sprite sheets into individual frames.

Auto-detects sprite cells via background keying + connected component
clustering into rows/columns. Writes assets/sprites/player/*.png plus a
frames.json manifest with per-frame size and feet anchor.
"""
import json
import os
import sys
from collections import Counter

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "Public")
OUT = os.path.join(ROOT, "assets", "sprites", "player")
os.makedirs(OUT, exist_ok=True)

SHEETS = [
    ("idle, walking,running, jumpiing sprite sheet.png", None),
    ("landing, dashing,shooting, rolling sprite sheet.png", None),
]


def bg_color(arr):
    # sample the 4 corners' 10x10 patches, take the most common color
    h, w = arr.shape[:2]
    patches = [arr[:10, :10], arr[:10, w - 10:], arr[h - 10:, :10], arr[h - 10:, w - 10:]]
    pix = np.concatenate([p.reshape(-1, 3) for p in patches])
    c = Counter(map(tuple, pix))
    return np.array(c.most_common(1)[0][0], dtype=np.int16)


def analyze(fname):
    im = Image.open(os.path.join(PUB, fname)).convert("RGB")
    arr = np.array(im, dtype=np.int16)
    bg = bg_color(arr)
    dist = np.abs(arr - bg).sum(axis=2)
    mask = dist > 40  # foreground
    # row bands: rows of image containing any foreground
    row_has = mask.any(axis=1)
    col_has = mask.any(axis=0)

    def bands(flags, min_gap=8, min_size=20):
        out = []
        start = None
        gap = 0
        for i, f in enumerate(flags):
            if f:
                if start is None:
                    start = i
                gap = 0
            else:
                if start is not None:
                    gap += 1
                    if gap >= min_gap:
                        end = i - gap
                        if end - start >= min_size:
                            out.append((start, end + 1))
                        start = None
                        gap = 0
        if start is not None:
            out.append((start, len(flags)))
        return out

    row_bands = bands(row_has)
    print(f"{fname}: bg={tuple(bg)} rows={len(row_bands)} {row_bands}")
    result = []
    for r, (y0, y1) in enumerate(row_bands):
        strip = mask[y0:y1]
        cols = bands(strip.any(axis=0), min_gap=12, min_size=20)
        print(f"  row {r}: {len(cols)} frames, widths={[b - a for a, b in cols]}")
        result.append(((y0, y1), cols))
    return im, mask, result


def main():
    manifest = {}
    for fname, _ in SHEETS:
        im, mask, rows = analyze(fname)
        arr = np.array(im.convert("RGBA"))
        # make background transparent
        bgc = bg_color(np.array(im, dtype=np.int16))
        dist = np.abs(np.array(im, dtype=np.int16) - bgc).sum(axis=2)
        arr[..., 3] = np.where(dist > 40, 255, 0)
        key = "sheet1" if "idle" in fname else "sheet2"
        manifest[key] = []
        for r, ((y0, y1), cols) in enumerate(rows):
            for c, (x0, x1) in enumerate(cols):
                cell = arr[y0:y1, x0:x1]
                # tight bbox
                a = cell[..., 3] > 0
                ys, xs = np.where(a)
                if len(ys) == 0:
                    continue
                cell = cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
                name = f"{key}_r{r}_c{c}"
                Image.fromarray(cell).save(os.path.join(OUT, name + ".png"))
                h, w = cell.shape[:2]
                # feet anchor: centroid x of bottom 12 rows
                bottom = cell[max(0, h - 12):, :, 3] > 0
                if bottom.any():
                    ax = float(np.where(bottom.any(axis=0))[0].mean())
                else:
                    ax = w / 2
                manifest[key].append({"name": name, "row": r, "col": c, "w": w, "h": h, "ax": round(ax, 1)})
    with open(os.path.join(OUT, "frames_raw.json"), "w") as f:
        json.dump(manifest, f, indent=1)
    print("wrote", len(manifest.get("sheet1", [])) + len(manifest.get("sheet2", [])), "frames")


if __name__ == "__main__":
    main()
