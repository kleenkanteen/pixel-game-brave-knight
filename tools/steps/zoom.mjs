// Close-ups for art review: climb frames, graveyard, sword, farmer.
const K = '__game.current.world.knight';
export default [
  { wait: 800, shot: 'zoom-graveyard-title', zoom: [0, 90, 120, 70] },
  { click: [160, 100], wait: 450, shot: 'zoom-climb-a', zoom: [10, 100, 80, 60], scale: 3 },
  { wait: 350, shot: 'zoom-climb-b', zoom: [10, 100, 80, 60], scale: 3 },
  { wait: 350, shot: 'zoom-climb-c', zoom: [10, 100, 80, 60], scale: 3 },
  { until: `${K}.controlsEnabled`, click: [160, 140] },
  { wait: 300, click: [160, 140] },
  { hold: 'ArrowRight', until: `${K}.x >= 60` },
  { wait: 100, shot: 'zoom-near-sword', zoom: [20, 100, 100, 60], scale: 3 },
  { hold: 'ArrowRight', until: `${K}.x >= 384`, timeout: 8000 },
  { wait: 300, shot: 'zoom-farmer', zoom: [220, 90, 100, 70], scale: 3 },
];
