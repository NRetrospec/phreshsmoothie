// Priority-layered animation player. Lower priority number interrupts higher.
import { animFrames, frameImg, frameMeta } from './assets.js';

const DEFS = {
  //          fps  mode      priority
  roll:   { fps: 14, mode: 'once', pr: 1 },
  dash:   { fps: 16, mode: 'once', pr: 1 },
  shoot:  { fps: 18, mode: 'once', pr: 2 },
  land:   { fps: 16, mode: 'once', pr: 3 },
  jump:   { fps: 10, mode: 'hold', pr: 4 },
  run:    { fps: 12, mode: 'loop', pr: 6 },
  walk:   { fps: 10, mode: 'loop', pr: 7 },
  idle:   { fps: 5,  mode: 'loop', pr: 8 },
};

export class Animator {
  constructor() { this.anim = 'idle'; this.t = 0; this.doneFlag = false; }

  play(anim, restart = false) {
    if (anim === this.anim && !restart) return;
    const cur = DEFS[this.anim], next = DEFS[anim];
    // a playing 'once' anim blocks lower-priority requests until finished
    if (cur && cur.mode === 'once' && !this.doneFlag && next.pr > cur.pr) return;
    this.anim = anim; this.t = 0; this.doneFlag = false;
  }

  update(dt) {
    const def = DEFS[this.anim];
    const frames = animFrames(this.anim);
    this.t += dt * def.fps;
    const n = frames.length;
    if (def.mode === 'loop') { this.t %= n; }
    else if (this.t >= n) { this.t = n - 0.001; this.doneFlag = true; }
  }

  get done() { return this.doneFlag; }

  frame() {
    const frames = animFrames(this.anim);
    return frames[Math.min(Math.floor(this.t), frames.length - 1)];
  }

  // draw anchored at feet position (x = feet center, y = feet), facing +1/-1
  draw(ctx, x, y, facing) {
    const name = this.frame();
    const img = frameImg(name), m = frameMeta(name);
    if (!img) return;
    ctx.save();
    if (facing < 0) {
      ctx.translate(x, 0); ctx.scale(-1, 1);
      ctx.drawImage(img, -(m.w - m.ax), y - m.ay);
    } else {
      ctx.drawImage(img, x - m.ax, y - m.ay);
    }
    ctx.restore();
  }
}
