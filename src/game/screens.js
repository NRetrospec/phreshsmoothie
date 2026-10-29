// Menu, comic intro, how-to, and win screens.
import { CONFIG as C } from '../config.js';
import { IMAGES, frameImg, frameMeta } from '../engine/assets.js';
import { mouse, wasPressed } from '../engine/input.js';
import { loadBest, rollPerks, CHAR_IDS, maxHpOf } from './run.js';

function drawCover(ctx, img, W, H) {
  const s = Math.max(W / img.width, H / img.height);
  const w = img.width * s, h = img.height * s;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

function button(ctx, img, label, x, y, w, h, hovered) {
  ctx.save();
  if (hovered) { ctx.translate(x + w / 2, y + h / 2); ctx.scale(1.06, 1.06); ctx.translate(-(x + w / 2), -(y + h / 2)); }
  if (img) {
    // buttons are 1920x1080 canvases with art in the middle — draw contained
    const s = Math.min(w / img.width, h / img.height);
    const iw = img.width * s, ih = img.height * s;
    ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  } else {
    ctx.fillStyle = hovered ? '#ff8fab' : '#e8607c';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
  }
  ctx.restore();
}

const inside = (x, y, w, h) => mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;

export class MenuScene {
  constructor(app) { this.app = app; this.t = 0; }
  update(dt) {
    this.t += dt;
    // layout: three stacked buttons bottom-center
    const bw = 300, bh = 90;
    const bx = C.CANVAS_W / 2 - bw / 2;
    this.btns = [
      { y: 250, label: 'EAT PHRESH', img: IMAGES.btn_play, act: () => this.app.startComic() },
      { y: 345, label: 'HOW TO PLAY', img: IMAGES.btn_howto, act: () => this.app.showHowTo() },
      { y: 440, label: 'SETTINGS', img: IMAGES.btn_settings, act: () => {} },
    ];
    for (const b of this.btns) {
      b.hover = inside(bx, b.y, bw, bh);
      if (b.hover && mouse.clicked) b.act();
    }
    if (wasPressed('confirm')) this.app.startComic();
  }
  draw(ctx) {
    if (IMAGES.menu_bg) drawCover(ctx, IMAGES.menu_bg, C.CANVAS_W, C.CANVAS_H);
    else { ctx.fillStyle = '#5f27cd'; ctx.fillRect(0, 0, C.CANVAS_W, C.CANVAS_H); }
    // title
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 64px monospace';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText('PHRESH SMOOTHIE', C.CANVAS_W / 2 + 4, 124);
    const hue = (this.t * 60) % 360;
    ctx.fillStyle = `hsl(${hue}, 90%, 65%)`;
    ctx.fillText('PHRESH SMOOTHIE', C.CANVAS_W / 2, 120);
    ctx.font = '18px monospace'; ctx.fillStyle = '#fff';
    ctx.fillText('the fruit ran away. go get breakfast.', C.CANVAS_W / 2, 170);
    ctx.restore();
    const bw = 300, bh = 90, bx = C.CANVAS_W / 2 - bw / 2;
    for (const b of this.btns || []) button(ctx, b.img, b.label, bx, b.y, bw, bh, b.hover);
    const best = loadBest();
    if (best.round > 0) {
      ctx.save();
      ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(`BEST RUN: ROUND ${best.round} · ${best.score} PTS`, C.CANVAS_W / 2 + 1, C.CANVAS_H - 19);
      ctx.fillStyle = '#ffd1dc'; ctx.fillText(`BEST RUN: ROUND ${best.round} · ${best.score} PTS`, C.CANVAS_W / 2, C.CANVAS_H - 20);
      ctx.restore();
    }
  }
}

// --- canvas-drawn helpers for the phone-call panels (built from the game sprites) ---
function sprite(ctx, char, frame, feetX, feetY, scale, facing = 1) {
  const img = frameImg(char, frame), m = frameMeta(char, frame);
  if (!img) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(feetX, feetY);
  ctx.scale(scale * facing, scale);
  ctx.drawImage(img, -m.ax, -m.ay);
  ctx.restore();
}

function wrap(ctx, text, maxW) {
  const lines = []; let line = '';
  for (const word of text.split(' ')) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; } else line = test;
  }
  lines.push(line);
  return lines;
}

