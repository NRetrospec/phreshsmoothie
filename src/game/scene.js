// Main gameplay scene: world, camera, projectiles, drops, HUD, win/lose.
import { CONFIG as C } from '../config.js';
import { IMAGES } from '../engine/assets.js';
import { Player } from './player.js';
import { Banana, Raisin, Melon, aabb } from './enemies.js';
import { Pickup, rollDrops } from './pickups.js';
import { buildRound } from './level1.js';
import { CHAR_IDS, difficulty, smoothieNeed } from './run.js';
import { frameImg } from '../engine/assets.js';
import { FX } from './fx.js';
import { isDown, wasPressed } from '../engine/input.js';

const ENEMY_CLASSES = { banana: Banana, raisin: Raisin, melon: Melon };

export class GameScene {
  // One round of the roguelite loop. app.run carries hp/perks between rounds.
  constructor(app) {
    this.app = app;
    this.run = app.run;
    this.round = this.run.round;
    this.diff = difficulty(this.round);
    this.level = buildRound(this.round);
    this.solids = this.level.solids;
    this.oneways = this.level.oneways;
    // shared by both heroes: smoothie meter, score, active power-ups
    this.team = { fruits: 0, score: 0, power: { protein: 0, sneakers: 0, shield: this.run.mods.shield } };
    const st = this.level.playerStart;
    this.squad = {};
    for (const id of CHAR_IDS) this.squad[id] = new Player(id, st.x, st.y, this.run, this.team);
    const first = this.squad[this.run.active].dead ? CHAR_IDS.find(id => !this.squad[id].dead) : this.run.active;
    this.player = this.squad[first];
    this.swapCd = 0;
    this.toast = { text: `ROUND ${this.round}`, t: 2.2, color: '#ffd1dc' };
    this.enemies = this.level.enemies.map(e => new ENEMY_CLASSES[e.type](e.x, e.y, this.diff));
    this.bullets = [];
    this.blasts = [];
    this.seeds = [];
    this.pickups = [];
    this.fx = new FX();
    this.cam = { x: 0, y: this.level.h - C.CANVAS_H, shakeT: 0, shakeMag: 0 };
    this.paused = false;
    this.won = false; this.winT = 0;
    this.lostT = 0; this.over = false;
    this.burpT = 0; this.burpX = 0; this.burpY = 0;
    this.frozenGlobal = 0;
    this.time = 0;
    this.kills = 0;
  }

  // ---- API used by player/enemies ----
  get smoothieNeed() { return smoothieNeed(this.run); }

  spawnBullet(x, y, vx, dmg, o = {}) {
    this.bullets.push({ x, y, vx, vy: o.vy || 0, dmg, t: 0, life: o.life ?? C.BULLET_LIFE, r: o.r || 0 });
  }
  // Que's special: a big piercing slug blast that hits everything once.
  spawnBlast(x, y, dir, dmg) {
    this.blasts.push({ x, y, dir, dmg, t: 0, hit: new Set(), trail: 0 });
    this.fx.burp(x, y, 40);
    this.shake(10, 0.3);
  }
  say(text, color = '#fff', t = 1.6) { this.toast = { text, color, t }; }

  // Tag the other hero in at the same spot. Manual swaps respect a short cooldown.
  swap(manual) {
    const cur = this.player;
    const other = this.squad[CHAR_IDS.find(id => id !== cur.id)];
    if (other.dead || (manual && this.swapCd > 0)) return false;
    other.tagIn(cur, manual ? C.SWAP_INVULN : C.DEATH_SWAP_INVULN);
    this.player = other;
    this.run.active = other.id;
    this.swapCd = C.SWAP_COOLDOWN;
    this.fx.tag(cur.feetX, cur.y + cur.h / 2, cur.cfg.color);
    this.fx.tag(other.feetX, other.y + other.h / 2, other.cfg.color);
    this.say(manual ? `${other.cfg.name}!` : `${cur.cfg.name} IS DOWN - ${other.cfg.name} TAGS IN!`, other.cfg.color);
    return true;
  }

  // Bank this round's results into the run (hp carries over to the next round).
  bankRound() {
    for (const id of CHAR_IDS) this.run.hp[id] = this.squad[id].hp;
    this.run.score += this.team.score;
    this.run.kills += this.kills;
    this.run.time += this.time;
  }

