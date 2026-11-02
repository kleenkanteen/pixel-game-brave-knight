// Stage 4 → 5 and Stage 5's edges: leaving the Hydra's chamber once it's dead and the potion is
// picked up; riding up to the second gate (he must get off: the horse waits outside); falling in
// the plaza restarts at the plaza (carry.checkpoint), not back at the drawbridge.
const W = '__game.current.world';
const K = `${W}.knight`;
const B = `${W}.battle`;
const H = `${W}.hydra`;
const god = `(${B}.heroes.forEach(h => h.hp = 100), 'ok')`;

export default [
  { label: 'Stage 4: the Hydra already dead', wait: 800, eval: `(__game.goTo('stage-4', (c) => Object.assign(c, {horse: 'following', sword: true, bow: true, weapon: 'bow', abilities: 3})), 'ok')` },
  { until: `!${K}.autoWalk`, timeout: 6000 },
  { eval: `(${B}.monsters.forEach(m => { m.hp = 0; m.dead = true; m.dieT = 9; m.air = 0; }), ${K}.x = 720, 'ok')`, wait: 400 },
  { hold: 'ArrowRight', until: `${H}.state !== 'sleep'`, timeout: 8000, wait: 1200 },
  ...Array.from({ length: 6 }, () => ({ click: [160, 140], wait: 150 })),
  { eval: `(${god}, ${K}.x = 1100, ${H}.forceDie(1), 'ok')` },
  { until: `${H}.state === 'dead'`, timeout: 8000, wait: 1500 },
  ...Array.from({ length: 4 }, () => ({ click: [160, 140], wait: 200 })),
  { label: 'no way out before the potion', hold: 'ArrowRight', ms: 2500, wait: 200 },
  { eval: `JSON.stringify({x: ${K}.x, stage: __game.current.id, potion: ${W}.rage.onFloor})` },
  { eval: `(${K}.x = Math.round(${W}.rage.item.x) - 8, 'ok')`, wait: 300 },
  { key: 'Space', wait: 1200 },
  ...Array.from({ length: 2 }, () => ({ click: [160, 140], wait: 200 })),
  { label: 'out the back of the chamber', hold: 'ArrowRight', ms: 600, wait: 100, shot: 's5g-01-passage' },
  { hold: 'ArrowRight', until: `__game.current.id === 'stage-5'`, timeout: 8000 },
  { until: `!__game.transitioning`, timeout: 4000, wait: 1500, shot: 's5g-02-arrived' },
  { eval: `JSON.stringify({carry: __game.carry, canvas: [document.getElementById('game').width, document.getElementById('game').height]})` },
  { label: 'skip the guards, ride to the second gate', eval: `(${B}.monsters.forEach(m => ${B}.slay(m)), 'ok')` },
  { until: `${W}.phase === 'guards-talk'`, timeout: 6000, wait: 600 },
  { click: [160, 140], wait: 150 },
  { click: [160, 140], wait: 150 },
  { until: `${W}.phase === 'court'`, timeout: 6000 },
  { eval: `(${K}.x = Math.round(${W}.horse.x) - 8, 'ok')`, wait: 300 },
  { key: 'Space', wait: 900 },
  { label: 'mounted', hold: 'ArrowRight', until: `${K}.x >= 1130`, timeout: 15000 },
  { hold: 'ArrowRight', ms: 800, wait: 200, shot: 's5g-03-get-off' },
  { eval: `JSON.stringify({x: ${K}.x, mounted: ${K}.mounted, bound: ${K}.boundR, phase: ${W}.phase})` },
  { key: 'Space', wait: 1200 },
  { hold: 'ArrowRight', until: `${W}.phase === 'zoom'`, timeout: 10000, wait: 400, shot: 's5g-03b-horse-waits' },
  { until: `${W}.phase === 'plaza'`, timeout: 6000, wait: 200 },
  { label: 'fall in the plaza', eval: `(${B}.damageHero(${B}.player, 999), 'ok')` },
  { until: `__game.transitioning`, timeout: 8000 },
  { until: `!__game.transitioning && ${W}.phase === 'plaza'`, timeout: 6000, wait: 800, shot: 's5g-04-restart-plaza' },
  { eval: `JSON.stringify({phase: ${W}.phase, zoom: ${W}.zoom, x: ${K}.x, allies: ${B}.heroes.map(h => Math.round(h.x)), carry: __game.carry})` },
];
