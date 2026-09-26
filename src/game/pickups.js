// Pickups: fruit chunks (smoothie meter) + power-ups with % drop table.
import { CONFIG as C } from '../config.js';
import { IMAGES } from '../engine/assets.js';
import { moveAndCollide } from '../engine/physics.js';

const COLORS = {
  fruit: '#ff6b9d', protein: '#c0392b', sneakers: '#00c2ff',
  sunscreen: '#ffd43b', icecube: '#a5f3fc',
};
const LABELS = { protein: 'P', sneakers: 'S', sunscreen: '☀', icecube: '❄' };

export class Pickup {
  constructor(type, x, y) {
    this.type = type;
    this.x = x - 14; this.y = y - 14; this.w = 28; this.h = 28;
    this.vx = (Math.random() - 0.5) * 160;
    this.vy = -300 - Math.random() * 120;
    this.t = 0; this.life = 12;
    this.onGround = false;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update(dt, game) {
    this.t += dt; this.life -= dt;
    this.vy = Math.min(this.vy + C.GRAVITY * 0.7 * dt, C.MAX_FALL);
    if (this.onGround) this.vx *= 0.9;
    moveAndCollide(this, dt, game.solids, game.oneways);
  }

  draw(ctx) {
    if (this.life < 3 && Math.floor(this.t * 8) % 2 === 0) return; // expiring blink
    const bob = this.onGround ? Math.sin(this.t * 5) * 3 : 0;
    const img = IMAGES['pu_' + this.type];
    if (img) {
      ctx.drawImage(img, this.x, this.y + bob, this.w, this.h);
      return;
    }
    ctx.save();
    ctx.translate(this.cx, this.cy + bob);
    if (this.type === 'fruit') {
      ctx.rotate(this.t * 2);
      ctx.fillStyle = COLORS.fruit;
      ctx.strokeStyle = '#a63a63'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2f9e44';
      ctx.fillRect(-2, -16, 4, 6);
    } else {
      ctx.fillStyle = COLORS[this.type];
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.roundRect(-13, -13, 26, 26, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#111'; ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(LABELS[this.type] || '?', 0, 1);
    }
    ctx.restore();
  }
}

// Roll the drop table: enemies always drop 1-2 fruit; power-ups by chance.
export function rollDrops(enemy) {
  const drops = [];
  const nFruit = enemy.type === 'melon' ? 5 : 1 + (Math.random() < 0.35 ? 1 : 0);
  for (let i = 0; i < nFruit; i++) drops.push(new Pickup('fruit', enemy.cx, enemy.cy));
  for (const d of C.DROPS) {
    if (Math.random() < d.chance * (enemy.type === 'melon' ? 2.5 : 1)) {
      drops.push(new Pickup(d.type, enemy.cx, enemy.cy));
      break; // max one power-up per kill
    }
  }
  return drops;
}
