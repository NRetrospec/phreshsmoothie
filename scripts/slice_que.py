"""Slice Que's two sprite sheets, scale to game resolution, write
assets/sprites/que/*.png + frames.json (same manifest shape as the Phresh one).

Reuses the sheet analyzer from slice_sheets.py.
"""
import json
import os

import numpy as np
from PIL import Image

import slice_sheets as ss

ROOT = ss.ROOT
OUT = os.path.join(ROOT, "assets", "sprites", "que")
os.makedirs(OUT, exist_ok=True)
TARGET_H = 96

SHEETS = {
    "sheet1": "que,idle, walking,running, jumpiing sprite sheet.png",
    "sheet2": "que,ducking,sprint,shooting,rolling.png",
}
# anim: (sheet, row, max frames | (start, end) slice)
ANIMS = {
    "idle": ("sheet1", 0, 4), "walk": ("sheet1", 1, 6), "run": ("sheet1", 2, 6),
    "jump": ("sheet1", 3, 4),
    "land": ("sheet2", 0, (4, 6)), "dash": ("sheet2", 1, 6),
    "shoot": ("sheet2", 2, 5), "roll": ("sheet2", 3, 5),
}


def main():
    cells = {}  # (sheet,row) -> list of (arr_cell, ax)
    for key, fname in SHEETS.items():
        im, mask, rows = ss.analyze(fname)
        rgb = np.array(im, dtype=np.int16)
        bgc = ss.bg_color(rgb)
        dist = np.abs(rgb - bgc).sum(axis=2)
        arr = np.array(im.convert("RGBA"))
        arr[..., 3] = np.where(dist > 40, 255, 0)
        for r, ((y0, y1), cols) in enumerate(rows):
            lst = []
            for (x0, x1) in cols:
                cell = arr[y0:y1, x0:x1]
                ys, xs = np.where(cell[..., 3] > 0)
                if len(ys) == 0:
                    continue
                cell = cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
                h, w = cell.shape[:2]
                bottom = cell[max(0, h - 12):, :, 3] > 0
                ax = float(np.where(bottom.any(axis=0))[0].mean()) if bottom.any() else w / 2
                lst.append((cell, ax))
            cells[(key, r)] = lst

    idle_h = max(c.shape[0] for c, _ in cells[("sheet1", 0)])
    s = TARGET_H / idle_h
    print(f"idle native h={idle_h}, scale={s:.4f}")
    frames, anims = {}, {}
    for anim, (sheet, row, n) in ANIMS.items():
        names = []
        sel = cells[(sheet, row)][n[0]:n[1]] if isinstance(n, tuple) else cells[(sheet, row)][:n]
        for i, (cell, ax) in enumerate(sel):
            h, w = cell.shape[:2]
            nw, nh = max(1, round(w * s)), max(1, round(h * s))
            img = Image.fromarray(cell).resize((nw, nh), Image.NEAREST)
            name = f"{anim}_{i}"
            img.save(os.path.join(OUT, name + ".png"))
            frames[name] = {"w": nw, "h": nh, "ax": round(ax * s, 1), "ay": nh}
            names.append(name)
        anims[anim] = names
        print(anim, len(names), "frames")
    with open(os.path.join(OUT, "frames.json"), "w") as fp:
        json.dump({"frames": frames, "anims": anims}, fp, indent=1)


if __name__ == "__main__":
    main()
