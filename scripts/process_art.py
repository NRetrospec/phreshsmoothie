"""Process generated art: copy backgrounds/comics, chroma-key magenta sheets,
slice enemy + pickup frames into individual PNGs used by the game.
"""
import os
import sys
from collections import Counter

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(os.environ["LOCALAPPDATA"], "hermes", "cache", "images")

SRC = {
    "bg_sky":    "openai_gpt-image-2-low_20260925_204255_79a9280a.png",
    "bg_city":   "openai_gpt-image-2-low_20260925_204311_f2e0126b.png",
    "bg_palms":  "openai_gpt-image-2-low_20260925_204332_a1bf7c5e.png",
    "tiles":     "openai_gpt-image-2-low_20260925_204346_0807f6a0.png",
    "banana":    "openai_gpt-image-2-low_20260925_204406_e9dddf28.png",
    "raisin":    "openai_gpt-image-2-low_20260925_204416_5ca1e87f.png",
    "melon":     "openai_gpt-image-2-low_20260925_204435_c8be8126.png",
    "pickups":   "openai_gpt-image-2-low_20260925_204446_070af86d.png",
    "comic_1":   "openai_gpt-image-2-low_20260925_204511_30d9b170.png",
    "comic_2":   "openai_gpt-image-2-low_20260925_204525_29913531.png",
    "comic_3":   "openai_gpt-image-2-low_20260925_204552_d47ada1c.png",
    "comic_4":   "openai_gpt-image-2-low_20260925_204610_e660ca1f.png",
    "comic_5":   "openai_gpt-image-2-low_20260925_204635_dec24fcf.png",
    "comic_6":   "openai_gpt-image-2-low_20260925_204649_bf27f33e.png",
}


def key_magenta(im, thresh=120):
    """Remove magenta bg -> RGBA transparent, 2-pass defringe."""
    arr = np.array(im.convert("RGBA")).astype(np.int16)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    # magenta: high R, low G, high B
    mag = (r - g) + (b - g)
    mask = mag > thresh
    arr[..., 3] = np.where(mask, 0, 255)
    # defringe: kill magenta tint on edge pixels
    edge = (~mask) & (mag > 40)
    arr[..., 0] = np.where(edge, np.minimum(r, (r + g) // 2 + 20), arr[..., 0])
    arr[..., 2] = np.where(edge, np.minimum(b, (b + g) // 2 + 20), arr[..., 2])
    return Image.fromarray(arr.astype(np.uint8))


def slice_row(im, n_expected=None, min_gap=10, min_size=15):
    """Slice a keyed RGBA image into column clusters of opaque pixels."""
    a = np.array(im)[..., 3] > 10
    col_has = a.any(axis=0)
    out = []
    start, gap = None, 0
    for i, f in enumerate(col_has):
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
                    start, gap = None, 0
    if start is not None:
        out.append((start, len(col_has)))
    cells = []
    for x0, x1 in out:
        sub = np.array(im)[:, x0:x1]
        ys = np.where(sub[..., 3] > 10)[0]
        if len(ys) == 0:
            continue
        cells.append(im.crop((x0, ys.min(), x1, ys.max() + 1)))
    if n_expected and len(cells) != n_expected:
        print(f"  WARNING: expected {n_expected} cells, got {len(cells)}")
    return cells


def save_scaled(im, path, target_h):
    s = target_h / im.height
    im = im.resize((max(1, round(im.width * s)), target_h), Image.NEAREST)
    im.save(path)


def main():
    for d in ["assets/level1", "assets/enemies", "assets/comic", "assets/pickups"]:
        os.makedirs(os.path.join(ROOT, d), exist_ok=True)

    def src(k):
        return Image.open(os.path.join(CACHE, SRC[k]))

    # backgrounds: sky as-is; city/palms chroma-keyed
    sky = src("bg_sky").convert("RGB")
    sky.thumbnail((1536, 1024))
    sky.save(os.path.join(ROOT, "assets/level1/bg_sky.png"))

    for k in ["bg_city", "bg_palms"]:
        keyed = key_magenta(src(k))
        keyed.save(os.path.join(ROOT, f"assets/level1/{k}.png"))
        print(k, "keyed")

    # tiles: center-crop square, downscale to 96
    t = src("tiles").convert("RGB")
    side = min(t.size)
    t = t.crop(((t.width - side) // 2, (t.height - side) // 2,
                (t.width + side) // 2, (t.height + side) // 2))
    t = t.resize((96, 96), Image.NEAREST)
    t.save(os.path.join(ROOT, "assets/level1/tiles.png"))

    # banana: 4 run frames -> h 62*2 (game draws by height; keep 2x for quality)
    print("banana:")
    cells = slice_row(key_magenta(src("banana")), 4)
    for i, c in enumerate(cells[:4]):
        save_scaled(c, os.path.join(ROOT, f"assets/enemies/banana_run_{i}.png"), 124)

    print("raisin:")
    cells = slice_row(key_magenta(src("raisin")), 3)
    names = ["raisin_0", "raisin_1", "raisin_shoot"]
    for c, n in zip(cells, names):
        save_scaled(c, os.path.join(ROOT, f"assets/enemies/{n}.png"), 88)

    print("melon:")
    cells = slice_row(key_magenta(src("melon")), 2)
    for i, c in enumerate(cells[:2]):
        save_scaled(c, os.path.join(ROOT, f"assets/enemies/melon_{i}.png"), 152)

    print("pickups:")
    cells = slice_row(key_magenta(src("pickups")), 5)
    names = ["fruit", "protein", "sneakers", "sunscreen", "icecube"]
    for c, n in zip(cells, names):
        save_scaled(c, os.path.join(ROOT, f"assets/pickups/{n}.png"), 56)

    # comics: downscale to 1152x768 to keep repo light
    for i in range(1, 7):
        im = src(f"comic_{i}").convert("RGB")
        im.thumbnail((1152, 768))
        im.save(os.path.join(ROOT, f"assets/comic/panel_{i}.png"))
    print("comics done")


if __name__ == "__main__":
    main()
