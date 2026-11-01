// Drifting falling leaves: deterministic (seeded) particles whose position is a pure function of t.
// Each leaf falls from a canopy, tumbles (4 frames), sways, then rests on the ground and fades.
import { GROUND_Y, VIEW_W } from '../../core/constants.js';
import { rect, px, withAlpha } from '../../core/draw.js';
import { createRng, LEAF } from './util.js';

const FAMS = ['red', 'orange', 'yellow', 'green', 'red', 'yellow', 'orange'];

/**
 * @param {{n?:number, x0?:number, x1?:number, fams?:string[], seed?:number}} [opts]
 *   n leaves starting between world x0 and x1, coloured from the LEAF families `fams`
 */
export function createLeaves({ n = 42, x0 = -10, x1 = 250, fams = FAMS, seed = 777 } = {}) {
  const rng = createRng(seed);
  const leaves = [];
  for (let i = 0; i < n; i++) {
    const front = i % 3 === 0;
    const y0 = rng.range(46, 104);
    const y1 = GROUND_Y + (front ? rng.range(9, 27) : rng.range(1, 10));
    const speed = rng.range(8, 15);
    const fall = (y1 - y0) / speed;
    const rest = rng.range(1, 2.5);
    leaves.push({
      front,
      x0: rng.range(x0, x1),
      y0,
      y1,
      speed,
      fall,
      period: fall + rest,
      rest,
      drift: rng.range(8, 30),
      amp: rng.range(2, 6),
      w: rng.range(1.2, 2.4),
      spin: rng.range(3, 7),
      ph: rng.next(),
      col: LEAF[rng.pick(fams)],
    });
  }

  function render(ctx, camX, t, front) {
    for (const L of leaves) {
      if (L.front !== front) continue;
      const local = (t + L.ph * L.period) % L.period;
      const falling = local < L.fall;
      const tf = falling ? t : t - (local - L.fall); // time it landed
      const p = falling ? local / L.fall : 1;
      const x = L.x0 + L.drift * p + Math.sin(tf * L.w + L.ph * 6.28) * L.amp;
      const y = Math.round(falling ? L.y0 + local * L.speed : L.y1);
      const sx = Math.round(x - camX);
      if (sx < -2 || sx > VIEW_W + 1) continue;
      const alpha = falling ? Math.min(1, local / 0.5) : 1 - (local - L.fall) / L.rest;
      const frame = falling ? Math.floor(t * L.spin + L.ph * 7) & 3 : 0;
      const [dark, mid, light] = L.col;
      withAlpha(ctx, alpha, () => {
        switch (frame) {
          case 0:
            rect(ctx, sx, y, 2, 1, mid);
            px(ctx, sx + 1, y, dark);
            break;
          case 1:
            px(ctx, sx, y, light);
            px(ctx, sx + 1, y + 1, mid);
            break;
          case 2:
            px(ctx, sx, y, mid);
            px(ctx, sx, y + 1, dark);
            break;
          default:
            px(ctx, sx + 1, y, light);
            px(ctx, sx, y + 1, mid);
        }
      });
    }
  }
  return { render };
}