  updatePlatforms() {
    const pl = this.player;
    for (const p of this.oneways) {
      const m = p.move;
      if (!m) continue;
      const nx = m.ox + Math.sin(this.time * m.sp + m.ph) * m.ax;
      const ny = m.oy + Math.sin(this.time * m.sp + m.ph) * m.ay;
      const riding = pl.onGround && Math.abs(pl.feetY - p.y) < 6 && pl.x + pl.w > p.x && pl.x < p.x + p.w;
      if (riding) { pl.x += nx - p.x; pl.y += ny - p.y; }
      p.x = nx; p.y = ny;
    }
  }
  spawnSeed(x, y, vx, vy) {
    this.seeds.push({ x, y, vx, vy, t: 0 });
  }
  shake(mag, t) { this.cam.shakeMag = mag; this.cam.shakeT = t; }

  onEnemyKilled(enemy) {
    this.kills++;
    this.team.score += Math.floor((enemy.type === 'melon' ? 500 : 100) * (1 + (this.round - 1) * 0.1));
    const colors = { banana: '#ffe135', raisin: '#5b3a6e', melon: '#e03131' };
    this.fx.splat(enemy.cx, enemy.cy, colors[enemy.type] || '#fff');
    this.shake(enemy.type === 'melon' ? 10 : 3, 0.2);
    this.pickups.push(...rollDrops(enemy));
  }

  burpBlast(x, y) {
    this.burpT = 0.5; this.burpX = x; this.burpY = y;
    this.fx.burp(x, y, C.BURP_RADIUS * 0.5);
    this.shake(12, 0.4);
    for (const e of this.enemies) {
      if (Math.hypot(e.cx - x, e.cy - y) < C.BURP_RADIUS) e.takeHit(C.BURP_DAMAGE, this);
    }
    this.seeds.length = 0; // blast clears projectiles
  }

  applyPickup(p) {
    const pl = this.player, team = this.team;
    if (p.type === 'fruit') {
      team.fruits = Math.min(team.fruits + 1, this.smoothieNeed);
      team.score += 25;
      this.fx.sparkle(p.cx, p.cy);
    } else if (p.type === 'protein') team.power.protein = C.POWERUP_TIME;
    else if (p.type === 'sneakers') team.power.sneakers = C.POWERUP_TIME;
    else if (p.type === 'sunscreen') team.power.shield = true;
    else if (p.type === 'icecube') {
      for (const e of this.enemies) e.frozen = C.FREEZE_TIME;
      this.fx.sparkle(pl.feetX, pl.y, 'rgba(165,243,252,0.9)');
    }
    if (p.type !== 'fruit') this.fx.sparkle(p.cx, p.cy, 'rgba(120,220,255,0.9)');
  }

