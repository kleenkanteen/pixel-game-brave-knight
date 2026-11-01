// Stage 5, the Dark Lord's Castle: out of the cave, the drawbridge fight (skeleton archers on the
// gatehouse), the gate opening, the inner court, the second gate shutting, the zoom-out over the
// plaza, the Dark Lord on his balcony, his transformation, the beam, his Shadows, his death.
const W = '__game.current.world';
const K = `${W}.knight`;
const B = `${W}.battle`;
const D = `${W}.darkLord`;
const god = `(${B}.heroes.forEach(h => h.hp = 100), 'ok')`;
const clickThrough = (n) => Array.from({ length: n }, () => ({ click: [160, 140], wait: 160 }));

export default [
  {
    label: 'jump straight into Stage 5: sword + bow, horse following, all abilities, a potion',
    wait: 800,
    // the carry goes in goTo's patch: it runs after the title Stage's exit() has written its own
    eval: `(__game.goTo('stage-5', (c) => Object.assign(c, {horse: 'following', sword: true, bow: true, weapon: 'bow', abilities: 3, potions: 2})), 'ok')`,
  },
  { wait: 500, shot: 's5-01-cave-exit' },
  { until: `!${K}.autoWalk`, timeout: 6000, wait: 1800, shot: 's5-02-approach' },
  { label: 'onto the drawbridge', hold: 'ArrowRight', until: `${K}.x >= 420`, timeout: 9000, wait: 600, shot: 's5-03-bridge' },
  { eval: god },
  { hold: 'ArrowRight', until: `${K}.x >= 560`, timeout: 9000, wait: 1500, shot: 's5-04-fight' },
  { eval: god },
  { until: `${B}.monsters.some(m => m.kind === 'skeleton' && m.state === 'draw')`, timeout: 9000, wait: 500, shot: 's5-05-skeleton-draw' },
  { shot: 's5-05z-gatehouse', zoom: [150, 20, 170, 140], scale: 3 },
  { eval: `JSON.stringify(${B}.monsters.map(m => [m.name, m.hp, Math.round(m.x), m.state, m.awake]))` },
  { label: 'every guard down', eval: `(${god}, ${B}.monsters.forEach(m => ${B}.slay(m)), 'ok')`, wait: 400, shot: 's5-06-skeletons-fall' },
  { until: `${W}.phase === 'guards-talk'`, timeout: 6000, wait: 1500, shot: 's5-07-weak-guards' },
  ...clickThrough(2),
  { wait: 1200, shot: 's5-08-gate-opening' },
  { until: `${W}.phase === 'court'`, timeout: 6000, wait: 300, shot: 's5-09-gate-open' },
  { label: 'through the gatehouse', hold: 'ArrowRight', until: `${K}.x >= 900`, timeout: 12000, wait: 1500, shot: 's5-10-court' },
  { hold: 'ArrowRight', until: `${K}.x >= 1060`, timeout: 12000, wait: 1500, shot: 's5-11-court-b' },
  { label: 'through the second gate', hold: 'ArrowRight', until: `${W}.phase !== 'court'`, timeout: 12000 },
  { until: `${W}.phase === 'zoom'`, timeout: 9000, wait: 50, shot: 's5-12-gate-shut' },
  { wait: 1100, shot: 's5-13-zooming' },
  { until: `${W}.phase === 'plaza'`, timeout: 6000, wait: 300, shot: 's5-14-plaza' },
  { until: `${W}.phase === 'talk'`, timeout: 6000, wait: 1500, shot: 's5-15-dark-lord' },
  { shot: 's5-15z-balcony', zoom: [250, 20, 70, 60], scale: 4 },
  ...clickThrough(2),
  { wait: 1200, shot: 's5-16-gramps' },
  ...clickThrough(4),
  { wait: 900, shot: 's5-17-transform' },
  { until: `${W}.phase === 'fight'`, timeout: 6000, wait: 2600, shot: 's5-18-fight' },
  { eval: god },
  { label: 'a beam', eval: `(${god}, ${D}.forceBeam(), 'ok')`, wait: 1200, shot: 's5-19-aim' },
  { shot: 's5-19z-aim', zoom: [100, 0, 220, 120], scale: 3 },
  { until: `${D}.firing`, timeout: 3000, wait: 150, shot: 's5-20-beam' },
  { eval: god },
  { label: 'the swarm', eval: `(${D}.forceMinion(), ${D}.forceMinion(), ${D}.forceMinion(), 'ok')`, wait: 2500, shot: 's5-21-shadows' },
  { eval: `JSON.stringify(${B}.monsters.filter(m => !m.dead).map(m => [m.name, Math.round(m.x), Math.round(m.air), m.state]))` },
  { label: 'a lightning strike through him', eval: `(${god}, JSON.stringify({before: ${D}.hp, hit: ${B}.damageArea(${D}.pos.x - 12, ${D}.pos.x + 12, 30, ${D}.pos.x), after: ${D}.hp}))`, wait: 300 },
  { label: 'up the platforms', eval: `(${god}, ${K}.x = 1290, ${K}.y = 126, 'ok')`, wait: 400 },
  { down: 'ArrowUp' },
  { hold: 'ArrowRight', ms: 300 },
  { up: 'ArrowUp', wait: 700 },
  { down: 'ArrowUp' },
  { hold: 'ArrowRight', ms: 300 },
  { up: 'ArrowUp', wait: 700 },
  { eval: `JSON.stringify({x: ${K}.x + 8, y: ${K}.y})`, shot: 's5-22-platforms' },
  { shot: 's5-22z-knight', zoom: [20, 100, 140, 80], scale: 3 },
  { label: 'bring him down', eval: `(${god}, ${D}.forceHurt(${D}.hp), 'ok')`, wait: 1200, shot: 's5-23-dying' },
  { until: `${D}.state === 'dead'`, timeout: 6000, wait: 1500, shot: 's5-24-victory' },
  { eval: `JSON.stringify({phase: ${W}.phase, monsters: ${B}.monsters.filter(m => !m.dead).length, carry: __game.carry})` },
];
