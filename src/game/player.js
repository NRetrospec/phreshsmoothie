// Player controller: walk/run/jump/roll/dash/shoot with coyote time,
// jump buffering, jump-cut, apex float. Fluid by design.
// One class, two heroes: C.CHARACTERS[id] decides weapon + special. The squad
// shares the smoothie meter / score / power-ups (`team`); hp is per hero.
import { CONFIG as C } from '../config.js';
import { Animator } from '../engine/animator.js';
import { moveAndCollide } from '../engine/physics.js';
import { isDown, wasPressed } from '../engine/input.js';
import { maxHpOf } from './run.js';

export class Player {
  constructor(id, x, y, run, team) {
    this.id = id;
    this.cfg = C.CHARACTERS[id];
    this.run = run;       // perk modifiers
    this.team = team;     // shared { fruits, score, power }
    this.x = x; this.y = y;
    this.w = C.PLAYER_W; this.h = C.PLAYER_H;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    this.coyote = 0; this.jumpBuf = 0; this.dropTimer = 0;
    this.dashT = 0; this.dashCd = 0;
    this.rollT = 0; this.rollCd = 0;
    this.shootCd = 0;
    this.maxHp = maxHpOf(run, id);
    this.hp = Math.min(run.hp[id], this.maxHp);
    this.invuln = 0;
    this.hurtFlash = 0;
    this.wasAirborne = false;
    this.anim = new Animator(id);
    this.power = team.power;
    this.dead = this.hp <= 0;
  }

  get rolling() { return this.rollT > 0; }
  get dashing() { return this.dashT > 0; }
  get feetX() { return this.x + this.w / 2; }
  get feetY() { return this.y + this.h; }

  update(dt, game) {
    const spdMult = (this.power.sneakers > 0 ? 1.35 : 1) * this.run.mods.speed;
    for (const k of ['protein', 'sneakers']) if (this.power[k] > 0) this.power[k] -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.rollCd > 0) this.rollCd -= dt;
    if (this.shootCd > 0) this.shootCd -= dt;

    const left = isDown('left'), right = isDown('right');
    const move = (right ? 1 : 0) - (left ? 1 : 0);
    if (move !== 0 && !this.rolling && !this.dashing) this.facing = move;

    // --- dash ---
    if (wasPressed('dash') && this.dashCd <= 0 && !this.rolling) {
      this.dashT = C.DASH_TIME; this.dashCd = C.DASH_COOLDOWN;
      this.anim.play('dash', true);
      game.fx.dashBurst(this.feetX, this.y + this.h / 2, this.facing);
    }
    // --- roll (i-frames) ---
    if (wasPressed('roll') && this.rollCd <= 0 && this.onGround && !this.dashing) {
      this.rollT = C.ROLL_TIME; this.rollCd = C.ROLL_TIME + C.ROLL_COOLDOWN;
      this.anim.play('roll', true);
    }

    // --- horizontal velocity ---
    if (this.dashing) {
      this.dashT -= dt;
      this.vx = C.DASH_SPEED * this.facing;
      this.vy = 0; // dash hovers
    } else if (this.rolling) {
      this.rollT -= dt;
      this.vx = C.ROLL_SPEED * this.facing;
    } else {
      const target = move * (isDown('runmod') ? C.WALK_SPEED : C.RUN_SPEED) * spdMult;
      const accel = this.onGround ? C.ACCEL_GROUND : C.ACCEL_AIR;
      if (move !== 0) {
        this.vx += Math.sign(target - this.vx) * accel * dt;
        if (Math.abs(this.vx - target) < accel * dt) this.vx = target;
      } else if (this.onGround) {
        const f = C.FRICTION_GROUND * dt;
        this.vx = Math.abs(this.vx) <= f ? 0 : this.vx - Math.sign(this.vx) * f;
      }
    }

    // --- jump: buffer + coyote ---
    this.coyote = this.onGround ? C.COYOTE_TIME : this.coyote - dt;
    this.jumpBuf = wasPressed('jump') ? C.JUMP_BUFFER : this.jumpBuf - dt;
    if (isDown('down') && wasPressed('jump') && this.onGround) {
      this.dropTimer = 0.18; // drop through one-way platform
      this.jumpBuf = 0;
    } else if (this.jumpBuf > 0 && this.coyote > 0 && !this.rolling) {
      this.vy = -C.JUMP_VELOCITY;
      this.coyote = 0; this.jumpBuf = 0;
      this.anim.play('jump', true);
      game.fx.jumpPuff(this.feetX, this.feetY);
    }
    // jump-cut for variable height
    if (!isDown('jump') && this.vy < -100) this.vy *= (1 - (1 - C.JUMP_CUT_MULT) * dt * 12);

    // --- gravity w/ apex float + fall mult ---
    if (!this.dashing) {
      let g = C.GRAVITY;
      if (Math.abs(this.vy) < C.APEX_THRESHOLD && !this.onGround) g *= C.APEX_GRAVITY_MULT;
      else if (this.vy > 0) g *= C.FALL_GRAVITY_MULT;
      this.vy = Math.min(this.vy + g * dt, C.MAX_FALL);
    }

