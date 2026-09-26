// Menu, comic intro, how-to, and win screens.
import { CONFIG as C } from '../config.js';
import { IMAGES } from '../engine/assets.js';
import { mouse, wasPressed } from '../engine/input.js';

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
  }
}

export class ComicScene {
  constructor(app) {
    this.app = app;
    this.panel = 0;
    this.n = 6;
    this.t = 0;
    this.captions = [
      'One morning in Miami... a craving strikes. SMOOTHIE TIME.',
      'The fridge... EMPTY?! Not a single fruit in the kitchen.',
      'BREAKING NEWS: alien fruit have invaded Earth!',
      'Outside, everyone is sluggish — the fruit are RUNNING AWAY.',
      'The evil WATERMELON plans to gather all fruit and destroy Earth.',
      'One man. One blender. One mission: EAT PHRESH.',
    ];
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
    ctx.fillStyle = '#0b0b14'; ctx.fillRect(0, 0, C.CANVAS_W, C.CANVAS_H);
    const img = IMAGES['comic_' + (this.panel + 1)];
    const pad = 40;
    const w = C.CANVAS_W - pad * 2, h = C.CANVAS_H - 150;
    // panel frame
    ctx.fillStyle = '#fff';
    ctx.fillRect(pad - 6, pad - 6, w + 12, h + 12);
    if (img) {
      const s = Math.min(w / img.width, h / img.height);
      const iw = img.width * s, ih = img.height * s;
      ctx.fillStyle = '#111';
      ctx.fillRect(pad, pad, w, h);
      ctx.drawImage(img, pad + (w - iw) / 2, pad + (h - ih) / 2, iw, ih);
    } else {
      // placeholder panel
      ctx.fillStyle = ['#ffb4a2', '#a2d2ff', '#ffd6a5', '#caffbf', '#bdb2ff', '#ffc6ff'][this.panel];
      ctx.fillRect(pad, pad, w, h);
      ctx.fillStyle = '#333'; ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`[ panel ${this.panel + 1} art ]`, C.CANVAS_W / 2, C.CANVAS_H / 2 - 60);
    }
    // caption typewriter
    const cap = this.captions[this.panel];
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
    ctx.font = '19px monospace'; ctx.textAlign = 'left';
    const lines = [
      'A/D or ←/→ ......... move (hold SHIFT to walk)',
      'SPACE .............. jump (tap = short hop)',
      'S/↓ + SPACE ........ drop through platforms',
      'J or X ............. shoot',
      'K or C ............. roll (invincible + hurts fruit)',
      'L or V ............. dash',
      'E .................. drink smoothie → BURP BLAST',
      '',
      'Kill fruit → collect chunks → fill the smoothie meter.',
      'Bananas flee. Raisins snipe. The Melon... charges.',
      'Enemies drop power-ups: Protein(x2 dmg) Sneakers(speed)',
      'Sunscreen(shield) Ice Cube(freeze all).',
      'Reach the smoothie stand at the end of Ocean Drive!',
    ];
    lines.forEach((l, i) => ctx.fillText(l, 180, 140 + i * 28));
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffd1dc';
    ctx.fillText('click anywhere to go back', C.CANVAS_W / 2, C.CANVAS_H - 30);
  }
}

export class WinScene {
  constructor(app, score, time, kills) {
    this.app = app; this.score = score; this.time = time; this.kills = kills; this.t = 0;
  }
  update(dt) {
    this.t += dt;
    if (this.t > 1 && (wasPressed('confirm') || mouse.clicked)) this.app.showMenu();
  }
  draw(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, C.CANVAS_H);
    g.addColorStop(0, '#5f27cd'); g.addColorStop(1, '#ff6ba9');
    ctx.fillStyle = g; ctx.fillRect(0, 0, C.CANVAS_W, C.CANVAS_H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 54px monospace'; ctx.fillStyle = '#fff';
    ctx.fillText('SMOOTHIE ACQUIRED!', C.CANVAS_W / 2, 150);
    ctx.font = '80px serif';
    ctx.fillText('🥤', C.CANVAS_W / 2, 250);
    ctx.font = 'bold 24px monospace';
    ctx.fillText(`SCORE  ${this.score}`, C.CANVAS_W / 2, 340);
    ctx.fillText(`FRUIT BLENDED  ${this.kills}`, C.CANVAS_W / 2, 380);
    ctx.fillText(`TIME  ${this.time.toFixed(1)}s`, C.CANVAS_W / 2, 420);
    ctx.font = '18px monospace'; ctx.fillStyle = '#ffd1dc';
    ctx.fillText('the watermelon king will hear about this... (to be continued)', C.CANVAS_W / 2, 470);
  }
}
