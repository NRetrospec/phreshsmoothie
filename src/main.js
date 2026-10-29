// App bootstrap + scene manager + fixed-timestep loop.
import { CONFIG } from './config.js';
import { loadAll } from './engine/assets.js';
import { initInput, endFrame, pollGamepads, pad } from './engine/input.js';
import { GameScene } from './game/scene.js';
import { MenuScene, ComicScene, HowToScene, PerkScene, GameOverScene } from './game/screens.js';
import { newRun, advanceRound, saveBest } from './game/run.js';

window.CONFIG = CONFIG; // live tuning from devtools

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const app = {
  scene: null,
  run: null,                 // roguelite run state (see game/run.js)
  showMenu() { this.scene = new MenuScene(this); },
  startComic() { this.run = newRun(); this.scene = new ComicScene(this); },
  startLevel() { if (!this.run) this.run = newRun(); this.scene = new GameScene(this); },
  showHowTo() { this.scene = new HowToScene(this); },
  showPerks() { this.scene = new PerkScene(this); },
  pickPerk(perk) { advanceRound(this.run, perk); this.startLevel(); },
  endRun() {
    const { record } = saveBest(this.run);
    this.scene = new GameOverScene(this, this.run, record);
  },
  retryRun() { this.run = newRun(); this.startLevel(); },
};
window.app = app; // test hook

initInput(canvas);

let loadProgress = 0;
loadAll(p => { loadProgress = p; }).then(() => {
  app.showMenu();
  window.__gameReady = true;
}).catch(err => {
  console.error(err);
  window.__gameError = String(err);
});

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 1 / 20); // clamp huge dt (tab switch)
  last = now;
  pollGamepads(dt);
  if (app.scene) {
    app.scene.update(dt);
    app.scene.draw(ctx);
  } else {
    // loading screen
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
    ctx.fillStyle = '#ff6b9d';
    ctx.fillRect(280, 262, 400 * loadProgress, 16);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(280, 262, 400, 16);
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('blending...', 480, 300);
  }
  if (pad.toastT > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, pad.toastT);
    ctx.font = '14px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(CONFIG.CANVAS_W - 360, 8, 352, 26);
    ctx.fillStyle = '#7cffb2'; ctx.fillText(pad.toast, CONFIG.CANVAS_W - 16, 14);
    ctx.restore();
  }
  endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
