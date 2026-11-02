import { VIEW_W, VIEW_H } from './constants.js';

/** Keyboard codes for each action. */
const BINDINGS = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['KeyW', 'ArrowUp'],
  interact: ['Space'],
  bow: ['KeyB'],
  switch: ['KeyQ'],
  ability1: ['Digit1', 'Numpad1'],
  ability2: ['Digit2', 'Numpad2'],
  ability3: ['Digit3', 'Numpad3'],
  potion: ['Digit4', 'Numpad4'], // drink a Potion of Rage
  mercy: ['Digit5', 'Numpad5'], // after two deaths to a boss: kill it now
  cancel: ['Escape'],
  skip: ['Digit8', 'Numpad8'], // easter egg: ride straight on to the next Stage
  slayBoss: ['Digit9', 'Numpad9'], // hack: the Dark Lord (and his minions) die on the spot
};

const MODIFIERS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab']);
const PREVENT = new Set(['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

/**
 * Keyboard + mouse input in game terms.
 * - isDown(action) / wasPressed(action) for 'left' | 'right' | 'jump' | 'interact' | 'bow' | 'switch' |
 *   'ability1' | 'ability2' | 'ability3' | 'potion' | 'mercy' | 'cancel' | 'skip' | 'slayBoss'
 * - wasClicked() — a left click happened since the last update tick;
 *   consumeClick() lets a slice (e.g. Dialogue) swallow it so later slices see no click.
 * - wasAnyKey() — any key (not a lone modifier) or touch button was pressed since the last tick;
 *   consumeKeys() swallows those presses so no action fires from them this tick.
 * - isMouseDown() — the left button is held; wasReleased() — it went up since the last tick
 *   (the bow's click-drag-release aim).
 * - mouse {x, y} in internal (320×180) pixels.
 * - endFrame() is called by the game at the end of every fixed update tick.
 * @param {HTMLCanvasElement} canvas
 */
export function createInput(canvas) {
  const down = new Set(); // key codes held
  const virtual = new Set(); // actions held by on-screen touch buttons
  let lastTouch = -1e9; // ignore emulated mouse events right after a touch
  const pressed = new Set(); // actions pressed since last endFrame
  let clicked = false;
  let anyKey = false;
  let mouseHeld = false;
  let released = false;
  const mouse = { x: -1, y: -1 };

  const actionOf = (code) => Object.keys(BINDINGS).find((a) => BINDINGS[a].includes(code));

  window.addEventListener('keydown', (e) => {
    if (PREVENT.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    down.add(e.code);
    if (!MODIFIERS.has(e.key)) anyKey = true;
    const action = actionOf(e.code);
    if (action) pressed.add(action);
  });
  window.addEventListener('keyup', (e) => {
    if (PREVENT.has(e.code)) e.preventDefault();
    down.delete(e.code);
  });
  window.addEventListener('blur', () => {
    down.clear();
    if (mouseHeld) released = true;
    mouseHeld = false;
  });

  function toInternal(e) {
    const r = canvas.getBoundingClientRect();
    mouse.x = Math.floor(((e.clientX - r.left) / r.width) * VIEW_W);
    mouse.y = Math.floor(((e.clientY - r.top) / r.height) * VIEW_H);
  }
  const emulated = () => performance.now() - lastTouch < 600;
  window.addEventListener('mousemove', (e) => {
    if (!emulated()) toInternal(e);
  });
  window.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || emulated()) return;
    toInternal(e);
    clicked = true;
    mouseHeld = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button !== 0 || emulated()) return;
    toInternal(e);
    if (mouseHeld) released = true;
    mouseHeld = false;
  });

  // A finger on the game canvas acts as the mouse (taps, bow click-drag-release, Arrow Storm).
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    lastTouch = performance.now();
    e.preventDefault();
    toInternal(e);
    clicked = true;
    mouseHeld = true;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch') return;
    lastTouch = performance.now();
    toInternal(e);
  });
  const touchUp = (e) => {
    if (e.pointerType !== 'touch') return;
    lastTouch = performance.now();
    toInternal(e);
    if (mouseHeld) released = true;
    mouseHeld = false;
  };
  canvas.addEventListener('pointerup', touchUp);
  canvas.addEventListener('pointercancel', touchUp);

  return {
    mouse,
    /** On-screen buttons: hold / release an action as if its key were held. */
    pressVirtual(action) {
      if (!virtual.has(action)) {
        pressed.add(action);
        anyKey = true;
      }
      virtual.add(action);
    },
    releaseVirtual(action) {
      virtual.delete(action);
    },
    isDown: (action) => virtual.has(action) || BINDINGS[action].some((c) => down.has(c)),
    wasPressed: (action) => pressed.has(action),
    wasClicked: () => clicked,
    isMouseDown: () => mouseHeld,
    wasReleased: () => released,
    consumeClick() {
      clicked = false;
    },
    wasAnyKey: () => anyKey,
    consumeKeys() {
      pressed.clear();
      anyKey = false;
    },
    endFrame() {
      pressed.clear();
      anyKey = false;
      clicked = false;
      released = false;
    },
  };
}
