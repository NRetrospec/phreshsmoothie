// Enemies: Banana (flees, must be chased), Raisin (turret, shoots seeds),
// Watermelon Bruiser (level-end mini boss, charges).
import { CONFIG as C } from '../config.js';
import { IMAGES } from '../engine/assets.js';
import { moveAndCollide, aabb } from '../engine/physics.js';

let nextId = 1;
const EASY = { hp: 1, speed: 1, fireRate: 1, touch: 1 };  // round 1

class Enemy {
  constructor(x, y, w, h, diff = EASY) {
    this.id = nextId++;
    this.diff = diff;
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0; this.onGround = false;
    this.dead = false; this.frozen = 0; this.hitFlash = 0; this.t = Math.random() * 10;
    this.facing = 1;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  baseUpdate(dt, game) {
    this.t += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.frozen > 0) { this.frozen -= dt; this.vx = 0; }
    this.vy = Math.min(this.vy + C.GRAVITY * dt, C.MAX_FALL);
    moveAndCollide(this, dt, game.solids, game.oneways);
  }

  takeHit(dmg, game) {
    this.hp -= dmg;
    this.hitFlash = 0.12;
    if (this.hp <= 0 && !this.dead) {
      this.dead = true;
      game.onEnemyKilled(this);
    }
  }

  drawSprite(ctx, key, flip) {
    const img = IMAGES[key];
    if (!img) return false;
    ctx.save();
    if (this.hitFlash > 0) ctx.filter = 'brightness(2.5)';
    if (this.frozen > 0) ctx.filter = 'saturate(0.2) brightness(1.4) hue-rotate(160deg)';
    const scale = this.h / img.height;
    const w = img.width * scale;
    if (flip) {
      ctx.translate(this.cx, 0); ctx.scale(-1, 1);
      ctx.drawImage(img, -w / 2, this.y, w, this.h);
    } else {
      ctx.drawImage(img, this.cx - w / 2, this.y, w, this.h);
    }
    ctx.restore();
    return true;
  }
}

