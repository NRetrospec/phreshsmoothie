// AABB physics vs solid tiles and one-way platforms.
export function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// body: {x,y,w,h,vx,vy,onGround,dropTimer}
// solids: [{x,y,w,h}], oneways: [{x,y,w,h}]
export function moveAndCollide(body, dt, solids, oneways) {
  body.onGround = false;

  // horizontal
  body.x += body.vx * dt;
  for (const s of solids) {
    if (!aabb(body, s)) continue;
    if (body.vx > 0) body.x = s.x - body.w;
    else if (body.vx < 0) body.x = s.x + s.w;
    body.vx = 0;
  }

  // vertical
  const prevBottom = body.y + body.h;
  body.y += body.vy * dt;
  for (const s of solids) {
    if (!aabb(body, s)) continue;
    if (body.vy > 0) { body.y = s.y - body.h; body.vy = 0; body.onGround = true; }
    else if (body.vy < 0) { body.y = s.y + s.h; body.vy = 0; }
  }
  if (body.vy >= 0 && (body.dropTimer || 0) <= 0) {
    const tol = Math.max(8, body.vy * dt + 1);
    for (const p of oneways) {
      if (body.x + body.w <= p.x || body.x >= p.x + p.w) continue;
      const bottom = body.y + body.h;
      if (prevBottom <= p.y + tol && bottom >= p.y && bottom <= p.y + p.h + tol) {
        body.y = p.y - body.h; body.vy = 0; body.onGround = true;
      }
    }
  }
  if (body.dropTimer > 0) body.dropTimer -= dt;
}
