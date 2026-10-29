// Roguelite run state: round counter, per-character hp carried between rounds,
// perk modifiers, and the difficulty curve. One run = keep blending the same
// level until both characters are down.
import { CONFIG as C } from '../config.js';

export const CHAR_IDS = ['phresh', 'que'];

export function newRun() {
  return {
    round: 1,
    score: 0, kills: 0, time: 0,
    active: 'phresh',
    perks: [],
    mods: { maxHpBonus: 0, damage: 1, fireRate: 1, speed: 1, fruitNeed: 0, shield: false },
    hp: { phresh: C.CHARACTERS.phresh.maxHp, que: C.CHARACTERS.que.maxHp },
  };
}

export const maxHpOf = (run, id) => C.CHARACTERS[id].maxHp + run.mods.maxHpBonus;
export const smoothieNeed = run => Math.max(4, C.SMOOTHIE_MAX - run.mods.fruitNeed);

// What the enemies look like on a given round.
export function difficulty(round) {
  const n = round - 1, R = C.ROUND;
  return {
    hp: 1 + n * R.hpPerRound,
    speed: Math.min(R.speedCap, 1 + n * R.speedPerRound),
    fireRate: 1 + n * R.fireRatePerRound,
    touch: round >= R.heavyTouchRound ? 2 : 1,
  };
}

export const PERKS = [
  { id: 'heart', name: 'EXTRA HELPING', desc: '+1 max heart for both heroes (and heals it)',
    apply(run) {
      run.mods.maxHpBonus += 2;
      for (const id of CHAR_IDS) if (run.hp[id] > 0) run.hp[id] += 2;
    } },
  { id: 'heal', name: 'FRESH SQUEEZED', desc: 'Fully heal both heroes (revives the fallen)',
    apply(run) { for (const id of CHAR_IDS) run.hp[id] = maxHpOf(run, id); } },
  { id: 'damage', name: 'HOT SAUCE', desc: '+35% bullet damage', apply(run) { run.mods.damage += 0.35; } },
  { id: 'fire', name: 'QUICK DRAW', desc: 'Shoot 20% faster', apply(run) { run.mods.fireRate *= 0.8; } },
  { id: 'speed', name: 'SNEAKER FUEL', desc: '+12% move speed', apply(run) { run.mods.speed += 0.12; } },
  { id: 'fruit', name: 'FRUIT MAGNET', desc: 'Smoothie meter needs 2 fewer fruit (min 4)',
    apply(run) { run.mods.fruitNeed += 2; } },
  { id: 'shield', name: 'THICK SKIN', desc: 'Start every round with a sunscreen shield',
    apply(run) { run.mods.shield = true; } },
];

export function rollPerks(run, n = 3) {
  // thick skin only once; otherwise anything goes
  const pool = PERKS.filter(p => !(p.id === 'shield' && run.mods.shield));
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

// Called when the perk is picked and the next round begins.
export function advanceRound(run, perk) {
  run.perks.push(perk.id);
  perk.apply(run);
  const R = C.ROUND;
  for (const id of CHAR_IDS) {
    const max = maxHpOf(run, id);
    if (run.hp[id] <= 0) run.hp[id] = Math.min(max, R.reviveHp);
    else run.hp[id] = Math.min(max, run.hp[id] + R.healBetweenRounds);
  }
  run.round++;
}

// ---- best score (localStorage is optional: may throw in private windows) ----
const KEY = 'phreshsmoothie.best';
export function loadBest() {
  try { return JSON.parse(localStorage.getItem(KEY)) || { round: 0, score: 0 }; }
  catch { return { round: 0, score: 0 }; }
}
export function saveBest(run) {
  const best = loadBest();
  const next = { round: Math.max(best.round, run.round), score: Math.max(best.score, run.score) };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return { best, next, record: run.round > best.round || run.score > best.score };
}
