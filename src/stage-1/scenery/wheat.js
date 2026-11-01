// Wheat field x WHEAT_X0–WHEAT_X1: static dense body (pre-rendered into the world layer),
// animated swaying stalks (back layer) and a few foreground tufts (front layer).
// Each stalk sprite is pre-rendered for 5 lean values; per frame we only pick + blit.
import { GROUND_Y, VIEW_W } from '../../core/constants.js';
import { WHEAT_X0, WHEAT_X1 } from '../layout.js';
import { makeCanvas, createRng, dither, hash2, paintRow } from './util.js';

const G = GROUND_Y;
const LEANS = [-2, -1, 0, 1, 2];
const SPR_W = 11;
const SPR_CX = 5;

const PALS = [
  { stemD: '#9a7a2a', stem: '#c2a040', head: '#e8c25a', headD: '#c0902e', headHi: '#fae08a', awn: '#f0dc9a' },
  { stemD: '#8a6a24', stem: '#a88a36', head: '#d4aa48', headD: '#a87c28', headHi: '#ecd078', awn: '#dcc488' },
  { stemD: '#6e501a', stem: '#9a7a2a', head: '#d9a83e', headD: '#9a6c20', headHi: '#f0c860', awn: '#e8cc80' },
];

function buildStalk(h, pal, lean) {
  const H = h + 3;
  const { canvas, ctx } = makeCanvas(SPR_W, H);
  const p = (x, y, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  };
  const dxAt = (i) => Math.round(lean * (i / h) ** 2);
  const headLen = Math.min(6, Math.max(3, Math.round(h / 3.5)));
  for (let i = 0; i < h; i++) {
    const x = SPR_CX + dxAt(i);
    const y = H - 1 - i;
    if (i < h - headLen) {
      p(x, y, i < h * 0.4 ? pal.stemD : pal.stem);
      if (i === Math.floor(h * 0.35)) {
        const s = lean >= 0 ? 1 : -1;
        p(x + s, y, pal.stem);
        p(x + 2 * s, y - 1, pal.stem);
      }
    } else if (i === h - 1) {
      p(x, y, pal.headHi);
    } else {
      const odd = (h - i) % 2;
      p(x - 1, y, odd ? pal.head : pal.headHi);
      p(x, y, pal.headD);
      p(x + 1, y, odd ? pal.headD : pal.head);
    }
  }
  const tx = SPR_CX + dxAt(h - 1);
  const s = lean > 0 ? 1 : lean < 0 ? -1 : 0;
  p(tx + s, 1, pal.awn);
  p(tx + 2 * s, 0, pal.awn);
  p(tx - 1 - s, 2, pal.awn);
  return canvas;
}

const cache = new Map();
function spriteSet(h, palIdx) {
  const key = h * 10 + palIdx;
  if (!cache.has(key)) cache.set(key, LEANS.map((l) => buildStalk(h, PALS[palIdx], l)));
  return cache.get(key);
}

/** Wind: a travelling wave with slow gusts, biased slightly to the right. → lean index 0..4 */
function leanIndex(x, t) {
  const gust = 0.6 + 0.4 * Math.sin(t * 0.45);
  const v = Math.sin(t * 1.7 - x * 0.07) * 1.6 * gust + 0.45 * gust;
  return Math.max(-2, Math.min(2, Math.round(v))) + 2;
}

/** Static dense lower body of the field (drawn into the world layer). */
export function drawWheatBody(ctx) {
  for (let x = WHEAT_X0; x < WHEAT_X1; x++) {
    const edge = Math.min(x - WHEAT_X0, WHEAT_X1 - 1 - x);
    const top = G - Math.min(10 + Math.floor(hash2(x, 3) * 3), 4 + edge * 2);
    for (let y = top; y < G; y++) {
      paintRow(ctx, y, x, x, () => {
        if (y === top) return '#e0bc52';
        const col = (x * 7 + Math.floor(hash2(x, 9) * 3)) % 3;
        if (dither(x, y, (y - top) / 14)) return '#8a6a22';
        return ['#c99f3a', '#b98f2c', '#a67e26'][col];
      });
    }
  }
}

export function createWheat() {
  const rng = createRng(4242);
  const back = [];
  for (let x = WHEAT_X0 + 1; x < WHEAT_X1 - 1; x += 2) {
    if (!rng.chance(0.9)) continue;
    const edge = Math.min(x - WHEAT_X0, WHEAT_X1 - x);
    const h = edge < 6 ? 15 : rng.pick([19, 21, 23, 25]);
    back.push({ x: x + rng.int(0, 1), base: G - 3, set: spriteSet(h, 1), ph: 7 });
  }
  for (let x = WHEAT_X0 + 2; x < WHEAT_X1 - 2; x += 3) {
    const edge = Math.min(x - WHEAT_X0, WHEAT_X1 - x);
    const h = edge < 6 ? 13 : rng.pick([15, 17, 19, 21]);
    back.push({ x: x + rng.int(0, 1), base: G, set: spriteSet(h, 0), ph: 0 });
  }
  const front = [];
  for (const cx of [243, 264, 292, 318, 347, 371, 389]) {
    const n = rng.int(3, 5);
    for (let i = 0; i < n; i++) {
      front.push({ x: cx + rng.int(-4, 4), base: G + rng.int(5, 8), set: spriteSet(rng.pick([8, 10, 12]), 2), ph: 3 });
    }
  }
  front.sort((a, b) => a.base - b.base);

  const draw = (ctx, list, camX, t) => {
    for (const s of list) {
      const sx = s.x - camX;
      if (sx < -SPR_W || sx > VIEW_W + SPR_W) continue;
      const img = s.set[leanIndex(s.x + s.ph, t)];
      ctx.drawImage(img, sx - SPR_CX, s.base - img.height);
    }
  };
  return {
    renderBack: (ctx, camX, t) => draw(ctx, back, camX, t),
    renderFront: (ctx, camX, t) => draw(ctx, front, camX, t),
  };
}
