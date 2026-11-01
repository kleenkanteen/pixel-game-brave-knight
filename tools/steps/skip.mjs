// Easter egg: 8 rides straight on to the next Stage, mounted. From the title: Stage 1 → 2 → 3.
const K = '__game.current.world.knight';

export default [
  { wait: 800, key: 'Digit8' },
  { until: `__game.current.id === 'stage-2'`, timeout: 8000, wait: 1200, shot: 'skip-01-stage-2' },
  { eval: `JSON.stringify(__game.carry)` },
  { key: 'Digit8' },
  { until: `__game.current.id === 'stage-3'`, timeout: 8000, wait: 1200, shot: 'skip-02-stage-3' },
  { eval: `JSON.stringify({carry: __game.carry, sword: ${K}.hasSword, bow: ${K}.hasBow, mounted: ${K}.mounted})` },
  { key: 'Digit8', wait: 1500 },
  { eval: `__game.current.id` },
];