  update(dt) {
    if (wasPressed('pause')) this.paused = !this.paused;
    if (this.paused) return;
    this.time += dt;

    if (this.over) {
      this.lostT += dt;
      this.fx.update(dt);
      if (this.lostT > 2.2 || (this.lostT > 0.6 && wasPressed('confirm'))) { this.bankRound(); this.app.endRun(); }
      return;
    }
    if (this.won) {
      this.winT += dt;
      this.fx.update(dt);
      if (this.winT > 3 || (this.winT > 0.6 && wasPressed('confirm'))) { this.bankRound(); this.app.showPerks(); }
      return;
    }

    if (this.swapCd > 0) this.swapCd -= dt;
    if (this.toast.t > 0) this.toast.t -= dt;
    if (wasPressed('swap')) this.swap(true);
    this.updatePlatforms();
    this.player.update(dt, this);
    for (const e of this.enemies) e.update(dt, this);

    // bullets vs enemies
    for (const b of this.bullets) {
      b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
          e.takeHit(b.dmg, this);
          this.fx.hit(b.x, b.y, '#ffd43b');
          b.t = 99;
          break;
        }
      }
      // bullets stop on solids
      for (const s of this.solids) {
        if (b.x > s.x && b.x < s.x + s.w && b.y > s.y && b.y < s.y + s.h) { b.t = 99; this.fx.hit(b.x, b.y, '#aaa'); break; }
      }
    }
    this.bullets = this.bullets.filter(b => b.t < b.life);

    // Que's blast: pierces, damages each enemy once, wipes seeds, stops on walls
    for (const b of this.blasts) {
      b.t += dt; b.x += b.dir * C.BLAST_SPEED * dt;
      const box = { x: b.dir > 0 ? b.x : b.x - C.BLAST_W, y: b.y - C.BLAST_H / 2, w: C.BLAST_W, h: C.BLAST_H };
      for (const e of this.enemies) {
        if (e.dead || b.hit.has(e.id) || !aabb(box, e)) continue;
        b.hit.add(e.id);
        e.takeHit(b.dmg, this);
        this.fx.hit(e.cx, e.cy, '#ffb347');
        this.shake(6, 0.15);
      }
      for (const sd of this.seeds) if (sd.x > box.x && sd.x < box.x + box.w && sd.y > box.y && sd.y < box.y + box.h) sd.t = 99;
      b.trail -= dt;
      if (b.trail <= 0) { b.trail = 0.04; this.fx.hit(b.x, b.y + (Math.random() - 0.5) * C.BLAST_H * 0.7, '#ffd43b'); }
      const front = b.x + b.dir * C.BLAST_W;
      if (this.solids.some(sl => front > sl.x && front < sl.x + sl.w && b.y > sl.y && b.y < sl.y + sl.h)) {
        this.fx.burp(front, b.y, 36); b.t = 99;
      }
    }
    this.blasts = this.blasts.filter(b => b.t < C.BLAST_LIFE);

    // roll damage: rolling through enemies hurts them
    const pl = this.player;
    const pbox = { x: pl.x, y: pl.y, w: pl.w, h: pl.h };
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (aabb(pbox, e)) {
        if (pl.rolling || pl.dashing) e.takeHit(C.ROLL_DAMAGE * dt * 8, this); // dps while overlapping
        else e.frozen <= 0 && pl.hurt(this.diff.touch, this, e.cx);
      }
    }

    // seeds vs player
    for (const s of this.seeds) {
      s.t += dt;
      s.vy += C.SEED_GRAVITY * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.x > pl.x && s.x < pl.x + pl.w && s.y > pl.y && s.y < pl.y + pl.h) {
        pl.hurt(1, this, s.x - Math.sign(s.vx) * 10);
        s.t = 99;
      }
      for (const sol of this.solids) {
        if (s.x > sol.x && s.x < sol.x + sol.w && s.y > sol.y && s.y < sol.y + sol.h) { s.t = 99; this.fx.hit(s.x, s.y, '#845ef7'); break; }
      }
    }
    this.seeds = this.seeds.filter(s => s.t < 4);

    // pickups
    for (const p of this.pickups) {
      p.update(dt, this);
      if (aabb(pbox, p)) { this.applyPickup(p); p.life = -1; }
    }
    this.pickups = this.pickups.filter(p => p.life > 0);

    // active hero down? partner tags in automatically, otherwise the run is over
    if (pl.dead) {
      this.fx.splat(pl.feetX, pl.y + pl.h / 2, pl.cfg.color);
      this.shake(8, 0.3);
      if (!this.swap(false)) { this.over = true; this.lostT = 0; return; }
    }

    this.enemies = this.enemies.filter(e => !e.dead);
    if (this.burpT > 0) this.burpT -= dt;
    this.fx.update(dt);

    // win check: reach goal (blender stand at level end)
    const g = this.level.goal;
    if (aabb(pbox, g) && !this.won) { this.won = true; this.winT = 0; }

    // camera
    const cam = this.cam;
    const lookahead = pl.facing * C.CAM_LOOKAHEAD * Math.min(1, Math.abs(pl.vx) / C.RUN_SPEED);
    const tx = pl.feetX + lookahead - C.CANVAS_W / 2;
    const ty = pl.feetY - C.CANVAS_H * 0.62;
    cam.x += (tx - cam.x) * Math.min(1, C.CAM_LERP * dt);
    cam.y += (ty - cam.y) * Math.min(1, C.CAM_LERP * dt * 0.7);
    cam.x = Math.max(0, Math.min(cam.x, this.level.w - C.CANVAS_W));
    cam.y = Math.max(0, Math.min(cam.y, this.level.h - C.CANVAS_H));
    if (cam.shakeT > 0) cam.shakeT -= dt;
  }

  // ================= RENDER =================
  draw(ctx) {
    const cam = this.cam;
    const sx = cam.shakeT > 0 ? (Math.random() - 0.5) * 2 * cam.shakeMag : 0;
    const sy = cam.shakeT > 0 ? (Math.random() - 0.5) * 2 * cam.shakeMag : 0;

    if (this.round > 1) ctx.filter = `hue-rotate(${((this.round - 1) * 47) % 360}deg)`;
    this.drawParallax(ctx, cam);
    ctx.filter = 'none';

    ctx.save();
    ctx.translate(-Math.round(cam.x + sx), -Math.round(cam.y + sy));

    this.drawWorld(ctx);
    for (const p of this.pickups) p.draw(ctx);
    for (const e of this.enemies) e.draw(ctx);
    this.player.draw(ctx);

    // bullets (Que's pellets are small and round, Phresh's are streaks)
    for (const b of this.bullets) {
      ctx.fillStyle = b.r ? '#ffb347' : '#ffd43b';
      ctx.beginPath();
      if (b.r) ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      else ctx.ellipse(b.x, b.y, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const b of this.blasts) this.drawBlast(ctx, b);
    // seeds
    ctx.fillStyle = '#845ef7';
    for (const s of this.seeds) {
      ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, Math.PI * 2); ctx.fill();
    }
    // burp blast ring
    if (this.burpT > 0) {
      const k = 1 - this.burpT / 0.5;
      ctx.strokeStyle = `rgba(170,255,120,${1 - k})`;
      ctx.lineWidth = 14 * (1 - k) + 4;
      ctx.beginPath(); ctx.arc(this.burpX, this.burpY, C.BURP_RADIUS * k, 0, Math.PI * 2); ctx.stroke();
    }
    this.fx.draw(ctx);
    ctx.restore();

    this.drawHUD(ctx);

    if (this.paused) this.overlayText(ctx, 'PAUSED', 'Esc to resume');
    if (this.over) this.overlayText(ctx, 'SQUEEZED OUT!', 'Both heroes are down...');
    if (this.won) this.overlayText(ctx, `ROUND ${this.round} BLENDED!`, 'Enter to continue');
  }

  drawParallax(ctx, cam) {
    const W = C.CANVAS_W, H = C.CANVAS_H;
    const sky = IMAGES.bg_sky, city = IMAGES.bg_city, palms = IMAGES.bg_palms;
    if (sky) ctx.drawImage(sky, 0, 0, W, H);
    else { // fallback gradient sky
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#ff9a8b'); g.addColorStop(0.45, '#ff6ba9'); g.addColorStop(1, '#5f27cd');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffd166';
      ctx.beginPath(); ctx.arc(W * 0.72, H * 0.34, 55, 0, Math.PI * 2); ctx.fill();
    }
    const tile = (img, speed, yOff) => {
      if (!img) return false;
      const scale = H / img.height;
      const iw = img.width * scale;
      let x = -((cam.x * speed) % iw);
      for (; x < W; x += iw) ctx.drawImage(img, x, yOff, iw, H);
      return true;
    };
    if (!tile(city, 0.25, 0)) {
      // fallback skyline silhouettes
      ctx.fillStyle = 'rgba(60,30,90,0.7)';
      const ox = -(cam.x * 0.25) % 400;
      for (let x = ox - 400; x < W + 400; x += 200) {
        const hgt = 120 + ((x * 7919) % 140 + 140) % 140;
        ctx.fillRect(x, H - hgt - 80, 110, hgt + 80);
      }
    }
    if (!tile(palms, 0.5, 0)) {
      ctx.fillStyle = 'rgba(30,15,60,0.8)';
      const ox = -(cam.x * 0.5) % 520;
      for (let x = ox - 520; x < W + 520; x += 260) {
        ctx.fillRect(x + 40, H - 200, 12, 130);
        for (let a = 0; a < 5; a++) {
          ctx.beginPath();
          ctx.ellipse(x + 46, H - 200, 55, 14, (a - 2) * 0.5, 0, Math.PI);
          ctx.fill();
        }
      }
    }
  }

  drawWorld(ctx) {
    const lvl = this.level;
    const tiles = IMAGES.tiles;
    // solids
    for (const s of lvl.solids) {
      if (tiles) {
        // tile the ground texture
        const T = C.TILE;
        ctx.save();
        ctx.beginPath(); ctx.rect(s.x, s.y, s.w, s.h); ctx.clip();
        for (let x = s.x; x < s.x + s.w; x += T)
          for (let y = s.y; y < s.y + s.h; y += T)
            ctx.drawImage(tiles, 0, 0, tiles.width, tiles.height, x, y, T, T);
        ctx.restore();
        // top edge highlight
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(s.x, s.y, s.w, 4);
      } else {
        ctx.fillStyle = '#e8607c';
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = '#ffd1dc';
        ctx.fillRect(s.x, s.y, s.w, 6);
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let x = s.x; x < s.x + s.w; x += C.TILE) ctx.fillRect(x, s.y + 6, 2, s.h - 6);
      }
    }
    // oneways (balcony platforms)
    for (const p of lvl.oneways) {
      ctx.fillStyle = '#26c6da';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#b2ffff';
      ctx.fillRect(p.x, p.y, p.w, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(p.x + 4, p.y + p.h, 6, 8);
      ctx.fillRect(p.x + p.w - 10, p.y + p.h, 6, 8);
    }
    // goal: smoothie stand
    const g = lvl.goal;
    ctx.fillStyle = '#ff8fab';
    ctx.fillRect(g.x, g.y + 60, g.w, g.h - 60);
    ctx.fillStyle = '#fff';
    ctx.fillRect(g.x - 10, g.y + 40, g.w + 20, 24);
    ctx.fillStyle = '#5f27cd';
    ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
    ctx.fillText('SMOOTHIE', g.x + g.w / 2, g.y + 57);
    // cup
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(g.x + g.w / 2 - 14, g.y, 28, 36);
    ctx.fillStyle = '#f472b6';
    ctx.fillRect(g.x + g.w / 2 - 14, g.y, 28, 12);
    ctx.fillStyle = '#fff';
    ctx.fillRect(g.x + g.w / 2 + 2, g.y - 14, 4, 18);
  }

  drawBlast(ctx, b) {
    const k = b.t / C.BLAST_LIFE, W = C.BLAST_W, H = C.BLAST_H;
    ctx.save();
    ctx.translate(b.x, b.y); ctx.scale(b.dir, 1);
    ctx.globalAlpha = Math.min(1, 2.2 * (1 - k));
    const g = ctx.createRadialGradient(W * 0.55, 0, 4, W * 0.55, 0, W * 0.6);
    g.addColorStop(0, '#fff8d6'); g.addColorStop(0.35, '#ffd43b'); g.addColorStop(0.75, '#ff7b2e'); g.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();           // teardrop: pointed muzzle end, fat leading edge
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(W * 0.2, -H * 0.55, W * 0.7, -H * 0.5);
    ctx.quadraticCurveTo(W * 1.05, 0, W * 0.7, H * 0.5);
    ctx.quadraticCurveTo(W * 0.2, H * 0.55, 0, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3;   // speed streaks
    for (let i = -2; i <= 2; i++) {
      const wob = Math.sin(this.time * 40 + i) * 6;
      ctx.beginPath(); ctx.moveTo(-10 - wob, i * 18); ctx.lineTo(W * 0.35, i * 14); ctx.stroke();
    }
    ctx.restore();
  }

  drawHeroCard(ctx, hero, x, y, active) {
    const cfg = hero.cfg, hearts = hero.maxHp / 2;
    const w = 52 + hearts * 23 + 8, h = 44;
    const base = hero.dead ? 0.4 : active ? 1 : 0.7;
    ctx.save();
    ctx.globalAlpha = base;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = active ? cfg.color : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = active ? 3 : 1.5;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.stroke();
    // portrait: head crop of the idle frame
    const img = frameImg(hero.id, 'idle_0');
    if (img) ctx.drawImage(img, 0, 0, img.width, img.height * 0.5, x + 6, y + 6, 40, 32);
    ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.font = 'bold 12px monospace'; ctx.fillStyle = cfg.color;
    ctx.fillText(cfg.name, x + 52, y + 5);
    if (hero.dead) {
      ctx.fillStyle = '#ff8787'; ctx.font = 'bold 14px monospace';
      ctx.fillText('DOWN', x + 52, y + 21);
    } else {
      ctx.font = '17px serif';
      for (let i = 0; i < hearts; i++) {
        const full = hero.hp >= (i + 1) * 2, half = hero.hp === i * 2 + 1;
        ctx.globalAlpha = base * (full || half ? 1 : 0.22);
        ctx.fillText(half ? '💔' : '❤️', x + 52 + i * 23, y + 21);
      }
    }
    ctx.restore();
    if (!active && !hero.dead) {
      ctx.save();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillText('[TAB] swap', x + w + 8, y + h / 2);
      ctx.restore();
    }
  }

  drawHUD(ctx) {
    const pl = this.player, team = this.team;
    ctx.save();
    CHAR_IDS.forEach((id, i) => this.drawHeroCard(ctx, this.squad[id], 14, 10 + i * 52, pl.id === id));

    // smoothie meter (shared; the active hero decides what it fires)
    const need = this.smoothieNeed;
    const mw = 220, mx = 20, my = 124;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.roundRect(mx - 4, my - 4, mw + 8, 26, 8); ctx.fill();
    const k = team.fruits / need;
    const grad = ctx.createLinearGradient(mx, 0, mx + mw, 0);
    grad.addColorStop(0, '#ff6b9d'); grad.addColorStop(1, '#c084fc');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.roundRect(mx, my, mw * k, 18, 6); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(mx, my, mw, 18, 6); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const ready = team.fruits >= need;
    const specialName = pl.cfg.special === 'blast' ? 'BLAST SHOT' : 'BURP BLAST';
    ctx.fillText(ready ? `SMOOTHIE READY! [E] ${specialName}` : `FRUIT ${team.fruits}/${need}`, mx + mw + 12, my + 9);
    if (ready && Math.floor(this.time * 3) % 2 === 0) {
      ctx.strokeStyle = '#aaff78'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(mx - 4, my - 4, mw + 8, 26, 8); ctx.stroke();
    }

    // round + score
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText(String(this.run.score + team.score).padStart(6, '0'), C.CANVAS_W - 20, 18);
    ctx.font = 'bold 14px monospace'; ctx.fillStyle = '#ffd1dc';
    ctx.fillText(`ROUND ${this.round}`, C.CANVAS_W - 20, 44);

    // active power-ups
    let px = C.CANVAS_W - 20, py = 68;
    ctx.font = '13px monospace';
    const tag = (label, color) => {
      ctx.fillStyle = color; ctx.textAlign = 'right';
      ctx.fillText(label, px, py); py += 18;
    };
    if (team.power.protein > 0) tag(`PROTEIN x2 ${team.power.protein.toFixed(0)}s`, '#ff8787');
    if (team.power.sneakers > 0) tag(`SNEAKERS ${team.power.sneakers.toFixed(0)}s`, '#66d9ff');
    if (team.power.shield) tag('SUNSCREEN SHIELD', '#ffd43b');

    // toast (round start, swaps)
    if (this.toast.t > 0) {
      ctx.globalAlpha = Math.min(1, this.toast.t * 2.5);
      ctx.font = 'bold 28px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(this.toast.text, C.CANVAS_W / 2 + 2, 82);
      ctx.fillStyle = this.toast.color; ctx.fillText(this.toast.text, C.CANVAS_W / 2, 80);
      ctx.globalAlpha = 1;
    }

    // hurt vignette
    if (pl.hurtFlash > 0) {
      ctx.fillStyle = `rgba(255,0,60,${pl.hurtFlash})`;
      ctx.fillRect(0, 0, C.CANVAS_W, C.CANVAS_H);
    }
    ctx.restore();
  }

  overlayText(ctx, big, small) {
    ctx.save();
    ctx.fillStyle = 'rgba(10,5,25,0.55)';
    ctx.fillRect(0, 0, C.CANVAS_W, C.CANVAS_H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 52px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(big, C.CANVAS_W / 2, C.CANVAS_H / 2 - 20);
    ctx.font = '20px monospace';
    ctx.fillStyle = '#ffd1dc';
    ctx.fillText(small, C.CANVAS_W / 2, C.CANVAS_H / 2 + 30);
    ctx.restore();
  }
}