// speech bubble with a tail pointing at (tx, ty)
function bubble(ctx, text, x, y, w, tx, ty, who) {
  ctx.save();
  ctx.font = 'bold 17px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const lines = wrap(ctx, text, w - 28);
  const h = lines.length * 22 + 38;
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 16); ctx.fill(); ctx.stroke();
  const bx = Math.max(x + 24, Math.min(tx, x + w - 24));
  ctx.beginPath(); ctx.moveTo(bx - 14, y + h - 1); ctx.lineTo(tx, ty); ctx.lineTo(bx + 14, y + h - 1);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.fillRect(bx - 12, y + h - 3, 24, 5); // hide stroke where tail meets bubble
  ctx.fillStyle = who || '#111'; ctx.font = 'bold 12px monospace';
  if (who) ctx.fillText(who === '#ff4d8d' ? 'PHRESH' : 'QUE', x + 14, y + 8);
  ctx.fillStyle = '#111'; ctx.font = 'bold 17px monospace';
  lines.forEach((l, k) => ctx.fillText(l, x + 14, y + 26 + k * 22));
  ctx.restore();
}

function skyline(ctx, x, y, w, h, base, col) {
  ctx.fillStyle = col;
  for (let bx = 0; bx < w; bx += 70) {
    const bh = 70 + ((bx * 37) % 110);
    ctx.fillRect(x + bx, y + base - bh, 58, bh);
  }
}

const PHRESH_C = '#ff4d8d', QUE_C = '#1c7ed6';

function drawCallPanel(ctx, x, y, w, h, t) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#ffb16b'); g.addColorStop(0.55, '#ff6b9d'); g.addColorStop(1, '#7048e8');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(x + w * 0.78, y + h * 0.4, 60, 0, Math.PI * 2); ctx.fill();
  skyline(ctx, x, y, w, h, h - 20, 'rgba(60,20,100,0.55)');
  ctx.fillStyle = '#3b1f5e'; ctx.fillRect(x, y + h - 30, w, 30);
  sprite(ctx, 'phresh', 'idle_' + (Math.floor(t * 5) % 4), x + w * 0.3, y + h - 26, 3.2);
  // phone at his ear, ringing
  ctx.font = '40px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const wob = Math.sin(t * 22) * 3;
  ctx.fillText('📱', x + w * 0.3 + 38 + wob, y + h - 26 - 3.2 * 78);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3;
  for (let k = 1; k <= 2; k++) {
    ctx.beginPath(); ctx.arc(x + w * 0.3 + 38, y + h - 26 - 3.2 * 78, 22 + k * 11, -0.9, 0.9); ctx.stroke();
  }
  if (t > 0.5) bubble(ctx, 'Que! The fruit are taking over. I need backup!', x + w * 0.42, y + 24, 360, x + w * 0.33, y + h - 26 - 3.2 * 90, PHRESH_C);
}

function drawAnswerPanel(ctx, x, y, w, h, t) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#1b2a4a'); g.addColorStop(0.6, '#364fc7'); g.addColorStop(1, '#4dabf7');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  skyline(ctx, x, y, w, h, h - 20, 'rgba(10,15,40,0.6)');
  // lit windows
  ctx.fillStyle = 'rgba(255,224,138,0.7)';
  for (let k = 0; k < 40; k++) ctx.fillRect(x + ((k * 97) % (w - 20)), y + 140 + ((k * 53) % 200), 6, 8);
  ctx.fillStyle = '#10182e'; ctx.fillRect(x, y + h - 30, w, 30);
  sprite(ctx, 'que', 'idle_' + (Math.floor(t * 5) % 4), x + w * 0.68, y + h - 26, 3.2, -1);
  ctx.font = '36px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('📱', x + w * 0.68 - 34, y + h - 26 - 3.2 * 80);
  if (t > 0.5) bubble(ctx, 'Say less. Grabbing the boomstick.', x + 40, y + 30, 340, x + w * 0.68 - 40, y + h - 26 - 3.2 * 92, QUE_C);
  if (t > 1.6) bubble(ctx, '...and snacks.', x + 40 + 140, y + 150, 190, x + w * 0.68 - 50, y + h - 26 - 3.2 * 86, QUE_C);
}

