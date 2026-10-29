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
| TAB / R | swap hero (the partner also auto-tags in when one drops) |
| E | smoothie special (needs full fruit meter): Phresh = BURP BLAST, Que = BLAST SHOT |
| Esc | pause / skip comic |

### Gamepad / Bluetooth controller

Any controller the browser's Gamepad API sees works - Xbox, PlayStation, Switch Pro, 8BitDo, etc., wired or Bluetooth. Pair it with your OS first (Windows: Settings > Bluetooth & devices; macOS: System Settings > Bluetooth), open the game, and press any button (browsers hide the pad until you do). A green toast confirms the connection.

| Controller | Action |
|---|---|
| Left stick / D-pad | move (light tilt = walk, full tilt = run) |
| A (Cross) | jump; confirm in menus; perk 1 |
| Down + A | drop through platforms |
| X (Square) / RT | shoot; perk 3 |
| B (Circle) | roll; perk 2 |
| Y (Triangle) / LT | dash |
| LB / Back | swap hero |
| RB | smoothie special |
| Start | pause / skip comic |

## Heroes

- **Phresh** - fast single shots. Special: burp blast (big AoE nuke).
- **Que** - shotgun, 5-pellet spread, slower fire. Special: blast shot (huge piercing slug).
- Each has their own hearts; fruit meter, score and power-ups are shared. Both down = run over.

## Roguelite loop

Clear the level, pick 1 of 3 perks, and it comes back harder: tougher/faster
enemies, more of them, and the platforms re-roll (wider pits, thinner and
farther-apart platforms, moving platforms from round 3, extra pits and blocks).
Survivors heal a heart, a fallen hero revives at 1 heart. Best round/score is
saved in localStorage. Tuning: `CONFIG.ROUND`, `CONFIG.CHARACTERS`, `src/game/run.js`.

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
assets/sprites/player, que  sliced + scaled character frames (from Public/ sheets)
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
