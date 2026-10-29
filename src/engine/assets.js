// Asset loader: images + per-character frame manifests.
export const IMAGES = {};
export const CHAR_DIRS = { phresh: 'assets/sprites/player', que: 'assets/sprites/que' };
// FRAMES[charId] = { frames: {name:{w,h,ax,ay}}, anims: {anim:[names]} }
export const FRAMES = {};

function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('failed to load ' + src));
    im.src = src;
  });
}

export async function loadAll(onProgress) {
  const jobs = [];
  const optional = new Set();
  const add = (key, src, opt = false) => {
    if (opt) optional.add(key);
    jobs.push([key, src]);
  };
  for (const [id, dir] of Object.entries(CHAR_DIRS)) {
    FRAMES[id] = await (await fetch(`${dir}/frames.json`)).json();
    for (const n of Object.keys(FRAMES[id].frames)) add(`${id}_${n}`, `${dir}/${n}.png`);
  }

  // UI (shipped with repo)
  add('menu_bg', 'Public/PS MENU.png');
  add('btn_play', 'Public/Eat Phresh Button 3.png');
  add('btn_howto', 'Public/How to button PS.png');
  add('btn_settings', 'Public/setting button.png');

  // Generated art (optional: game falls back to canvas-drawn placeholders)
  add('bg_sky', 'assets/level1/bg_sky.png', true);
  add('bg_city', 'assets/level1/bg_city.png', true);
  add('bg_palms', 'assets/level1/bg_palms.png', true);
  add('tiles', 'assets/level1/tiles.png', true);
  for (const e of ['banana_run_0','banana_run_1','banana_run_2','banana_run_3',
                   'raisin_0','raisin_1','raisin_shoot',
                   'melon_0','melon_1'])
    add('e_' + e, `assets/enemies/${e}.png`, true);
  for (let i = 1; i <= 6; i++) add('comic_' + i, `assets/comic/panel_${i}.png`, true);
  for (const p of ['protein','sneakers','sunscreen','icecube','fruit'])
    add('pu_' + p, `assets/pickups/${p}.png`, true);

  let done = 0;
  await Promise.all(jobs.map(async ([key, src]) => {
    try {
      IMAGES[key] = await loadImage(src);
    } catch (e) {
      if (!optional.has(key)) throw e;
      IMAGES[key] = null; // placeholder path
    }
    done++;
    if (onProgress) onProgress(done / jobs.length);
  }));
}

export function frameImg(id, name) { return IMAGES[`${id}_${name}`]; }
export function frameMeta(id, name) { return FRAMES[id].frames[name]; }
export function animFrames(id, anim) { return FRAMES[id].anims[anim]; }
