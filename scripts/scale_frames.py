"""Scale sliced frames to game resolution and write assets/sprites/player/frames.json.

Uses a single uniform scale factor (idle height -> TARGET_H) so relative
frame sizes stay correct. NEAREST to keep the pixel-art look.
"""
import json
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, "assets", "sprites", "player")
TARGET_H = 96  # idle frame height in game pixels

ANIMS = {
    # key: (sheet, row)
    "idle": ("sheet1", 0),
    "walk": ("sheet1", 1),
    "run": ("sheet1", 2),
    "jump": ("sheet1", 3),
    "land": ("sheet2", 0),
    "dash": ("sheet2", 1),
    "shoot": ("sheet2", 2),
    "roll": ("sheet2", 3),
}


def main():
    raw = json.load(open(os.path.join(DIR, "frames_raw.json")))
    # reference: tallest idle frame
    idle_h = max(f["h"] for f in raw["sheet1"] if f["row"] == 0)
    s = TARGET_H / idle_h
    print(f"idle native h={idle_h}, scale={s:.4f}")

    frames = {}
    anims = {}
    for anim, (sheet, row) in ANIMS.items():
        cells = sorted((f for f in raw[sheet] if f["row"] == row), key=lambda f: f["col"])
        names = []
        for i, f in enumerate(cells):
            im = Image.open(os.path.join(DIR, f["name"] + ".png"))
            w = max(1, round(f["w"] * s))
            h = max(1, round(f["h"] * s))
            im = im.resize((w, h), Image.NEAREST)
            name = f"{anim}_{i}"
            im.save(os.path.join(DIR, name + ".png"))
            frames[name] = {"w": w, "h": h, "ax": round(f["ax"] * s, 1), "ay": h}
            names.append(name)
        anims[anim] = names
        print(anim, len(names), "frames")

    manifest = {"frames": frames, "anims": anims}
    with open(os.path.join(DIR, "frames.json"), "w") as fp:
        json.dump(manifest, fp, indent=1)
    print("wrote frames.json")


if __name__ == "__main__":
    main()
