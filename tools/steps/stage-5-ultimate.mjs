// Stage 5's plaza fight: two Rage potions on entry, the twenty-three platforms up to the perch,
// all seven Shadows swarming in, and the Dark Lord's ultimate (the 7 s warning, the safe slice,
// the allies running into it, the blast).
const W = '__game.current.world';
const K = `${W}.knight`;
const B = `${W}.battle`;
const D = `${W}.darkLord`;
const god = `(${B}.heroes.forEach(h => h.hp = 100), 'ok')`;
const clickThrough = (n) => Array.from({ length: n }, () => ({ click: [160, 140], wait: 160 }));

export default [
  {
    label: 'straight to the plaza (no potions carried in)',
    wait: 800,
    eval: `(__game.goTo('stage-5', (c) => Object.assign(c, {horse: 'following', sword: true, bow: true, weapon: 'bow', abilities: 3, potions: 0, checkpoint: 'plaza'})), 'ok')`,
  },
  { wait: 600, eval: `JSON.stringify({potions: ${W}.rage.potions})` },
  { until: `${W}.phase === 'talk'`, timeout: 8000, wait: 1200, shot: 'u-01-plaza-platforms' },
  ...clickThrough(8),
  { until: `${W}.phase === 'fight'`, timeout: 8000, wait: 500 },
  ...clickThrough(2), // the ability tips
  { wait: 8500, shot: 'u-02-swarm' },
  { eval: `JSON.stringify({out: ${D}.minions, left: ${D}.minionsLeft})` },
  { label: 'on the perch', eval: `(${god}, ${K}.x = 1800, ${K}.y = -228, 'ok')`, wait: 500, shot: 'u-03-perch' },
  { eval: `JSON.stringify({x: ${K}.x + 8, y: ${K}.y})` },
  { label: 'the ultimate', eval: `(${god}, ${K}.x = 1400, ${K}.y = 150, ${D}.forceUlt(), JSON.stringify(${D}.ultimate))`, wait: 1500, shot: 'u-04-ult-warn' },
  { wait: 3500, shot: 'u-05-ult-warn-late' },
  { eval: `JSON.stringify({ult: ${D}.ultimate, allies: ${B}.heroes.map(h => [h.kind, Math.round(h.x)])})` },
  { until: `${D}.ultimate && ${D}.ultimate.blast !== null`, timeout: 4000, wait: 150, shot: 'u-06-ult-blast' },
  { eval: `JSON.stringify(${B}.heroes.map(h => [h.kind, Math.round(h.x), h.hp]))` },
  { until: `!${D}.ultimate`, timeout: 3000, wait: 300, shot: 'u-07-after' },
];
