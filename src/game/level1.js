// Level 1: "Ocean Drive Meltdown" — Miami tropical city strip.
// Coordinates in px. T = 48 tile size. Ground level y = 480 (world h 540 * scale...)
// World is 6400 x 720. Camera view 960x540.
import { CONFIG as C } from '../config.js';

const T = C.TILE;

export function buildLevel1() {
  const w = 6400, h = 720;
  const groundY = h - T * 2; // 624
  const solids = [];
  const oneways = [];
  const enemies = [];  // {type, x, y}
  const props = [];    // decorative {kind, x, y}

  // ground segments with 2 gaps (pool + storm drain)
  const gaps = [[2350, 2540], [4300, 4560]];
  let gx = 0;
  for (const [a, b] of [...gaps, [w, w]]) {
    if (a > gx) solids.push({ x: gx, y: groundY, w: a - gx, h: h - groundY });
    gx = b;
  }

  // stepped sidewalk planters / crates (solids)
  solids.push({ x: 900, y: groundY - T, w: T * 3, h: T });
  solids.push({ x: 1650, y: groundY - T * 2, w: T * 2, h: T * 2 });
  solids.push({ x: 3050, y: groundY - T, w: T * 4, h: T });
  solids.push({ x: 3260, y: groundY - T * 2, w: T * 2, h: T });
  solids.push({ x: 5000, y: groundY - T * 2, w: T * 2, h: T * 2 });
  solids.push({ x: 5950, y: groundY - T, w: T * 3, h: T });

  // one-way platforms: balconies, awnings, palm platforms
  oneways.push({ x: 520, y: groundY - 110, w: 170, h: 14 });
  oneways.push({ x: 760, y: groundY - 200, w: 150, h: 14 });
  oneways.push({ x: 1150, y: groundY - 150, w: 190, h: 14 });
  oneways.push({ x: 1420, y: groundY - 260, w: 150, h: 14 });
  oneways.push({ x: 1900, y: groundY - 130, w: 200, h: 14 });
  // over the pool gap
  oneways.push({ x: 2330, y: groundY - 90, w: 110, h: 14 });
  oneways.push({ x: 2470, y: groundY - 170, w: 110, h: 14 });
  oneways.push({ x: 2700, y: groundY - 120, w: 170, h: 14 });
  oneways.push({ x: 3400, y: groundY - 160, w: 180, h: 14 });
  oneways.push({ x: 3650, y: groundY - 270, w: 140, h: 14 });
  oneways.push({ x: 3900, y: groundY - 150, w: 190, h: 14 });
  // storm drain gap hoppers
  oneways.push({ x: 4290, y: groundY - 100, w: 100, h: 14 });
  oneways.push({ x: 4430, y: groundY - 180, w: 100, h: 14 });
  oneways.push({ x: 4700, y: groundY - 130, w: 180, h: 14 });
  oneways.push({ x: 5200, y: groundY - 160, w: 170, h: 14 });
  oneways.push({ x: 5450, y: groundY - 280, w: 150, h: 14 });
  oneways.push({ x: 5700, y: groundY - 150, w: 170, h: 14 });

  // enemies
  enemies.push({ type: 'banana', x: 700, y: groundY - 70 });
  enemies.push({ type: 'banana', x: 1250, y: groundY - 70 });
  enemies.push({ type: 'raisin', x: 1680, y: groundY - T * 2 - 50 });
  enemies.push({ type: 'banana', x: 2050, y: groundY - 70 });
  enemies.push({ type: 'raisin', x: 2750, y: groundY - 170 });
  enemies.push({ type: 'banana', x: 3150, y: groundY - T - 70 });
  enemies.push({ type: 'banana', x: 3550, y: groundY - 70 });
  enemies.push({ type: 'raisin', x: 3700, y: groundY - 320 });
  enemies.push({ type: 'banana', x: 4100, y: groundY - 70 });
  enemies.push({ type: 'raisin', x: 4750, y: groundY - 180 });
  enemies.push({ type: 'banana', x: 4900, y: groundY - 70 });
  enemies.push({ type: 'banana', x: 5300, y: groundY - 70 });
  enemies.push({ type: 'raisin', x: 5500, y: groundY - 330 });
  enemies.push({ type: 'melon', x: 6050, y: groundY - 90 });   // mini-boss at the end

  // decorative props (drawn by level renderer placeholders or tiles img)
  for (let x = 300; x < w; x += 560) props.push({ kind: 'palm', x, y: groundY });
  props.push({ kind: 'pool', x: 2350, y: groundY, w: 190 });
  props.push({ kind: 'drain', x: 4300, y: groundY, w: 260 });

  return { w, h, groundY, solids, oneways, enemies, props,
           playerStart: { x: 120, y: groundY - 100 },
           goal: { x: 6250, y: groundY - 140, w: 80, h: 140 } };
}
