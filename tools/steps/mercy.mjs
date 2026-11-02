// After two deaths to a boss, the third try offers "Press 5 to kill it now": the Hydra explodes,
// the Dark Lord dies (victory follows).
const W = '__game.current.world';
const K = `${W}.knight`;
const B = `${W}.battle`;
const H = `${W}.hydra`;

export default [
  { wait: 800, eval: `(Object.assign(__game.carry, {horse: 'following', sword: true, bow: true, weapon: 'bow', abilities: 3, hydraDeaths: 2}), __game.goTo('stage-4'), 'ok')` },
  { until: `!${K}.autoWalk`, timeout: 6000 },
  { eval: `(${B}.monsters.forEach(m => { m.hp = 0; m.dead = true; m.dieT = 9; m.air = 0; }), ${K}.x = 720, 'ok')`, wait: 500 },
  { hold: 'ArrowRight', until: `${H}.state !== 'sleep'`, timeout: 8000, wait: 1200 },
  ...Array.from({ length: 6 }, () => ({ click: [160, 140], wait: 150 })),
  { label: 'the offer', wait: 2500, shot: 'm-01-hydra-offer' },
  { click: [160, 140], wait: 300 },
  { wait: 1500, shot: 'm-01b-hydra-objective' },
  { label: 'press 5', key: 'Digit5', until: `${H}.state === 'dying'`, timeout: 2000 },
  { until: `${H}.popped`, timeout: 5000, wait: 100, shot: 'm-02-hydra-boom' },
  { label: 'Dark Lord', eval: `(Object.assign(__game.carry, {checkpoint: 'plaza', darkLordDeaths: 2}), __game.goTo('stage-5'), 'ok')` },
  { until: `${W}.phase === 'talk'`, timeout: 15000, wait: 500 },
  ...Array.from({ length: 6 }, () => ({ click: [160, 140], wait: 900 })),
  { until: `${W}.phase === 'fight'`, timeout: 15000, wait: 2500, shot: 'm-03-dark-lord-offer' },
  { wait: 1500, shot: 'm-03b-dark-lord-offer' },
  { click: [160, 140], wait: 300 },
  { key: 'Digit5', until: `${W}.darkLord.state === 'dying' || ${W}.darkLord.state === 'dead'`, timeout: 2000 },
  { until: `${W}.phase === 'won'`, timeout: 8000, wait: 500, shot: 'm-04-dark-lord-won' },
];
