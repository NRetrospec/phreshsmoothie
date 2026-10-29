// Keyboard + mouse + gamepad input with pressed-this-frame edge detection.
// Gamepads (wired or Bluetooth-paired at the OS level) arrive via the browser
// Gamepad API and feed the same action names as the keyboard.
const down = new Set();
const pressed = new Set();
const padDown = new Set();
export const mouse = { x: 0, y: 0, clicked: false };
export const pad = { connected: false, name: '', toast: '', toastT: 0 };

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

// Standard-mapping button index -> actions (Xbox naming; PS/Switch pads use the same slots).
const PADMAP = {
  0: ['jump', 'confirm', 'pick1'],   // A / Cross
  1: ['roll', 'pick2'],              // B / Circle
  2: ['shoot', 'pick3'],             // X / Square
  3: ['dash'],                       // Y / Triangle
  4: ['swap'],                       // LB
  5: ['drink'],                      // RB
  6: ['dash'],                       // LT
  7: ['shoot'],                      // RT
  8: ['swap'],                       // Back / Select
  9: ['pause'],                      // Start
  12: ['up'], 13: ['down'], 14: ['left'], 15: ['right'],
};
const DEADZONE = 0.35;  // stick must pass this to count as a direction
const RUN_ZONE = 0.8;   // light tilt walks (like holding SHIFT), full tilt runs

function setToast(msg) { pad.toast = msg; pad.toastT = 3; }

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

  addEventListener('gamepadconnected', e => {
    pad.connected = true;
    pad.name = e.gamepad.id.replace(/\s*\(.*$/, '').slice(0, 40);
    setToast(`Controller connected: ${pad.name}`);
  });
  addEventListener('gamepaddisconnected', () => {
    const any = [...(navigator.getGamepads?.() || [])].some(g => g && g.connected);
    pad.connected = any;
    if (!any) { padDown.clear(); setToast('Controller disconnected'); }
  });
}

// Call once per frame, before scenes update.
export function pollGamepads(dt = 0) {
  if (pad.toastT > 0) pad.toastT -= dt;
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const now = new Set();
  for (const g of pads) {
    if (!g || !g.connected) continue;
    for (const [i, actions] of Object.entries(PADMAP)) {
      const b = g.buttons[i];
      if (b && (b.pressed || b.value > 0.5)) actions.forEach(a => now.add(a));
    }
    const x = g.axes[0] || 0, y = g.axes[1] || 0;
    if (x < -DEADZONE) now.add('left');
    if (x > DEADZONE) now.add('right');
    if (y < -DEADZONE) now.add('up');
    if (y > DEADZONE) now.add('down');
    if (Math.abs(x) > DEADZONE && Math.abs(x) < RUN_ZONE) now.add('runmod');
  }
  for (const a of now) if (!padDown.has(a)) pressed.add(a);
  padDown.clear();
  for (const a of now) padDown.add(a);
}

export const isDown = a => down.has(a) || padDown.has(a);
export const wasPressed = a => pressed.has(a);
export function endFrame() { pressed.clear(); mouse.clicked = false; }
