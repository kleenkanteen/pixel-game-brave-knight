// Graveyard props (x 4–100): iron fence bits, varied tombstones, the knight's disturbed grave mound, the cross.
import { GROUND_Y } from '../../core/constants.js';
import { rect, px, line } from '../../core/draw.js';
import { GRAVE_X, CROSS_X } from '../layout.js';
import { drawMask, hash2, paintRow } from './util.js';

const G = GROUND_Y;
const rep = (n, row) => Array.from({ length: n }, () => row);

/** Tombstone shapes: rows of [x0, x1]; the last row sits 1 px into the ground. */
const SHAPES = {
  round: [[2, 5], [1, 6], ...rep(10, [0, 7])],
  cross: [...rep(3, [3, 5]), ...rep(3, [0, 8]), ...rep(7, [3, 5]), ...rep(2, [1, 7])],
  obelisk: [[4, 4], [3, 5], ...rep(11, [2, 6]), ...rep(2, [1, 7]), ...rep(2, [0, 8])],
  double: [[2, 8], [1, 9], ...rep(8, [0, 10])],
  slab: [[3, 8], [2, 8], [2, 8], [1, 8], [1, 7], [1, 7], [0, 7], [0, 7], [0, 7]],
};

/** [shape, left x] — kept clear of the grave (35–60), cross (55–65) and sword (68–84). */
const STONES = [
  ['round', 5],
  ['cross', 15],
  ['obelisk', 25],
  ['double', 86],
  ['slab', 98],
];

const ST = { body: '#9a97a2', hi: '#bdbac4', dk: '#706d7a', carve: '#5a5764', moss: '#6b8a3a', mossD: '#4e6a2a' };

function drawStone(ctx, shape, ox) {
  const rows = SHAPES[shape];
  const oy = G + 1 - rows.length + 1;
  const h = rows.length;
  const carved = new Set();
  if (shape === 'round' || shape === 'double' || shape === 'slab') {
    const w = rows[h - 1][1] + 1;
    const lines = shape === 'double' ? [6] : [4, 6];
    for (const ry of lines) for (let rx = 2; rx < w - 2; rx++) carved.add(rx + ',' + ry);
    if (shape === 'double') for (const k of ['5,2', '5,3', '5,4', '4,3', '6,3']) carved.add(k); // engraved cross
  }
  drawMask(ctx, ox, oy, rows, (rx, ry, row) => {
    const prev = rows[ry - 1];
    if (carved.has(rx + ',' + ry)) return ST.carve;
    if (ry >= h - 3 && hash2(ox + rx, ry) < 0.35) return hash2(rx, ox + ry) < 0.5 ? ST.moss : ST.mossD;
    if (rx === row[1]) return ST.dk;
    if (rx === row[0] || ry === 0 || (prev && (rx < prev[0] || rx > prev[1]))) return ST.hi;
    return hash2(ox + rx, oy + ry) < 0.08 ? ST.dk : ST.body;
  });
}

/** Wooden cross at CROSS_X, 21 px tall. */
function drawCross(ctx) {
  const ox = CROSS_X - 5;
  const rows = [...rep(4, [4, 6]), ...rep(3, [0, 10]), ...rep(14, [4, 6])];
  const oy = G + 1 - rows.length + 1;
  drawMask(ctx, ox, oy, rows, (rx, ry, row) => {
    if (ry === 4 && rx !== row[1]) return '#c0925a';
    if (rx === row[1] || (ry === 6 && rx !== 4)) return '#5e3e22';
    if (rx === row[0]) return '#b0824c';
    if (hash2(rx, ry + 40) < 0.15) return '#6e4a2a';
    return '#8a6038';
  });
  // little dirt heap at its foot
  rect(ctx, CROSS_X - 3, G - 1, 7, 1, '#6b4528');
  px(ctx, CROSS_X - 2, G - 2, '#7a5232');
}

/** Iron fence bits (drawn without outline — already dark). */
export function drawFence(ctx) {
  const IRON = '#2b2730';
  const IRON_HI = '#5c5566';
  const post = (x) => {
    rect(ctx, x - 1, G - 17, 3, 18, '#8a8794');
    rect(ctx, x - 1, G - 17, 1, 18, '#aeabb6');
    rect(ctx, x - 2, G - 18, 5, 1, '#6c6976');
  };
  const pick = (x) => {
    rect(ctx, x, G - 13, 1, 14, IRON);
    rect(ctx, x - 1, G - 14, 3, 1, IRON);
    px(ctx, x, G - 15, IRON);
    px(ctx, x, G - 12, IRON_HI);
  };
  // segment 1: x 4–34
  rect(ctx, 4, G - 11, 31, 1, IRON);
  rect(ctx, 4, G - 4, 31, 1, IRON);
  for (let x = 7; x < 34; x += 4) pick(x);
  post(4);
  post(35);
  // segment 2: x 84–108, one picket missing, one leaning, lower rail sagging
  rect(ctx, 84, G - 11, 24, 1, IRON);
  rect(ctx, 84, G - 4, 12, 1, IRON);
  line(ctx, 96, G - 4, 107, G - 2, IRON);
  for (let x = 87; x < 108; x += 4) if (x !== 95 && x !== 99) pick(x);
  line(ctx, 99, G, 102, G - 13, IRON);
  px(ctx, 102, G - 14, IRON);
  post(84);
  post(108);
}

/** Disturbed dirt mound of the knight's grave (centre GRAVE_X). */
export function drawGrave(ctx) {
  const hws = [4, 7, 9, 10, 11, 12, 12, 13, 14];
  const top = G - 7;
  hws.forEach((hw, r) => {
    const y = top + r;
    paintRow(ctx, y, GRAVE_X - hw, GRAVE_X + hw - 1, (x) => {
      const nx = (x - GRAVE_X + 0.5) / hw;
      const prevHw = hws[r - 1] ?? 0;
      const edge = Math.abs(x - GRAVE_X + 0.5) > prevHw - 0.5; // top surface pixel of this column
      const h = hash2(x, y);
      if (h < 0.07) return '#3d2616';
      if (h < 0.1) return '#9c7048';
      if (h < 0.115) return '#8a8478';
      if (edge || r === 0) return nx < 0.3 ? '#9a6c44' : '#7a5232';
      if (nx > 0.6) return '#4a2f1c';
      if (nx < -0.4 && h < 0.5) return '#8d6240';
      return '#6b4528';
    });
  });
  // cracks where the earth was pushed up
  line(ctx, GRAVE_X - 5, G - 6, GRAVE_X - 1, G - 3, '#2a180e');
  line(ctx, GRAVE_X - 1, G - 3, GRAVE_X + 4, G - 5, '#2a180e');
  line(ctx, GRAVE_X + 2, G - 4, GRAVE_X + 6, G - 1, '#2a180e');
  // scattered clods on the grass
  for (const [dx, dy, c] of [
    [-17, 0, '#6b4528'], [-16, 1, '#4a2f1c'], [-19, 2, '#7a5232'], [15, 0, '#6b4528'], [17, 2, '#4a2f1c'],
    [-22, 1, '#6b4528'], [20, 1, '#7a5232'],
  ]) {
    rect(ctx, GRAVE_X + dx, G + dy, 2, 1, c);
  }
}

/** Tombstones + cross (caller outlines this layer). */
export function drawStones(ctx) {
  for (const [shape, x] of STONES) drawStone(ctx, shape, x);
  drawCross(ctx);
}
