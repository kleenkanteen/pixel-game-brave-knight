// Ground strip below GROUND_Y: autumn grass edge, layered soil, a path to the church door,
// wheat stubble under the field, and fallen leaves (denser under the trees).
import { GROUND_Y, VIEW_H } from '../../core/constants.js';
import { rect, px } from '../../core/draw.js';
import { CHURCH_X, WHEAT_X0, WHEAT_X1, WORLD_W } from '../layout.js';
import { createRng, dither, hash2, paintRow, LEAF, LEAF_FAMILIES } from './util.js';
import { BACK_TREES, MID_TREES } from './trees.js';

const G = GROUND_Y;

function groundColor(x, y) {
  const d = y - G;
  const inWheat = x >= WHEAT_X0 - 2 && x < WHEAT_X1 + 2;
  const pathHW = 9 + d * 0.7;
  const onPath = Math.abs(x - CHURCH_X + 0.5) < pathHW && d < 22 && !(d > 14 && dither(x, y, (d - 14) / 8));
  const h = hash2(x, y);
  if (onPath) return d === 0 ? '#a08360' : dither(x, y, 0.3) ? '#8f7351' : '#9c7f5c';
  if (d === 0) {
    if (inWheat) return h < 0.5 ? '#b0903e' : '#9a7a32';
    return h < 0.25 ? '#8f8a3a' : '#7a8a3a';
  }
  if (d === 1) return inWheat ? '#7e6230' : h < 0.3 ? '#6e6a2c' : '#5e6e2e';
  if (inWheat && d < 5 && h < 0.25) return '#b0903e'; // stubble
  if (h < 0.02) return '#958676'; // pebble
  if (h < 0.06) return '#7d5b3b';
  if (dither(x, y, Math.min(0.9, (d - 2) / 30))) return dither(x + 2, y, (d - 14) / 30) ? '#453020' : '#563c27';
  return '#6a4c31';
}

export function drawGround(ctx) {
  for (let y = G; y < VIEW_H; y++) paintRow(ctx, y, 0, WORLD_W - 1, groundColor);

  const rng = createRng(99);
  // grass blades poking above the ground line (not on the path / wheat)
  for (let x = 0; x < WORLD_W; x++) {
    if (Math.abs(x - CHURCH_X) < 10 || (x >= WHEAT_X0 && x < WHEAT_X1)) continue;
    if (!rng.chance(0.3)) continue;
    const c = rng.pick(['#7a8a3a', '#9a8a40', '#5e6e2e']);
    rect(ctx, x, G - (rng.chance(0.3) ? 2 : 1), 1, rng.chance(0.3) ? 2 : 1, c);
  }

  // fallen leaves: clustered under trees, a sprinkle everywhere
  const trees = [...BACK_TREES, ...MID_TREES];
  const leaf = (x, y) => {
    const f = LEAF[rng.pick(LEAF_FAMILIES)];
    if (rng.chance(0.6)) {
      rect(ctx, x, y, 2, 1, f[1]);
      px(ctx, x + (rng.chance(0.5) ? 0 : 1), y, rng.chance(0.5) ? f[2] : f[0]);
    } else px(ctx, x, y, f[rng.int(1, 2)]);
  };
  for (let i = 0; i < 260; i++) {
    const t = rng.pick(trees);
    const x = Math.round(t.x + (rng.next() - rng.next()) * t.r * 2.4);
    const y = G + Math.floor(rng.next() ** 1.8 * 28);
    if (x >= 0 && x < WORLD_W) leaf(x, y);
  }
  for (let i = 0; i < 70; i++) leaf(rng.int(0, WORLD_W - 2), G + Math.floor(rng.next() ** 1.5 * 28));
}
