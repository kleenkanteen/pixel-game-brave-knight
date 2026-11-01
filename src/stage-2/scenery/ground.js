// Stage 2 ground: autumn grass and soil on the practice range, turning dark and sour past the
// warning sign (dithered blend), with fallen leaves to match.
import { GROUND_Y, VIEW_H } from '../../core/constants.js';
import { rect, px } from '../../core/draw.js';
import { createRng, dither, hash2, paintRow, LEAF } from '../../stage-1/scenery/util.js';
import { WORLD_W, rotAt } from '../layout.js';

const G = GROUND_Y;

const FALL = {
  top: ['#8f8a3a', '#7a8a3a'],
  edge: ['#6e6a2c', '#5e6e2e'],
  soil: '#6a4c31',
  soilD: ['#563c27', '#453020'],
  speck: ['#958676', '#7d5b3b'],
};
const ROT = {
  top: ['#3a3e2a', '#2e3626'],
  edge: ['#262c1e', '#20261a'],
  soil: '#2c2224',
  soilD: ['#221a1e', '#181216'],
  speck: ['#4a4450', '#3a2a2c'],
};

function groundColor(x, y, rot) {
  const d = y - G;
  const P = dither(x, y, rot(x)) ? ROT : FALL;
  const h = hash2(x, y);
  if (d === 0) return h < 0.25 ? P.top[0] : P.top[1];
  if (d === 1) return h < 0.3 ? P.edge[0] : P.edge[1];
  if (h < 0.02) return P.speck[0];
  if (h < 0.06) return P.speck[1];
  if (dither(x, y, Math.min(0.9, (d - 2) / 30))) return dither(x + 2, y, (d - 14) / 30) ? P.soilD[1] : P.soilD[0];
  return P.soil;
}

/**
 * @param {{width?:number, rot?:(x:number)=>number, seed?:number}} [opts]  defaults: Stage 2's world
 *   (another Stage passes its own width and rot, e.g. () => 1 for woods rotted all the way)
 */
export function drawGround(ctx, { width = WORLD_W, rot = rotAt, seed = 202 } = {}) {
  for (let y = G; y < VIEW_H; y++) paintRow(ctx, y, 0, width - 1, (x, yy) => groundColor(x, yy, rot));

  const rng = createRng(seed);
  // grass blades: yellow-green on the range, dead grey-green in the rot
  for (let x = 0; x < width; x++) {
    if (!rng.chance(0.3)) continue;
    const rotted = rng.next() < rot(x);
    const c = rotted ? rng.pick(['#3a3e2a', '#4a4a34', '#2a3020']) : rng.pick(['#7a8a3a', '#9a8a40', '#5e6e2e']);
    rect(ctx, x, G - (rng.chance(rotted ? 0.5 : 0.3) ? 2 : 1), 1, rng.chance(0.3) ? 2 : 1, c);
  }

  // fallen leaves
  const fall = ['red', 'darkred', 'orange', 'yellow', 'green'];
  const rotFams = ['violet', 'violetD', 'rotgreen', 'moss'];
  for (let i = 0; i < Math.round((420 * width) / WORLD_W); i++) {
    const x = rng.int(0, width - 2);
    const y = G + Math.floor(rng.next() ** 1.7 * 28);
    const f = LEAF[rng.pick(rng.next() < rot(x) ? rotFams : fall)];
    if (rng.chance(0.6)) {
      rect(ctx, x, y, 2, 1, f[1]);
      px(ctx, x + (rng.chance(0.5) ? 0 : 1), y, rng.chance(0.5) ? f[2] : f[0]);
    } else px(ctx, x, y, f[rng.int(1, 2)]);
  }
}