export class Banana extends Enemy {
  constructor(x, y, diff) {
    super(x, y, 34, 62, diff);
    this.hp = Math.ceil(C.BANANA_HP * this.diff.hp);
    this.type = 'banana';
    this.panic = 0;
  }
  update(dt, game) {
    if (this.frozen <= 0) {
      const p = game.player;
      const dx = p.feetX - this.cx;
      const near = Math.abs(dx) < C.BANANA_SIGHT && Math.abs(p.feetY - (this.y + this.h)) < 140;
      if (near) this.panic = 1.2;
      if (this.panic > 0) {
        this.panic -= dt;
        this.vx = -Math.sign(dx || 1) * C.BANANA_FLEE_SPEED * this.diff.speed; // run AWAY
        // hop over obstacles / randomly while panicking
        if (this.onGround && Math.random() < 0.02) this.vy = -560;
      } else {
        // lazy wander
        if (Math.floor(this.t) % 4 === 0) this.vx = (Math.sin(this.t * 0.7) > 0 ? C.BANANA_WANDER_SPEED : -C.BANANA_WANDER_SPEED) * this.diff.speed;
        else this.vx = 0;
      }
      // don't run off level edges
      if (this.x < 20) { this.x = 20; this.vx = Math.abs(this.vx); }
      if (this.x + this.w > game.level.w - 20) this.vx = -Math.abs(this.vx);
      if (this.vx !== 0) this.facing = Math.sign(this.vx);
    }
    this.baseUpdate(dt, game);
  }
  draw(ctx) {
    const fi = Math.floor(this.t * 10) % 4;
    if (this.drawSprite(ctx, 'e_banana_run_' + fi, this.facing < 0)) return;
    // placeholder
    ctx.save();
    if (this.frozen > 0) ctx.globalAlpha = 0.6;
    ctx.fillStyle = this.hitFlash > 0 ? '#fff' : '#ffe135';
    ctx.strokeStyle = '#7a6520'; ctx.lineWidth = 3;
    ctx.beginPath();
    const bend = Math.sin(this.t * 12) * 3;
    ctx.ellipse(this.cx, this.cy + bend, this.w / 2, this.h / 2, this.facing * 0.35, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(this.cx + this.facing * 6, this.cy - 12, 3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(this.cx - this.facing * 4, this.cy - 12, 3, 0, 7); ctx.fill();
    ctx.restore();
  }
}

export class Raisin extends Enemy {
  constructor(x, y, diff) {
    super(x, y, 40, 44, diff);
    this.hp = Math.ceil(C.RAISIN_HP * this.diff.hp);
    this.type = 'raisin';
    this.cd = Math.random() * C.RAISIN_FIRE_COOLDOWN / this.diff.fireRate;
    this.shootPose = 0;
  }
  update(dt, game) {
    if (this.shootPose > 0) this.shootPose -= dt;
    if (this.frozen <= 0) {
      const p = game.player;
      const dx = p.cx !== undefined ? p.cx - this.cx : p.feetX - this.cx;
      this.facing = Math.sign(dx || 1);
      this.cd -= dt;
      const dist = Math.hypot(p.feetX - this.cx, p.feetY - this.cy);
      if (this.cd <= 0 && dist < C.RAISIN_RANGE) {
        this.cd = C.RAISIN_FIRE_COOLDOWN / this.diff.fireRate;
        this.shootPose = 0.3;
        // lob a seed at the player
        const t = 0.75;
        const vx = (p.feetX - this.cx) / t;
        const vy = (p.y + 20 - this.cy) / t - 0.5 * C.SEED_GRAVITY * t;
        game.spawnSeed(this.cx, this.cy - 8, vx * 0.9, vy);
      }
    }
    this.vx = 0;
    this.baseUpdate(dt, game);
  }
  draw(ctx) {
    const key = this.shootPose > 0 ? 'e_raisin_shoot' : 'e_raisin_' + (Math.floor(this.t * 4) % 2);
    if (this.drawSprite(ctx, key, this.facing < 0)) return;
    ctx.save();
    const squish = 1 + Math.sin(this.t * 6) * 0.06;
    ctx.fillStyle = this.hitFlash > 0 ? '#fff' : '#5b3a6e';
    ctx.strokeStyle = '#2e1d38'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(this.cx, this.y + this.h - (this.h / 2) * squish, this.w / 2, (this.h / 2) * squish, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffdd55';
    ctx.beginPath(); ctx.arc(this.cx + this.facing * 8, this.cy - 6, 4, 0, 7); ctx.fill();
    ctx.restore();
  }
}

export class Melon extends Enemy {
  constructor(x, y, diff) {
    super(x, y, 86, 76, diff);
    this.hp = Math.ceil(C.MELON_HP * this.diff.hp);
    this.type = 'melon';
    this.state = 'pace'; this.stateT = 0;
  }
  update(dt, game) {
    this.stateT += dt;
    if (this.frozen <= 0) {
      const p = game.player;
      const dx = p.feetX - this.cx;
      if (this.state === 'pace') {
        this.vx = Math.sign(Math.sin(this.t * 0.8)) * C.MELON_SPEED * this.diff.speed;
        if (Math.abs(dx) < 380 && this.stateT > 1.4) { this.state = 'windup'; this.stateT = 0; this.vx = 0; this.facing = Math.sign(dx || 1); }
      } else if (this.state === 'windup') {
        this.vx = 0;
        if (this.stateT > 0.5) { this.state = 'charge'; this.stateT = 0; }
      } else if (this.state === 'charge') {
        this.vx = this.facing * C.MELON_CHARGE_SPEED * this.diff.speed;
        if (this.stateT > 1.0) { this.state = 'pace'; this.stateT = 0; }
      }
      if (this.vx !== 0 && this.state !== 'windup') this.facing = Math.sign(this.vx);
      if (this.x < 20) { this.x = 20; this.state = 'pace'; }
      if (this.x + this.w > game.level.w - 20) { this.x = game.level.w - 20 - this.w; this.state = 'pace'; }
    }
    this.baseUpdate(dt, game);
  }
  draw(ctx) {
    const key = 'e_melon_' + (this.state === 'charge' ? 1 : 0);
    if (this.drawSprite(ctx, key, this.facing < 0)) return;
    ctx.save();
    const shake = this.state === 'windup' ? Math.sin(this.t * 60) * 3 : 0;
    ctx.fillStyle = this.hitFlash > 0 ? '#fff' : '#2f9e44';
    ctx.strokeStyle = '#1b5e2a'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(this.cx + shake, this.cy, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#175226'; ctx.lineWidth = 5;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(this.cx + shake + i * 14, this.y + 6);
      ctx.quadraticCurveTo(this.cx + shake + i * 20, this.cy, this.cx + shake + i * 14, this.y + this.h - 6);
      ctx.stroke();
    }
    ctx.fillStyle = '#e03131';
    ctx.beginPath(); ctx.arc(this.cx + shake + this.facing * 14, this.cy - 10, 6, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(this.cx + shake - this.facing * 6, this.cy - 10, 6, 0, 7); ctx.fill();
    ctx.restore();
  }
}

export { aabb };
