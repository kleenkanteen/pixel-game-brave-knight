// Stage 1 happy path, one screenshot per beat. Edit freely: steps run top to bottom.
// Step fields (any combination, applied in this order):
//   label   text printed to the terminal
//   move    [x, y]  mouse move, in INTERNAL 320×180 game pixels
//   click   [x, y]  left click, internal pixels
//   key     'Space' | 'ArrowRight' | 'KeyD' …   tap (down + up)
//   down/up key code   press / release without waiting
//   hold    key code held for `ms`, or until the JS expression `until` is truthy
//   until   JS expression polled in the page (with hold: release when true; alone: wait, `timeout` ms)
//   eval    JS expression; result is printed with the console log
//   run     async ({ evaluate, cdp, sleep }) => {}  escape hatch
//   wait    ms to sleep
//   shot    file name (no extension) → tickets/assets/screens/<shot>.png
// `__game` is exposed in dev builds: __game.current.world.knight etc.
const K = '__game.current.world.knight';

export default [
  { label: 'title', wait: 800, move: [160, 100] },
  { wait: 150, shot: 'beat-01-title' },
  { label: 'play → climb', click: [160, 100], wait: 750, shot: 'beat-02-climb' },
  { label: 'knight out, dialogue typing', until: `${K}.controlsEnabled`, wait: 300, shot: 'beat-03-dialogue-typing' },
  { label: 'dialogue fully typed', wait: 2000, shot: 'beat-04-dialogue-next' },
  { label: 'close dialogue → objective', click: [160, 140], wait: 700, shot: 'beat-05-objective' },
  { label: 'walk to the sword', hold: 'ArrowRight', until: `${K}.x >= 58` },
  { wait: 100, shot: 'beat-06-near-sword' },
  { label: 'pick up → he talks to his sword', key: 'Space', wait: 1500, shot: 'beat-07a-sword-line' },
  { label: 'close it', click: [160, 140], wait: 300, shot: 'beat-07-holding' },
  { label: 'strike', click: [200, 120], wait: 110, shot: 'beat-08-strike' },
  { label: 'walk right, mid-way', wait: 400, hold: 'ArrowRight', until: `${K}.x >= 228` },
  { wait: 100, shot: 'beat-09-midway' },
  { label: 'walk to the farmer', hold: 'ArrowRight', until: `${K}.x >= 384`, timeout: 6000 },
  { wait: 200, shot: 'beat-10-farmer-prompt' },
  { label: 'talk', key: 'Space', wait: 650, shot: 'beat-11-farmer-dialogue' },
  { eval: `JSON.stringify({x: ${K}.x, cam: __game.current.world.camera.x})` },
];
