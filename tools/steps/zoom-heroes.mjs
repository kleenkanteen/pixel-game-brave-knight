// Close-ups of the Stage 3 heroes: the Archer's robin (perched + mid-loop) and the Mage's face.
const W = '__game.current.world';
export default [
  { wait: 800, eval: `(__game.current.exit = () => {}, Object.assign(__game.carry, {horse: 'following', sword: true, bow: true, weapon: 'sword'}), __game.goTo('stage-3'), 'ok')` },
  { until: `__game.current.id === 'stage-3'`, timeout: 4000 },
  { wait: 1500, shot: 'zoom-heroes-00', zoom: [70, 110, 80, 50], scale: 4 },
  { wait: 2300 },
  { wait: 250, shot: 'zoom-heroes-01', zoom: [70, 110, 80, 50], scale: 4 },
  { wait: 250, shot: 'zoom-heroes-02', zoom: [70, 110, 80, 50], scale: 4 },
  { wait: 250, shot: 'zoom-heroes-03', zoom: [70, 110, 80, 50], scale: 4 },
  { wait: 250, shot: 'zoom-heroes-04', zoom: [70, 110, 80, 50], scale: 4 },
  { wait: 250, shot: 'zoom-heroes-05', zoom: [70, 110, 80, 50], scale: 4 },
  { wait: 250, shot: 'zoom-heroes-06', zoom: [70, 110, 80, 50], scale: 4 },
  { wait: 250, shot: 'zoom-heroes-07', zoom: [70, 110, 80, 50], scale: 4 },
  { wait: 250, shot: 'zoom-heroes-08', zoom: [70, 110, 80, 50], scale: 4 },
  { wait: 250, shot: 'zoom-heroes-09', zoom: [70, 110, 80, 50], scale: 4 },
  { wait: 250, shot: 'zoom-heroes-10', zoom: [70, 110, 80, 50], scale: 4 },
  { wait: 250, shot: 'zoom-heroes-11', zoom: [70, 110, 80, 50], scale: 4 },
  { wait: 250, shot: 'zoom-heroes-12', zoom: [70, 110, 80, 50], scale: 4 },
  { wait: 250, shot: 'zoom-heroes-13', zoom: [70, 110, 80, 50], scale: 4 },
  { wait: 250, shot: 'zoom-heroes-14', zoom: [70, 110, 80, 50], scale: 4 },
  { wait: 250, shot: 'zoom-heroes-15', zoom: [70, 110, 80, 50], scale: 4 },
  { wait: 250, shot: 'zoom-heroes-16', zoom: [70, 110, 80, 50], scale: 4 },
];
