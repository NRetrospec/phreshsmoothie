// Keyboard + mouse input with pressed-this-frame edge detection.
const down = new Set();
const pressed = new Set();
export const mouse = { x: 0, y: 0, clicked: false };

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  Space: 'jump',
  KeyJ: 'shoot', KeyX: 'shoot',
  KeyK: 'roll', KeyC: 'roll',
  KeyL: 'dash', KeyV: 'dash',
  ShiftLeft: 'runmod', ShiftRight: 'runmod',
  KeyE: 'drink', KeyQ: 'drink',
  Tab: 'swap', KeyR: 'swap',
  Digit1: 'pick1', Digit2: 'pick2', Digit3: 'pick3',
  Enter: 'confirm', Escape: 'pause',
};

export function initInput(canvas) {
  addEventListener('keydown', e => {
    const a = KEYMAP[e.code];
    if (!a) return;
    e.preventDefault();
    if (!down.has(a)) pressed.add(a);
    down.add(a);
  });
  addEventListener('keyup', e => {
    const a = KEYMAP[e.code];
    if (a) down.delete(a);
  });
  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener('mousedown', () => { mouse.clicked = true; });
}

export const isDown = a => down.has(a);
export const wasPressed = a => pressed.has(a);
export function endFrame() { pressed.clear(); mouse.clicked = false; }
