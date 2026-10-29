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

// ---------------------------------------------------------------------------
// Roguelite rounds. Round 1 is the hand-built layout above; every later round
// re-rolls the platforms (seeded by round number) and the change grows with
// `heat`: wider pits, fewer / thinner / farther-apart platforms, moving
// platforms, more blocks in the way. Enemy count + mix also scale.
// ---------------------------------------------------------------------------
function rng(seed) { // mulberry32
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildRound(round) {
  const base = buildLevel1();
  if (round <= 1) return base;

  const heat = Math.min(round - 1, 9);
  const R = rng(round * 7919 + 101);
  const between = (a, b) => a + R() * (b - a);
  const { w, h, groundY } = base;
  const solids = [], oneways = [], enemies = [], props = [];

  // --- pits: the two originals widen; extra pits show up from round 3 / 5 ---
  const gaps = [[2350, 2540], [4300, 4560]].map(([a, b]) => {
    const grow = heat * 14;
    return [a - grow * between(0.3, 1), b + grow * between(0.3, 1)];
  });
  if (round >= 3) { const x = between(1000, 1700); gaps.push([x, x + between(150, 210) + heat * 8]); }
  if (round >= 5) { const x = between(3000, 3900); gaps.push([x, x + between(160, 230) + heat * 8]); }
  gaps.sort((a, b) => a[0] - b[0]);
  // drop any pit that crowds its neighbour (keep >= 450px of ground between)
  const pits = [];
  for (const g of gaps) if (!pits.length || g[0] - pits[pits.length - 1][1] > 450) pits.push(g);
  const MAX_PIT = 340;
  for (const g of pits) g[1] = Math.min(g[1], g[0] + MAX_PIT);

  let gx = 0;
  const segs = []; // ground segments {a,b}
  for (const [a, b] of [...pits, [w, w]]) {
    if (a > gx) { solids.push({ x: gx, y: groundY, w: a - gx, h: h - groundY }); segs.push({ a: gx, b: a }); }
    gx = b;
  }
  const onGroundSpan = (x0, x1) => segs.some(s => x0 >= s.a + 20 && x1 <= s.b - 20);

  // --- blocks (planters/crates), only where there's ground to stand them on ---
  const blocks = [];
  const nBlocks = Math.round(between(4, 6) + heat * 0.4);
  for (let i = 0, tries = 0; i < nBlocks && tries < 60; tries++) {
    const bw = T * Math.round(between(2, 4)), bh = T * Math.round(between(1, 2));
    const x = Math.round(between(800, 5700) / 8) * 8;
    if (!onGroundSpan(x, x + bw) || blocks.some(b => Math.abs(b.x - x) < 300)) continue;
    const b = { x, y: groundY - bh, w: bw, h: bh };
    blocks.push(b); solids.push(b); i++;
  }

  // --- one-way platform chain across the level ---
  const platW = () => Math.max(90, between(130, 200) - heat * 9);
  const moverChance = round >= 3 ? Math.min(0.55, 0.15 + heat * 0.06) : 0;
  const addPlat = (x, rise, wd) => {
    const p = { x: Math.round(x), y: groundY - rise, w: Math.round(wd), h: 14 };
    if (R() < moverChance) {
      p.move = { ox: p.x, oy: p.y, ax: Math.round(between(50, 70 + heat * 8)), ay: 0,
                 sp: between(0.8, 1.4), ph: R() * 6.28 };
    }
    oneways.push(p);
    return p;
  };
  // stepping stones inside every pit so it's always crossable
  for (const [a, b] of pits) {
    const n = Math.max(2, Math.ceil((b - a) / 130));
    for (let i = 0; i < n; i++) {
      const cx = a + ((i + 0.5) / n) * (b - a);
      const wd = Math.max(100, 120 - heat * 3);
      addPlat(cx - wd / 2, i % 2 ? 175 : 95, wd);
    }
  }
  // the ladder: random walk in height (each rise <= 110, jump apex is ~190)
  let x = between(420, 520), rise = 100;
  const spacing = () => Math.min(400, between(190, 250) + heat * 20);
  while (x < 5850) {
    const wd = platW();
    const inPit = pits.some(([a, b]) => x + wd > a - 70 && x < b + 70);
    const nearBlock = blocks.some(b => x + wd + 40 > b.x && x - 40 < b.x + b.w);
    if (!inPit && !nearBlock) addPlat(x, rise, wd);
    rise = Math.max(85, Math.min(290, rise + between(-130, 110)));
    x += wd + spacing();
  }

  // --- enemies: sampled from real standing surfaces ---
  const surfaces = [];
  for (const s of segs) surfaces.push({ a: Math.max(s.a, 600), b: s.b, y: groundY, wt: s.b - s.a });
  for (const b of blocks) surfaces.push({ a: b.x, b: b.x + b.w, y: b.y, wt: b.w * 1.5 });
  for (const p of oneways) if (!p.move && p.x > 600) surfaces.push({ a: p.x, b: p.x + p.w, y: p.y, wt: p.w * 2 });
  const usable = surfaces.filter(s => s.b - s.a > 60 && s.a < 5900);
  const total = usable.reduce((n, s) => n + s.wt, 0);
  const pick = () => {
    let r = R() * total;
    for (const s of usable) { r -= s.wt; if (r <= 0) return s; }
    return usable[usable.length - 1];
  };
  const spawn = (type, hgt) => {
    const s = pick();
    const x = between(s.a + 20, Math.min(s.b, 5900) - 40);
    enemies.push({ type, x, y: s.y - hgt - 4 });
  };
  const nBanana = 9 + round, nRaisin = Math.min(12, 4 + round);
  for (let i = 0; i < nBanana; i++) spawn('banana', 62);
  for (let i = 0; i < nRaisin; i++) spawn('raisin', 44);
  for (let i = 0; i < Math.min(3, Math.floor(round / 2)); i++) spawn('melon', 76);
  enemies.push({ type: 'melon', x: 6050, y: groundY - 90 });
  if (round >= 6) enemies.push({ type: 'melon', x: 5880, y: groundY - 90 });

  for (let px = 300; px < w; px += 560) props.push({ kind: 'palm', x: px, y: groundY });
  pits.forEach(([a, b], i) => props.push({ kind: i % 2 ? 'drain' : 'pool', x: a, y: groundY, w: b - a }));

  return { w, h, groundY, solids, oneways, enemies, props,
           playerStart: base.playerStart, goal: base.goal, round };
}
