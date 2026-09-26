# Phresh Smoothie

A 2D pixel platformer. The fruit ran away — go get breakfast.

## Story

You wake up in Miami craving a smoothie. Fridge is empty. TV blasts the news:
ALIEN FRUIT HAVE INVADED EARTH. Everybody outside is sluggish and overweight
because the fruit are literally running away from them. The evil WATERMELON
plans to gather every fruit on the planet and destroy Earth. One man, one
blender, one mission: EAT PHRESH.

## Run it

No build step — plain HTML5 canvas + ES modules. Needs a local HTTP server
(ES modules won't load over file://):

```bash
python -m http.server 8093
# then open http://localhost:8093/
```

## Controls

| Key | Action |
|---|---|
| A/D or arrows | move (hold SHIFT to walk) |
| SPACE | jump (tap = short hop, coyote time + jump buffer) |
| S + SPACE | drop through platforms |
| J / X | shoot |
| K / C | roll (i-frames, damages enemies) |
| L / V | dash |
| E | drink smoothie -> BURP BLAST (needs full fruit meter) |
| Esc | pause / skip comic |

## Game systems

- Enemies: Bananas (flee on sight, chase them down), Raisins (lob seeds),
  Watermelon Bruiser mini-boss at the end of the level (charges).
- Every kill drops fruit chunks that fill the smoothie meter (10 = full).
- Power-up drop table (rolled per kill, max one): Protein 10% (2x damage),
  Sneakers 10% (+35% speed), Sunscreen 8% (one-hit shield),
  Ice Cube 7% (freeze all enemies 4s). Melon kills roll at 2.5x.
- Full meter + E = burp blast: big AoE nuke that also clears projectiles.
- Level 1 "Ocean Drive Meltdown": 6400px Miami strip, parallax sunset,
  pool + storm-drain gaps, balcony platforming, smoothie stand goal.

## Project layout

```
index.html            entry
src/config.js         every tunable number (also window.CONFIG for live tuning)
src/engine/           assets, input, animator, physics (AABB + one-way platforms)
src/game/             player, enemies, pickups, fx, level1, scene, screens
assets/sprites/player sliced + scaled character frames (from Public/ sheets)
assets/level1         parallax layers + ground tile (AI-generated)
assets/enemies        banana/raisin/melon frames (AI-generated)
assets/comic          6 intro panels (AI-generated)
assets/pickups        fruit + power-up icons (AI-generated)
scripts/              slice_sheets.py, scale_frames.py, process_art.py
Public/               original source art (character sheets, menu, buttons)
```

## Live tuning

Open devtools and tweak `window.CONFIG` while playing, e.g.
`CONFIG.JUMP_VELOCITY = 1100`. Bake keepers into `src/config.js`.
