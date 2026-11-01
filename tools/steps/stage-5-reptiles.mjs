// Stage 5 close-ups of the Reptilians on the drawbridge: prowling, crouching with jaws agape,
// the lunge + bite, goo dripping into puddles.
const W = '__game.current.world';
const K = `${W}.knight`;
const B = `${W}.battle`;
const god = `(${B}.heroes.forEach(h => h.hp = 100), 'ok')`;
const rep = `${B}.monsters.filter(m => m.kind === 'reptile' && !m.dead)`;

export default [
  {
    wait: 800,
    eval: `(__game.goTo('stage-5', (c) => Object.assign(c, {horse: 'following', sword: true, bow: true, weapon: 'sword', abilities: 3, potions: 2})), 'ok')`,
  },
  { until: `!${K}.autoWalk`, timeout: 6000, wait: 300 },
  { label: 'onto the drawbridge', hold: 'ArrowRight', until: `${K}.x >= 400`, timeout: 9000, wait: 900, shot: 's5r-01-prowl' },
  { eval: god },
  { until: `${rep}.some(m => m.state === 'coil')`, timeout: 9000, wait: 350, shot: 's5r-02-coil' },
  { shot: 's5r-02z-coil', zoom: [100, 90, 160, 70], scale: 4 },
  { eval: god },
  { until: `${rep}.some(m => m.state === 'lunge')`, timeout: 9000, wait: 120, shot: 's5r-03-bite' },
  { shot: 's5r-03z-bite', zoom: [100, 90, 160, 70], scale: 4 },
  { eval: god },
  { wait: 2500, eval: god, shot: 's5r-04-goo' },
  { shot: 's5r-04z-goo', zoom: [100, 90, 160, 70], scale: 4 },
  { eval: `JSON.stringify(${B}.monsters.filter(m => m.kind === 'reptile').map(m => [m.hp, Math.round(m.x), m.state]))` },
];