    // --- shoot ---
    const dmgMult = (this.power.protein > 0 ? 2 : 1) * this.run.mods.damage;
    const muzzleX = this.feetX + this.facing * 26, muzzleY = this.y + this.h * 0.42;
    if (isDown('shoot') && this.shootCd <= 0 && !this.rolling && !this.dashing) {
      this.shootCd = this.cfg.shootCd * this.run.mods.fireRate;
      this.anim.play('shoot', true);
      if (this.id === 'que') {
        // shotgun: a fan of short-lived pellets, kick back a little
        const n = this.cfg.pellets;
        for (let i = 0; i < n; i++) {
          const a = (i / (n - 1) - 0.5) * 2 * this.cfg.spread + (Math.random() - 0.5) * 0.06;
          const sp = this.cfg.pelletSpeed * (0.92 + Math.random() * 0.16);
          game.spawnBullet(muzzleX, muzzleY, Math.cos(a) * sp * this.facing, this.cfg.pelletDamage * dmgMult,
                           { vy: Math.sin(a) * sp, life: this.cfg.pelletLife, r: 4 });
        }
        game.fx.hit(muzzleX + this.facing * 10, muzzleY, '#ffb347');
        if (!this.dashing) this.vx -= this.facing * this.cfg.recoil;
        game.shake(3, 0.1);
      } else {
        game.spawnBullet(muzzleX, muzzleY, C.BULLET_SPEED * this.facing, C.BULLET_DAMAGE * dmgMult);
      }
    }

    // --- special (spends the shared smoothie meter) ---
    if (wasPressed('drink') && this.team.fruits >= game.smoothieNeed) {
      this.team.fruits = 0;
      if (this.cfg.special === 'blast') {
        this.shootCd = Math.max(this.shootCd, 0.5);
        this.anim.play('shoot', true);
        this.vx -= this.facing * 420;
        game.spawnBlast(muzzleX + this.facing * 10, muzzleY, this.facing, C.BLAST_DAMAGE * this.run.mods.damage);
      } else {
        game.burpBlast(this.feetX, this.y + this.h / 2);
      }
    }

    // --- physics ---
    const wasVy = this.vy;
    this.h = this.rolling ? C.ROLL_H : C.PLAYER_H;
    if (this.rolling) this.y += 0; // top stays, height shrinks from top via draw anchor (feet)
    const bodyY = this.rolling ? this.y + (C.PLAYER_H - C.ROLL_H) : this.y;
    const body = { x: this.x, y: bodyY, w: this.w, h: this.h, vx: this.vx, vy: this.vy,
                   onGround: false, dropTimer: this.dropTimer };
    moveAndCollide(body, dt, game.solids, game.oneways);
    this.x = body.x;
    this.y = this.rolling ? body.y - (C.PLAYER_H - C.ROLL_H) : body.y;
    this.h = C.PLAYER_H;
    this.vx = body.vx; this.vy = body.vy;
    this.onGround = body.onGround;
    this.dropTimer = body.dropTimer;

    // landing
    if (this.onGround && this.wasAirborne && wasVy > 420) {
      this.anim.play('land', true);
      game.fx.landPuff(this.feetX, this.feetY);
    }
    this.wasAirborne = !this.onGround;

    // --- pick animation (unless a 'once' anim is running) ---
    if (this.rolling) this.anim.play('roll');
    else if (this.dashing) this.anim.play('dash');
    else if (!this.onGround) this.anim.play('jump');
    else if (Math.abs(this.vx) > C.WALK_SPEED + 20) this.anim.play('run');
    else if (Math.abs(this.vx) > 10) this.anim.play('walk');
    else this.anim.play('idle');
    this.anim.update(dt);

    // world bounds / death pit
    if (this.y > game.level.h + 200) { this.hp = 0; this.dead = true; } // pits ignore i-frames
  }

  // Take over from `from` mid-action: same spot, same momentum.
  tagIn(from, invuln) {
    this.x = from.x; this.y = from.y; this.vx = from.vx; this.vy = from.vy;
    this.facing = from.facing; this.onGround = from.onGround;
    this.coyote = from.coyote; this.jumpBuf = 0; this.dropTimer = 0;
    this.dashT = 0; this.rollT = 0; this.shootCd = 0.15;
    this.invuln = Math.max(this.invuln, invuln);
    this.anim = new Animator(this.id);
    this.wasAirborne = !from.onGround;
  }

  hurt(dmg, game, fromX) {
    if (this.invuln > 0 || this.rolling || this.dead) return;
    if (this.power.shield) {
      this.power.shield = false;
      this.invuln = 0.8;
      game.fx.shieldPop(this.feetX, this.y + this.h / 2);
      return;
    }
    this.hp -= dmg;
    this.invuln = C.HURT_INVULN;
    this.hurtFlash = 0.25;
    game.shake(6, 0.25);
    if (fromX !== undefined) {
      this.vx = Math.sign(this.feetX - fromX) * C.KNOCKBACK_X;
      this.vy = -C.KNOCKBACK_Y;
    }
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
  }

  draw(ctx) {
    if (this.invuln > 0 && Math.floor(this.invuln * 14) % 2 === 0 && !this.rolling) return;
    this.anim.draw(ctx, this.feetX, this.feetY, this.facing);
  }
}
