// On-screen gamepad for phones (touch devices in landscape): action buttons bottom-left,
// D-pad bottom-right. Buttons feed the same actions as the keyboard through input.pressVirtual().
const NUMBERS = [
  // [label, action, css class] — top-left, over the ability bar
  ['1', 'ability1', 'sm'],
  ['2', 'ability2', 'sm'],
  ['3', 'ability3', 'sm'],
  ['4', 'potion', 'sm'],
];
const ACTIONS = [
  ['Q', 'switch', ''],
  ['V', 'dismount', ''],
  ['B', 'bow', ''],
  ['SPACE', 'interact', 'space'],
];
const DPAD = [
  ['▲', 'jump', 'up'],
  ['◀', 'left', 'left'],
  ['▶', 'right', 'right'],
];

/** @param {{ pressVirtual(a:string):void, releaseVirtual(a:string):void }} input */
export function createTouchControls(input) {
  const touch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  if (!touch) return;
  document.body.classList.add('touch');

  const make = (parent, label, action, cls) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `tbtn ${cls}`;
    b.textContent = label;
    const down = new Set();
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      down.add(e.pointerId);
      b.classList.add('on');
      input.pressVirtual(action);
    });
    const up = (e) => {
      down.delete(e.pointerId);
      if (down.size) return;
      b.classList.remove('on');
      input.releaseVirtual(action);
    };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    parent.appendChild(b);
  };

  const actions = document.createElement('div');
  actions.className = 'pad actions';
  ACTIONS.forEach(([l, a, c]) => make(actions, l, a, c));
  const numbers = document.createElement('div');
  numbers.className = 'pad numbers';
  NUMBERS.forEach(([l, a, c]) => make(numbers, l, a, c));
  const dpad = document.createElement('div');
  dpad.className = 'pad dpad';
  DPAD.forEach(([l, a, c]) => make(dpad, l, a, c));
  document.body.append(actions, numbers, dpad);

  // Tell portrait players to turn the phone.
  const rotate = document.createElement('div');
  rotate.className = 'rotate';
  rotate.textContent = 'Rotate your phone to landscape ⟳';
  document.body.appendChild(rotate);

  // Fullscreen on first touch where supported (hides the browser bars).
  const el = document.documentElement;
  if (el.requestFullscreen) {
    window.addEventListener(
      'pointerdown',
      () => {
        if (!document.fullscreenElement) el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
        screen.orientation?.lock?.('landscape').catch(() => {});
      },
      { once: true },
    );
  }
}
