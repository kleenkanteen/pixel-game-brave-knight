// The ending: straight to the plaza, bring the Dark Lord down, the victory, the knight's party
// talk, the blackout, then the dance party under the disco ball. Also: space jumps when there's
// nothing to interact with.
const W = '__game.current.world';
const K = `${W}.knight`;
const B = `${W}.battle`;
const D = `${W}.darkLord`;
const god = `(${B}.heroes.forEach(h => h.hp = 100), 'ok')`;
const clickThrough = (n) => Array.from({ length: n }, () => ({ click: [160, 140], wait: 160 }));

export default [
  {
    label: 'straight to the plaza',
    wait: 800,
    eval: `(__game.goTo('stage-5', (c) => Object.assign(c, {horse: 'following', sword: true, bow: true, weapon: 'sword', abilities: 3, potions: 2, checkpoint: 'plaza'})), 'ok')`,
  },
  { until: `${W}.phase === 'talk'`, timeout: 8000, wait: 1500 },
  ...clickThrough(8),
  { until: `${W}.phase === 'fight'`, timeout: 8000, wait: 500 },
  ...clickThrough(2), // the ability tips
  { label: 'space with nothing near: a jump', key: 'Space', wait: 120, eval: `JSON.stringify({onGround: ${K}.onGround, vy: Math.round(${K}.vy)})` },
  { label: 'bring him down', eval: `(${god}, ${D}.forceHurt(${D}.hp), 'ok')`, wait: 1200 },
  { until: `${D}.state === 'dead'`, timeout: 8000 },
  { until: `${W}.phase === 'party-talk'`, timeout: 12000, wait: 1500, shot: 'p-01-party-talk' },
  ...clickThrough(2),
  { wait: 1200, shot: 'p-02-im-down' },
  ...clickThrough(5),
  { until: `${W}.phase === 'blackout'`, timeout: 6000, wait: 900, shot: 'p-03-dim' },
  { until: `${W}.phase === 'party'`, timeout: 6000, wait: 2200, shot: 'p-04-party' },
  { wait: 700, shot: 'p-05-party-b', eval: `import('/src/music/index.js').then((m) => m.victoryMusic.playing)` },
  { shot: 'p-06-crew', zoom: [80, 120, 160, 60], scale: 3 },
  { shot: 'p-07-ball', zoom: [130, 40, 60, 50], scale: 4 },
  { shot: 'p-08-right', zoom: [180, 120, 100, 60], scale: 3 },
];
