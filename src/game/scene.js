// Main gameplay scene: world, camera, projectiles, drops, HUD, win/lose.
import { CONFIG as C } from '../config.js';
import { IMAGES } from '../engine/assets.js';
import { Player } from './player.js';
import { Banana, Raisin, Melon, aabb } from './enemies.js';
import { Pickup, rollDrops } from './pickups.js';
import { buildLevel1 } from './level1.js';
import { FX } from './fx.js';
import { isDown, wasPressed } from '../engine/input.js';

const ENEMY_CLASSES = { banana: Banana, raisin: Raisin, melon: Melon };

export class GameScene {
  constructor(app) {
    this.app = app;
    this.level = buildLevel1();
    this.solids = this.level.solids;
    this.oneways = this.level.oneways;
    this.player = new Player(this.level.playerStart.x, this.level.playerStart.y);
    this.enemies = this.level.enemies.map(e => new ENEMY_CLASSES[e.type](e.x, e.y));
    this.bullets = [];
    this.seeds = [];
    this.pickups = [];
    this.fx = new FX();
    this.cam = { x: 0, y: this.level.h - C.CANVAS_H, shakeT: 0, shakeMag: 0 };
    this.paused = false;
    this.won = false; this.winT = 0;
    this.lostT = 0;
    this.burpT = 0; this.burpX = 0; this.burpY = 0;
    this.frozenGlobal = 0;
    this.time = 0;
    this.kills = 0;
  }

  // ---- API used by player/enemies ----
  spawnBullet(x, y, vx, dmg) {
    this.bullets.push({ x, y, vx, dmg, t: 0 });
  }
  spawnSeed(x, y, vx, vy) {
    this.seeds.push({ x, y, vx, vy, t: 0 });
  }
  shake(mag, t) { this.cam.shakeMag = mag; this.cam.shakeT = t; }

  onEnemyKilled(enemy) {
    this.kills++;
    this.player.score += enemy.type === 'melon' ? 500 : 100;
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
    const pl = this.player;
    if (p.type === 'fruit') {
      pl.fruits = Math.min(pl.fruits + 1, C.SMOOTHIE_MAX);
      pl.score += 25;
      this.fx.sparkle(p.cx, p.cy);
    } else if (p.type === 'protein') pl.power.protein = C.POWERUP_TIME;
    else if (p.type === 'sneakers') pl.power.sneakers = C.POWERUP_TIME;
    else if (p.type === 'sunscreen') pl.power.shield = true;
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

    if (this.player.dead) {
      this.lostT += dt;
      if (this.lostT > 2 || wasPressed('confirm')) this.app.restartLevel();
      this.fx.update(dt);
      return;
    }
    if (this.won) {
      this.winT += dt;
      this.fx.update(dt);
      if (this.winT > 3 || wasPressed('confirm')) this.app.showWin(this.player.score, this.time, this.kills);
      return;
    }

    this.player.update(dt, this);
    for (const e of this.enemies) e.update(dt, this);

    // bullets vs enemies
    for (const b of this.bullets) {
      b.t += dt; b.x += b.vx * dt;
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
    this.bullets = this.bullets.filter(b => b.t < C.BULLET_LIFE);

    // roll damage: rolling through enemies hurts them
    const pl = this.player;
    const pbox = { x: pl.x, y: pl.y, w: pl.w, h: pl.h };
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (aabb(pbox, e)) {
        if (pl.rolling || pl.dashing) e.takeHit(C.ROLL_DAMAGE * dt * 8, this); // dps while overlapping
        else e.frozen <= 0 && pl.hurt(C.ENEMY_TOUCH_DAMAGE, this, e.cx);
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

    this.drawParallax(ctx, cam);

    ctx.save();
    ctx.translate(-Math.round(cam.x + sx), -Math.round(cam.y + sy));

    this.drawWorld(ctx);
    for (const p of this.pickups) p.draw(ctx);
    for (const e of this.enemies) e.draw(ctx);
    this.player.draw(ctx);

    // bullets
    ctx.fillStyle = '#ffd43b';
    for (const b of this.bullets) {
      ctx.beginPath(); ctx.ellipse(b.x, b.y, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
    }
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
    if (this.player.dead) this.overlayText(ctx, 'SQUEEZED OUT!', 'Restarting...');
    if (this.won) this.overlayText(ctx, 'LEVEL BLENDED!', 'Enter to continue');
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

  drawHUD(ctx) {
    const pl = this.player;
    ctx.save();
    // hearts
    for (let i = 0; i < C.PLAYER_MAX_HP / 2; i++) {
      const x = 20 + i * 34, y = 18;
      const full = pl.hp >= (i + 1) * 2, half = pl.hp === i * 2 + 1;
      ctx.font = '26px serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.globalAlpha = full || half ? 1 : 0.25;
      ctx.fillText(half ? '💔' : '❤️', x, y);
    }
    ctx.globalAlpha = 1;

    // smoothie meter
    const mw = 220, mx = 20, my = 62;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.roundRect(mx - 4, my - 4, mw + 8, 26, 8); ctx.fill();
    const k = pl.fruits / C.SMOOTHIE_MAX;
    const grad = ctx.createLinearGradient(mx, 0, mx + mw, 0);
    grad.addColorStop(0, '#ff6b9d'); grad.addColorStop(1, '#c084fc');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.roundRect(mx, my, mw * k, 18, 6); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(mx, my, mw, 18, 6); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const ready = pl.fruits >= C.SMOOTHIE_MAX;
    ctx.fillText(ready ? 'SMOOTHIE READY! [E] BURP BLAST' : `FRUIT ${pl.fruits}/${C.SMOOTHIE_MAX}`, mx + mw + 12, my + 9);
    if (ready && Math.floor(this.time * 3) % 2 === 0) {
      ctx.strokeStyle = '#aaff78'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(mx - 4, my - 4, mw + 8, 26, 8); ctx.stroke();
    }

    // score
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText(String(pl.score).padStart(6, '0'), C.CANVAS_W - 20, 18);

    // active power-ups
    let px = C.CANVAS_W - 20, py = 48;
    ctx.font = '13px monospace';
    const tag = (label, color) => {
      ctx.fillStyle = color; ctx.textAlign = 'right';
      ctx.fillText(label, px, py); py += 18;
    };
    if (pl.power.protein > 0) tag(`PROTEIN x2 ${pl.power.protein.toFixed(0)}s`, '#ff8787');
    if (pl.power.sneakers > 0) tag(`SNEAKERS ${pl.power.sneakers.toFixed(0)}s`, '#66d9ff');
    if (pl.power.shield) tag('SUNSCREEN SHIELD', '#ffd43b');

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
