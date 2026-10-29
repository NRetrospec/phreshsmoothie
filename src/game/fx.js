// Particles + screen FX. Cheap canvas particles, no allocations per frame beyond spawns.
export class FX {
  constructor() { this.parts = []; }

  spawn(n, fn) { for (let i = 0; i < n; i++) this.parts.push(fn(i)); }

  jumpPuff(x, y) {
    this.spawn(6, () => ({ x: x + (Math.random() - 0.5) * 20, y, vx: (Math.random() - 0.5) * 80, vy: -Math.random() * 40, life: 0.3, t: 0, r: 4 + Math.random() * 3, color: 'rgba(255,255,255,0.7)' }));
  }
  landPuff(x, y) {
    this.spawn(8, () => ({ x: x + (Math.random() - 0.5) * 30, y, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 60, life: 0.35, t: 0, r: 5 + Math.random() * 3, color: 'rgba(255,255,255,0.6)' }));
  }
  dashBurst(x, y, dir) {
    this.spawn(10, () => ({ x, y: y + (Math.random() - 0.5) * 40, vx: -dir * (120 + Math.random() * 160), vy: (Math.random() - 0.5) * 60, life: 0.28, t: 0, r: 4 + Math.random() * 4, color: 'rgba(120,220,255,0.8)' }));
  }
  // tag-team swap poof
  tag(x, y, color) {
    this.spawn(18, () => { const a = Math.random() * Math.PI * 2, sp = 100 + Math.random() * 220; return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4, t: 0, r: 3 + Math.random() * 4, color }; });
  }
  hit(x, y, color = '#fff') {
    this.spawn(8, () => { const a = Math.random() * Math.PI * 2, s = 120 + Math.random() * 180; return { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3, t: 0, r: 3 + Math.random() * 3, color }; });
  }
  splat(x, y, color) {
    this.spawn(16, () => { const a = -Math.PI * Math.random(), s = 150 + Math.random() * 250; return { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.6, t: 0, r: 4 + Math.random() * 5, color, grav: 600 }; });
  }
  shieldPop(x, y) {
    this.spawn(14, () => { const a = Math.random() * Math.PI * 2, s = 200 + Math.random() * 120; return { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4, t: 0, r: 4, color: 'rgba(255,220,80,0.9)' }; });
  }
  burp(x, y, radius) {
    this.spawn(40, () => { const a = Math.random() * Math.PI * 2, s = radius * (1.2 + Math.random() * 1.6); return { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.7, life: 0.55, t: 0, r: 8 + Math.random() * 12, color: 'rgba(170,255,120,0.55)' }; });
  }
  sparkle(x, y, color = 'rgba(255,240,130,0.9)') {
    this.spawn(5, () => ({ x: x + (Math.random() - 0.5) * 24, y: y + (Math.random() - 0.5) * 24, vx: 0, vy: -60 - Math.random() * 40, life: 0.5, t: 0, r: 2 + Math.random() * 2, color }));
  }

  update(dt) {
    for (const p of this.parts) {
      p.t += dt;
      if (p.grav) p.vy += p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    this.parts = this.parts.filter(p => p.t < p.life);
  }

  draw(ctx) {
    for (const p of this.parts) {
      const k = 1 - p.t / p.life;
      ctx.globalAlpha = k;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (0.5 + k * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
