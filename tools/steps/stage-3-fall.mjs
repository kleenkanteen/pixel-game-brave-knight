// Stage 3: the Brave Knight falls → "You have fallen...again." + Restart → the screen starts over.
// Also lets the battle run so the allies' floating lines show.
const W = '__game.current.world';
const K = `${W}.knight`;
const B = `${W}.battle`;

export default [
  {
    label: 'jump straight to Stage 3 with the sword',
    wait: 800,
    eval: `(__game.current.exit = () => {}, Object.assign(__game.carry, {horse: null, sword: true, bow: true, weapon: 'sword'}), __game.goTo('stage-3'), 'ok')`,
  },
  { until: `!${K}.autoWalk`, timeout: 4000 },
  { label: 'close the arrival dialogue', wait: 2500, click: [160, 140] },
  { wait: 300, click: [160, 140] },
  { label: 'walk into the pack at 1 HP', wait: 200, eval: `(${B}.heroes[0].hp = 1, 'ok')` },
  { hold: 'ArrowRight', until: `${B}.fallen`, timeout: 15000 },
  { wait: 700, shot: 's3f-01-fallen' },
  { label: 'hover + click Restart', move: [160, 108], wait: 100, shot: 's3f-02-hover' },
  { click: [160, 108], wait: 100 },
  { until: `__game.transitioning`, timeout: 2000 },
  { until: `!__game.transitioning && !${B}.fallen`, timeout: 4000 },
  { eval: `JSON.stringify({id: __game.current.id, hp: ${B}.heroes.map(h => h.hp), alive: ${B}.monsters.filter(m => !m.dead).length})` },
  { wait: 2000, shot: 's3f-03-restarted' },
  { label: 'let the battle run for the allies lines', click: [160, 140], wait: 300 },
  { click: [160, 140], wait: 6000, shot: 's3f-04-barks' },
  { wait: 5000, shot: 's3f-05-barks' },
  { label: 'finish them → victory dialogue', eval: `(${B}.monsters.forEach(m => { m.hp = 0; m.dead = true; m.dieT = 0; }), 'ok')` },
  { wait: 3500, shot: 's3f-06-victory-1' },
  { click: [160, 140], wait: 2000, shot: 's3f-07-victory-2' },
];
