import { VIEW_W, VIEW_H } from './constants.js';

/** Keyboard codes for each action. */
const BINDINGS = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['KeyW', 'ArrowUp'],
  interact: ['Space'],
  dismount: ['KeyV'],
  bow: ['KeyB'],
  switch: ['KeyQ'],
  ability1: ['Digit1', 'Numpad1'],
  ability2: ['Digit2', 'Numpad2'],
  ability3: ['Digit3', 'Numpad3'],
  potion: ['Digit4', 'Numpad4'], // drink a Potion of Rage
  cancel: ['Escape'],
  skip: ['Digit8', 'Numpad8'], // easter egg: ride straight on to the next Stage
};

const PREVENT = new Set(['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

/**
 * Keyboard + mouse input in game terms.
 * - isDown(action) / wasPressed(action) for 'left' | 'right' | 'jump' | 'interact' | 'dismount' | 'bow' | 'switch' |
 *   'ability1' | 'ability2' | 'ability3' | 'potion' | 'cancel' | 'skip'
 * - wasClicked() — a left click happened since the last update tick;
 *   consumeClick() lets a slice (e.g. Dialogue) swallow it so later slices see no click.
 * - isMouseDown() — the left button is held; wasReleased() — it went up since the last tick
 *   (the bow's click-drag-release aim).
 * - mouse {x, y} in internal (320×180) pixels.
 * - endFrame() is called by the game at the end of every fixed update tick.
 * @param {HTMLCanvasElement} canvas
 */
export function createInput(canvas) {
  const down = new Set(); // key codes held
  const pressed = new Set(); // actions pressed since last endFrame
  let clicked = false;
  let mouseHeld = false;
  let released = false;
  const mouse = { x: -1, y: -1 };

  const actionOf = (code) => Object.keys(BINDINGS).find((a) => BINDINGS[a].includes(code));

  window.addEventListener('keydown', (e) => {
    if (PREVENT.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    down.add(e.code);
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
  window.addEventListener('mousemove', toInternal);
  window.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    toInternal(e);
    clicked = true;
    mouseHeld = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button !== 0) return;
    toInternal(e);
    if (mouseHeld) released = true;
    mouseHeld = false;
  });

  return {
    mouse,
    isDown: (action) => BINDINGS[action].some((c) => down.has(c)),
    wasPressed: (action) => pressed.has(action),
    wasClicked: () => clicked,
    isMouseDown: () => mouseHeld,
    wasReleased: () => released,
    consumeClick() {
      clicked = false;
    },
    endFrame() {
      pressed.clear();
      clicked = false;
      released = false;
    },
  };
}
