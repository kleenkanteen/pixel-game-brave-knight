// Controls: any key moves a Dialogue on (not just a click), Space at a sign reads it even riding,
// Space elsewhere gets him off the horse, and arrows stick in the cave's rock ceiling.
const W = '__game.current.world';
const K = `${W}.knight`;
const B = `${W}.battle`;
const state = `JSON.stringify({x: Math.round(${K}.x), mounted: ${K}.mounted, weapon: ${K}.weapon, log: window.__log})`;

export default [
  {
    label: 'Stage 4, riding, bow in hand',
    wait: 800,
    eval: `(__game.goTo('stage-4', (c) => Object.assign(c, {horse: 'mounted', sword: true, bow: true, weapon: 'bow', abilities: 3})), 'ok')`,
  },
  { until: `!${K}.autoWalk`, timeout: 6000, wait: 300 },
  {
    label: 'log dialogue closes and arrow hits',
    eval: `(window.__log = [], ${W}.events.on('dialogue:closed', (e) => __log.push('closed:' + e.id)), ${W}.events.on('arrow:hit', (e) => __log.push('hit:' + Math.round(e.x) + ',' + Math.round(e.y))), 'ok')`,
  },
  { eval: state },
  { label: 'ride to the sign', hold: 'ArrowRight', until: `${K}.x >= 132`, timeout: 6000, wait: 300 },
  { label: 'space at the sign reads it (still mounted)', key: 'Space', wait: 600, shot: 'c-01-sign-mounted' },
  { eval: state },
  { label: 'keys move the dialogue on', key: 'KeyQ', wait: 300 },
  { key: 'KeyQ', wait: 600, shot: 'c-02-reply-by-key' },
  { key: 'KeyA', wait: 300 },
  { key: 'KeyA', wait: 300 },
  { eval: state },
  { label: 'away from the sign', hold: 'ArrowRight', until: `${K}.x >= 200`, timeout: 6000, wait: 300 },
  { label: 'space gets him off the horse', key: 'Space', wait: 1200, shot: 'c-03-dismounted' },
  { eval: state },
  { label: 'into the cavern', eval: `(${B}.monsters.forEach(m => { m.hp = 0; m.dead = true; m.dieT = 9; m.air = 0; }), ${K}.x = 400, 'ok')`, wait: 1500 },
  { label: 'shoot steeply up at the ceiling', press: [160, 90] },
  { drag: [150, 150], wait: 300, shot: 'c-04-aim-up' },
  { release: true, wait: 1200, shot: 'c-05-arrow-in-ceiling' },
  { eval: state },
];
