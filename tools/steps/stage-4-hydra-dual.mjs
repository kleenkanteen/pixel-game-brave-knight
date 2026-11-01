// Stage 4 Hydra: two heads charge fire blasts independently; stop one, let the other blast.
const W = '__game.current.world';
const K = `${W}.knight`;
const B = `${W}.battle`;
const H = `${W}.hydra`;
const god = `(${B}.heroes.forEach(h => h.hp = 100), 'ok')`;

export default [
  { wait: 800, eval: `(Object.assign(__game.carry, {horse: 'following', sword: true, bow: true, weapon: 'bow', abilities: 3}), __game.goTo('stage-4'), 'ok')` },
  { until: `!${K}.autoWalk`, timeout: 6000 },
  { eval: `(${B}.monsters.forEach(m => { m.hp = 0; m.dead = true; m.dieT = 9; m.air = 0; }), ${K}.x = 720, 'ok')`, wait: 1500 },
  { hold: 'ArrowRight', until: `${H}.state !== 'sleep'`, timeout: 8000, wait: 1200 },
  ...Array.from({ length: 6 }, () => ({ click: [160, 140], wait: 150 })),
  { wait: 2500 },
  { eval: `(${K}.x = 1000, ${god}, ${H}.forceCharge([0, 2]), 'ok')`, wait: 3500, shot: 'hd-01-two-charging' },
  { eval: `JSON.stringify(${H}.charges)` },
  { label: 'stop head 0 only', eval: `(() => { const c = ${H}.charges.find(c => c.head === 0).chin; for (let i = 0; i < 5; i++) ${H}.collider.onHit(c.x, c.y); return JSON.stringify({hp: ${H}.hp, charges: ${H}.charges.map(c => [c.head, c.hits])}); })()`, wait: 300, shot: 'hd-02-one-stopped' },
  { until: `${H}.blasting`, timeout: 9000, wait: 400, shot: 'hd-03-other-blasts' },
  { until: `!${H}.blasting && ${H}.charges.length === 0`, timeout: 20000, wait: 500 },
  { label: 'on the ledge: the blast follows him up', eval: `(${god}, ${K}.x = 940, ${K}.y = 106, ${H}.forceCharge([0, 2]), 'ok')`, wait: 5300, shot: 'hd-04-ledge-warning' },
  { wait: 1500, shot: 'hd-05-ledge-blast' },
  { eval: `JSON.stringify({hp: ${H}.hp, state: ${H}.state})` },
];
