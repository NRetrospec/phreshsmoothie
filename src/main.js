// App bootstrap + scene manager + fixed-timestep loop.
import { CONFIG } from './config.js';
import { loadAll } from './engine/assets.js';
import { initInput, endFrame } from './engine/input.js';
import { GameScene } from './game/scene.js';
import { MenuScene, ComicScene, HowToScene, WinScene } from './game/screens.js';

window.CONFIG = CONFIG; // live tuning from devtools

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const app = {
  scene: null,
  showMenu() { this.scene = new MenuScene(this); },
  startComic() { this.scene = new ComicScene(this); },
  startLevel() { this.scene = new GameScene(this); },
  restartLevel() { this.scene = new GameScene(this); },
  showHowTo() { this.scene = new HowToScene(this); },
  showWin(score, time, kills) { this.scene = new WinScene(this, score, time, kills); },
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
  endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
