// Stage 4: the platforms over the ledge, a Lightning Strike down the open mouth, and the Hydra's
// death — swelling head, bloat, explosion, gore on the party, the floating potion, the talk.
const W = '__game.current.world';
const K = `${W}.knight`;
const B = `${W}.battle`;
const H = `${W}.hydra`;
const god = `(${B}.heroes.forEach(h => h.hp = 100), 'ok')`;

export default [
  { wait: 800, eval: `(Object.assign(__game.carry, {horse: 'following', sword: true, bow: true, weapon: 'bow', abilities: 3}), __game.goTo('stage-4'), 'ok')` },
  { until: `!${K}.autoWalk`, timeout: 6000 },
  { eval: `(${B}.monsters.forEach(m => { m.hp = 0; m.dead = true; m.dieT = 9; m.air = 0; }), ${K}.x = 720, 'ok')`, wait: 500 },
  { hold: 'ArrowRight', until: `${H}.state !== 'sleep'`, timeout: 8000, wait: 1200 },
  ...Array.from({ length: 6 }, () => ({ click: [160, 140], wait: 150 })),
  { label: 'up the platforms', eval: `(${god}, ${K}.x = 988, ${K}.y = 106, 'ok')`, wait: 600 },
  { down: 'ArrowUp' },
  { hold: 'ArrowRight', ms: 300 },
  { up: 'ArrowUp', wait: 700 },
  { eval: `JSON.stringify({x: ${K}.x + 8, y: ${K}.y})` },
  { down: 'ArrowUp' },
  { hold: 'ArrowLeft', ms: 420 },
  { up: 'ArrowUp', wait: 900 },
  { eval: `JSON.stringify({x: ${K}.x + 8, y: ${K}.y})`, shot: 'd-01-platforms' },
  { label: 'lightning down the open mouth', eval: `(${god}, ${H}.forceCharge(), 'ok')`, wait: 1500 },
  { eval: `JSON.stringify({hp: ${H}.hp, hit: ${B}.damageArea(${H}.chin.x + 30, ${H}.chin.x + 54, 30, ${H}.chin.x + 42), after: ${H}.hp, charging: ${H}.charging})`, wait: 300, shot: 'd-02-lightning' },
  { label: 'kill it', eval: `(${god}, ${K}.x = 1000, ${K}.y = 106, ${H}.forceDie(1), 'ok')`, wait: 900, shot: 'd-03-head-swell' },
  { shot: 'd-03z-head', zoom: [190, 20, 130, 140], scale: 3 },
  { wait: 1400, shot: 'd-04-bloat' },
  { wait: 800, shot: 'd-05-bloat-b' },
  { until: `${H}.popped`, timeout: 4000, wait: 60, shot: 'd-06-boom' },
  { wait: 400, shot: 'd-07-gore' },
  { until: `${H}.state === 'dead'`, timeout: 5000, wait: 1600, shot: 'd-08-talk' },
  { eval: `JSON.stringify(${B}.heroes.map(h => [h.kind, ${H}.gore.stainsOn(h)]))` },
  { key: 'Space', wait: 1500, shot: 'd-09-talk-mage' },
  { key: 'Space', wait: 1000 },
  { label: 'walk to the potion', hold: 'ArrowRight', ms: 1500, wait: 300, shot: 'd-10-potion' },
  { shot: 'd-10z-potion', zoom: [170, 90, 150, 90], scale: 3 },
];
