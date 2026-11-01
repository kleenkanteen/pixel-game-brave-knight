// Stage 4: walk up to the Hydra — the front head lunges out and bites (damage + knockback),
// and sword Strikes on it glance off ("Too tough!").
const W = '__game.current.world';
const K = `${W}.knight`;
const B = `${W}.battle`;
const H = `${W}.hydra`;
const god = `(${B}.heroes.forEach(h => h.hp = 100), 'ok')`;

export default [
  { wait: 800, eval: `(__game.goTo('stage-4', (c) => Object.assign(c, {horse: 'following', sword: true, bow: true, weapon: 'sword', abilities: 3})), 'ok')` },
  { until: `!${K}.autoWalk`, timeout: 6000 },
  { eval: `(${B}.monsters.forEach(m => { m.hp = 0; m.dead = true; m.dieT = 9; m.air = 0; }), ${K}.x = 720, 'ok')`, wait: 500 },
  { hold: 'ArrowRight', until: `${H}.state !== 'sleep'`, timeout: 8000, wait: 1200 },
  ...Array.from({ length: 12 }, () => ({ click: [160, 140], wait: 250 })),
  { until: `${H}.state === 'fight'`, timeout: 5000 },
  { label: 'walk up to its claws', eval: god, hold: 'ArrowRight', until: `${K}.x >= 1150 || ${H}.biting`, timeout: 8000 },
  { eval: god },
  { eval: `JSON.stringify({x: ${K}.x + 8, max: ${K}.boundR})` },
  { eval: `JSON.stringify({w: ${K}.weapon, hs: ${K}.hasSword, f: ${K}.facing, hit: ${H}.collider.hit(1170, 140), hit2: ${H}.collider.hit(1175, 130)})` },
  { label: 'sword strike', click: [200, 120], wait: 30 },
  { eval: `JSON.stringify({st: ${K}.strikeT})`, wait: 120, shot: 'b-01-sword' },
  { until: `${H}.biting && ${H}.biting.t > 0.2`, timeout: 6000, shot: 'b-02-rear' },
  { until: `${H}.biting && ${H}.biting.t > 0.58`, timeout: 3000, shot: 'b-03-lunge' },
  { shot: 'b-03z-lunge', zoom: [140, 60, 180, 110], scale: 3 },
  { wait: 400, eval: `JSON.stringify({hp: ${B}.player.hp, x: ${K}.x + 8, hit: ${H}.biting})`, shot: 'b-04-pushed' },
];
