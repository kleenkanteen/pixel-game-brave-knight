// Clicking (tapping) an ability's box in the top-left bar works like its key: 1 and 2 start
// aiming (a second click cancels), 3 casts Blessed Touch; the click is never also a Strike.
const W = '__game.current.world';
const K = `${W}.knight`;
const A = `${W}.abilities`;
const B = `${W}.battle`;
const state = `JSON.stringify({aiming: ${A}.aiming, blessT: +${B}.blessT.toFixed(2), strike: ${K}.strikeT > 0})`;

export default [
  { wait: 800, eval: `(Object.assign(__game.carry, {horse: 'following', sword: true, bow: true, weapon: 'sword', abilities: 3}), __game.goTo('stage-4'), 'ok')` },
  { until: `!${K}.autoWalk`, timeout: 6000, wait: 4500 },
  { label: 'click box 1: aim lightning', click: [13, 13], wait: 100 },
  { eval: `${A}.aiming === 'lightning' && ${K}.strikeT <= 0 ? 'ok' : 'FAIL ' + ${state}` },
  { label: 'click box 2: aim storm', click: [34, 13], wait: 100 },
  { eval: `${A}.aiming === 'storm' ? 'ok' : 'FAIL ' + ${state}`, shot: 'ac-01-storm-aim' },
  { label: 'click box 2 again: cancel', click: [34, 13], wait: 100 },
  { eval: `${A}.aiming === null ? 'ok' : 'FAIL ' + ${state}` },
  { label: 'click box 3: blessed touch', click: [55, 13], wait: 100 },
  { eval: `${B}.blessT > 0 && ${K}.strikeT <= 0 ? 'ok' : 'FAIL ' + ${state}`, shot: 'ac-02-blessed' },
  { label: 'gap between boxes: a Strike', click: [24, 13], wait: 30 },
  { eval: `${A}.aiming === null ? 'ok' : 'FAIL ' + ${state}` },
  { label: 'plaza (zoomed out)', eval: `(Object.assign(__game.carry, {checkpoint: 'plaza'}), __game.goTo('stage-5'), 'ok')`, wait: 1500 },
  { click: [13, 13], wait: 100 },
  { eval: `${A}.aiming === 'lightning' ? 'ok' : 'FAIL ' + ${state}` },
  { click: [160, 120], wait: 100 },
  { eval: `${A}.aiming === null ? 'ok (cast)' : 'FAIL ' + ${state}`, shot: 'ac-03-plaza-lightning' },
];