function drawTeamPanel(ctx, x, y, w, h, t) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#ff9a3c'); g.addColorStop(0.5, '#ff4d8d'); g.addColorStop(1, '#5f27cd');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(x + w * 0.5, y + h * 0.55, 120, 0, Math.PI * 2); ctx.fill();
  skyline(ctx, x, y, w, h, h - 20, 'rgba(50,10,90,0.6)');
  ctx.fillStyle = '#2e1250'; ctx.fillRect(x, y + h - 30, w, 30);
  const fl = Math.floor(t * 4) % 2;
  sprite(ctx, 'phresh', 'shoot_' + (fl ? 3 : 2), x + w * 0.36, y + h - 26, 3.4);
  sprite(ctx, 'que', 'shoot_' + (fl ? 3 : 2), x + w * 0.62, y + h - 26, 3.4);
  if (t > 0.4) bubble(ctx, "Let's EAT PHRESH.", x + 40, y + 24, 250, x + w * 0.35, y + h - 26 - 3.4 * 92, PHRESH_C);
  if (t > 1.3) bubble(ctx, 'Bring the heat.', x + w - 290, y + 60, 250, x + w * 0.64, y + h - 26 - 3.4 * 92, QUE_C);
}

const PANELS = [
  { img: 1, cap: 'One morning in Miami... a craving strikes. SMOOTHIE TIME.' },
  { img: 2, cap: 'The fridge... EMPTY?! Not a single fruit in the kitchen.' },
  { img: 3, cap: 'BREAKING NEWS: alien fruit have invaded Earth!' },
  { img: 4, cap: 'Outside, everyone is sluggish — the fruit are RUNNING AWAY.' },
  { img: 5, cap: 'The evil WATERMELON plans to gather all fruit and destroy Earth.' },
  { img: 6, cap: 'Phresh grabs his blender and heads out. But this is too big for one man...' },
  { draw: drawCallPanel, cap: 'So he calls the one guy he trusts. QUE.' },
  { draw: drawAnswerPanel, cap: 'Que picks up on the first ring. He is already loading up.' },
  { draw: drawTeamPanel, cap: 'TWO HEROES. ONE BLENDER. ONE MISSION: EAT PHRESH.' },
];

export class ComicScene {
  constructor(app) {
    this.app = app;
    this.panel = 0;
    this.n = PANELS.length;
    this.t = 0;
  }
  update(dt) {
    this.t += dt;
    if (wasPressed('confirm') || wasPressed('jump') || mouse.clicked) {
      this.panel++;
      this.t = 0;
      if (this.panel >= this.n) this.app.startLevel();
    }
    if (wasPressed('pause')) this.app.startLevel(); // skip
  }
  draw(ctx) {
    if (this.panel >= this.n) return;
    ctx.fillStyle = '#0b0b14'; ctx.fillRect(0, 0, C.CANVAS_W, C.CANVAS_H);
    const P = PANELS[this.panel];
    const pad = 40;
    const w = C.CANVAS_W - pad * 2, h = C.CANVAS_H - 150;
    // panel frame
    ctx.fillStyle = '#fff';
    ctx.fillRect(pad - 6, pad - 6, w + 12, h + 12);
    ctx.save();
    ctx.beginPath(); ctx.rect(pad, pad, w, h); ctx.clip();
    const img = P.img && IMAGES['comic_' + P.img];
    if (P.draw) {
      P.draw(ctx, pad, pad, w, h, this.t);
    } else if (img) {
      const s = Math.min(w / img.width, h / img.height);
      const iw = img.width * s, ih = img.height * s;
      ctx.fillStyle = '#111';
      ctx.fillRect(pad, pad, w, h);
      ctx.drawImage(img, pad + (w - iw) / 2, pad + (h - ih) / 2, iw, ih);
    } else {
      // placeholder panel
      ctx.fillStyle = ['#ffb4a2', '#a2d2ff', '#ffd6a5', '#caffbf', '#bdb2ff', '#ffc6ff'][this.panel % 6];
      ctx.fillRect(pad, pad, w, h);
      ctx.fillStyle = '#333'; ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`[ panel ${this.panel + 1} art ]`, C.CANVAS_W / 2, C.CANVAS_H / 2 - 60);
    }
    ctx.restore();
    // caption typewriter
    const cap = P.cap;
    const chars = Math.min(cap.length, Math.floor(this.t * 40));
    ctx.fillStyle = '#fff'; ctx.font = 'bold 19px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(cap.slice(0, chars), C.CANVAS_W / 2, C.CANVAS_H - 70);
    ctx.fillStyle = '#888'; ctx.font = '14px monospace';
    ctx.fillText(`${this.panel + 1}/${this.n} — click/space: next, esc: skip`, C.CANVAS_W / 2, C.CANVAS_H - 30);
  }
}

