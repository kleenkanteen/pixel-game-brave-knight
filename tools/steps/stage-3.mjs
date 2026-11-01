// Stage 2's exit → Stage 3: the battle in the rotted woods (allies vs monsters), joining in with
// the sword and the bow, fireball warnings, victory dialogue.
const W = '__game.current.world';
const K = `${W}.knight`;
const B = `${W}.battle`;

export default [
  {
    label: 'jump to Stage 2 carrying sword + bow, horse following',
    wait: 800,
    eval: `(__game.current.exit = () => {}, Object.assign(__game.carry, {horse: 'following', sword: true, bow: true, weapon: 'sword'}), __game.goTo('stage-2'), 'ok')`,
  },
  { until: `__game.current.id === 'stage-2' && !${K}.autoWalk`, timeout: 4000 },
  { label: 'skip to the right edge', eval: `${K}.x = 900` },
  { hold: 'ArrowRight', until: `${K}.blockedRight`, timeout: 4000, shot: 's3-00-stage2-exit' },
  { hold: 'ArrowRight', until: `__game.transitioning`, timeout: 3000 },
  { until: `__game.current.id === 'stage-3'`, timeout: 4000 },
  { wait: 250, shot: 's3-01-enter' },
  { until: `!${K}.autoWalk`, timeout: 4000 },
  { wait: 2200, shot: 's3-02-arrive-dialogue' },
  { label: 'close the dialogue', click: [160, 140], wait: 200 },
  { wait: 1500, shot: 's3-03-battle' },
  { shot: 's3-04-heroes-zoom', zoom: [70, 100, 110, 60], scale: 3 },
  { shot: 's3-05-monsters-zoom', zoom: [180, 100, 130, 60], scale: 3 },
  { eval: `JSON.stringify(${B}.heroes.map(h => [h.name, h.hp]).concat(${B}.monsters.map(m => [m.name, m.hp, Math.round(m.x)])))` },
  { label: 'into the fight', hold: 'ArrowRight', until: `${K}.x >= 170`, timeout: 6000 },
  { click: [250, 100], wait: 120, shot: 's3-06-strike' },
  { wait: 300, click: [250, 100] },
  { wait: 400, click: [250, 100] },
  { wait: 400, click: [250, 100], shot: 's3-07-after-strikes' },
  { eval: `JSON.stringify(${B}.monsters.map(m => [m.name, m.hp, m.dead]))` },
  { wait: 1200, shot: 's3-08-mid' },
  { wait: 1200, shot: 's3-09-mid' },
  { label: 'back off and use the bow', hold: 'ArrowLeft', ms: 900 },
  { key: 'KeyQ', wait: 150 },
  { press: [100, 110], drag: [60, 118], wait: 150, shot: 's3-10-aim' },
  { release: true, wait: 400, shot: 's3-11-arrow' },
  { eval: `JSON.stringify(${B}.monsters.map(m => [m.name, m.hp, m.dead]))` },
  { wait: 1500, shot: 's3-12-later' },
  { wait: 1500, shot: 's3-13-later' },
  { shot: 's3-13b-zoom', zoom: [100, 90, 160, 70], scale: 3 },
  { label: 'finish the monsters off', eval: `(${B}.monsters.forEach(m => { m.hp = 0; m.dead = true; m.dieT = 0; }), 'ok')` },
  { wait: 2600, shot: 's3-14-victory-1' },
  { click: [160, 140], wait: 200 },
  { click: [160, 140], wait: 1500, shot: 's3-15-victory-2' },
  { eval: `JSON.stringify({won: ${B}.won, heroes: ${B}.heroes.map(h => [h.name, h.hp])})` },
];
