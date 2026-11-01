// Stage 4, straight to the Hydra: wake, charge-up close-ups, the blast, the ledge view.
const W = '__game.current.world';
const K = `${W}.knight`;
const B = `${W}.battle`;
const H = `${W}.hydra`;
const god = `(${B}.heroes.forEach(h => h.hp = 100), 'ok')`;

export default [
  { wait: 800, eval: `(Object.assign(__game.carry, {horse: 'following', sword: true, bow: true, weapon: 'bow', abilities: 3}), __game.goTo('stage-4'), 'ok')` },
  { until: `!${K}.autoWalk`, timeout: 6000 },
  { eval: `(${B}.monsters.forEach(m => { m.hp = 0; m.dead = true; m.dieT = 9; m.air = 0; }), ${K}.x = 720, 'ok')`, wait: 1500, shot: 'h-01-asleep' },
  { hold: 'ArrowRight', until: `${H}.state !== 'sleep'`, timeout: 8000, wait: 1200 },
  ...Array.from({ length: 6 }, () => ({ click: [160, 140], wait: 150 })),
  { wait: 2500, shot: 'h-02-awake' },
  { eval: `(${K}.x = 1000, ${god}, ${H}.forceCharge(), 'ok')`, wait: 2500, shot: 'h-03-charging' },
  { shot: 'h-03z-heads', zoom: [190, 20, 130, 140], scale: 3 },
  { until: `${H}.blasting`, timeout: 9000, wait: 300, shot: 'h-04-blast' },
  { wait: 400, shot: 'h-05-blast-b' },
  { eval: `(${god}, ${K}.x = 940, ${K}.y = 106, 'ok')`, wait: 3000, shot: 'h-06-ledge-view' },
  { eval: `JSON.stringify({cam: ${W}.camera.x, chin: ${H}.chin})` },
];