export class HowToScene {
  constructor(app) { this.app = app; }
  update() { if (wasPressed('confirm') || wasPressed('pause') || mouse.clicked) this.app.showMenu(); }
  draw(ctx) {
    ctx.fillStyle = '#12122b'; ctx.fillRect(0, 0, C.CANVAS_W, C.CANVAS_H);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.font = 'bold 40px monospace';
    ctx.fillText('HOW TO PLAY', C.CANVAS_W / 2, 80);
    ctx.font = '18px monospace'; ctx.textAlign = 'left';
    const lines = [
      'A/D or ←/→ ......... move (hold SHIFT to walk)',
      'SPACE .............. jump (tap = short hop)',
      'S/↓ + SPACE ........ drop through platforms',
      'J or X ............. shoot',
      'K or C ............. roll (invincible + hurts fruit)',
      'L or V ............. dash',
      'TAB or R ........... swap hero (partner takes over if one drops)',
      'E .................. smoothie special (shared meter, hero-specific)',
      'GAMEPAD: stick/D-pad move, A jump, X/RT shoot, B roll, Y/LT dash, LB swap, RB special, Start pause',
      'PHRESH: fast shots. Special = BURP BLAST (big circle nuke).',
      'QUE: shotgun spread, slower. Special = BLAST SHOT (piercing slug).',
      'Each hero has their own hearts. Both down = run over.',
      'Clear the level to pick a perk. Then it comes back, harder.',
      'Platforms shuffle more every round. How far can you get?',
    ];
    lines.forEach((l, i) => ctx.fillText(l, 130, 130 + i * 27));
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffd1dc';
    ctx.fillText('click anywhere to go back', C.CANVAS_W / 2, C.CANVAS_H - 30);
  }
}

// Between rounds: pick one of three perks, then the level comes back harder.
export class PerkScene {
  constructor(app) {
    this.app = app; this.t = 0;
    this.run = app.run;
    this.perks = rollPerks(app.run);
    this.cards = this.perks.map((_, i) => ({ x: 60 + i * 290, y: 170, w: 270, h: 200 }));
  }
  pick(i) { this.app.pickPerk(this.perks[i]); }
  update(dt) {
    this.t += dt;
    if (this.t < 0.4) return;
    this.cards.forEach((c, i) => {
      c.hover = inside(c.x, c.y, c.w, c.h);
      if (c.hover && mouse.clicked) this.pick(i);
      if (wasPressed('pick' + (i + 1))) this.pick(i);
    });
  }
  draw(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, C.CANVAS_H);
    g.addColorStop(0, '#2b1055'); g.addColorStop(1, '#d53369');
    ctx.fillStyle = g; ctx.fillRect(0, 0, C.CANVAS_W, C.CANVAS_H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.font = 'bold 40px monospace';
    ctx.fillText(`ROUND ${this.run.round} BLENDED!`, C.CANVAS_W / 2, 60);
    ctx.font = '18px monospace'; ctx.fillStyle = '#ffd1dc';
    ctx.fillText('Pick a perk. Round ' + (this.run.round + 1) + ' is hungrier and the streets have moved.', C.CANVAS_W / 2, 110);
    this.cards.forEach((c, i) => {
      const perk = this.perks[i];
      ctx.save();
      if (c.hover) { ctx.translate(c.x + c.w / 2, c.y + c.h / 2); ctx.scale(1.05, 1.05); ctx.translate(-(c.x + c.w / 2), -(c.y + c.h / 2)); }
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 14); ctx.fill();
      ctx.strokeStyle = c.hover ? '#ffd43b' : 'rgba(255,255,255,0.4)'; ctx.lineWidth = c.hover ? 4 : 2;
      ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 14); ctx.stroke();
      ctx.fillStyle = '#ffd43b'; ctx.font = 'bold 15px monospace'; ctx.fillText(`[${i + 1}]`, c.x + c.w / 2, c.y + 26);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 21px monospace'; ctx.fillText(perk.name, c.x + c.w / 2, c.y + 62);
      ctx.fillStyle = '#ffd1dc'; ctx.font = '16px monospace';
      wrap(ctx, perk.desc, c.w - 36).forEach((l, k) => ctx.fillText(l, c.x + c.w / 2, c.y + 110 + k * 22));
      ctx.restore();
    });
    // squad status
    ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center';
    const parts = CHAR_IDS.map(id => {
      const hp = this.run.hp[id], max = maxHpOf(this.run, id);
      return `${C.CHARACTERS[id].name}: ${hp > 0 ? `${hp / 2}/${max / 2} hearts` : 'DOWN (revives next round)'}`;
    });
    ctx.fillStyle = '#fff';
    ctx.fillText(parts.join('     '), C.CANVAS_W / 2, 430);
    ctx.fillStyle = '#ffd1dc'; ctx.font = '14px monospace';
    ctx.fillText(`perks so far: ${this.run.perks.length}   score: ${this.run.score}`, C.CANVAS_W / 2, 470);
  }
}

export class GameOverScene {
  constructor(app, run, record) {
    this.app = app; this.run = run; this.record = record; this.t = 0;
  }
  update(dt) {
    this.t += dt;
    if (this.t < 1) return;
    if (wasPressed('pause')) this.app.showMenu();
    else if (wasPressed('confirm') || wasPressed('jump') || mouse.clicked) this.app.retryRun();
  }
  draw(ctx) {
    ctx.fillStyle = '#12061f'; ctx.fillRect(0, 0, C.CANVAS_W, C.CANVAS_H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 54px monospace'; ctx.fillStyle = '#ff6b9d';
    ctx.fillText('SQUEEZED OUT!', C.CANVAS_W / 2, 100);
    ctx.font = '22px monospace'; ctx.fillStyle = '#ffd1dc';
    ctx.fillText('The fruit win this time...', C.CANVAS_W / 2, 150);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 26px monospace';
    ctx.fillText(`REACHED ROUND  ${this.run.round}`, C.CANVAS_W / 2, 230);
    ctx.fillText(`SCORE  ${this.run.score}`, C.CANVAS_W / 2, 272);
    ctx.fillText(`FRUIT BLENDED  ${this.run.kills}`, C.CANVAS_W / 2, 314);
    ctx.fillText(`PERKS  ${this.run.perks.length}`, C.CANVAS_W / 2, 356);
    if (this.record) {
      ctx.fillStyle = Math.floor(this.t * 3) % 2 ? '#ffd43b' : '#fff';
      ctx.fillText('NEW BEST RUN!', C.CANVAS_W / 2, 405);
    }
    ctx.font = '18px monospace'; ctx.fillStyle = '#ffd1dc';
    if (this.t > 1) ctx.fillText('Enter / click: try again      Esc: menu', C.CANVAS_W / 2, 480);
  }
}
