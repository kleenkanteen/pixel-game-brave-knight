// Screen-space sky (dithered warm bands + low sun), drifting pixel clouds, and parallax hills.
import { VIEW_W, VIEW_H } from '../../core/constants.js';
import { disc } from '../../core/draw.js';
import { WORLD_W } from '../layout.js';
import { makeCanvas, createRng, dither, paintRow, hash2, LEAF } from './util.js';

const SKY = ['#5b86c4', '#6e98cf', '#86abd8', '#a3bfdc', '#c2cfd6', '#dccfbc', '#ebc69c', '#f2b680', '#f0a46c'];
const BAND_H = 13;

/** Static sky: bands with a 4-row ordered-dither blend into the next band, plus a low warm sun. */
export function buildSky() {
  const { canvas, ctx } = makeCanvas(VIEW_W, VIEW_H);
  for (let y = 0; y < VIEW_H; y++) {
    const i = Math.floor(y / BAND_H);
    const frac = (y % BAND_H) / BAND_H;
    const a = SKY[Math.min(i, SKY.length - 1)];
    const b = SKY[Math.min(i + 1, SKY.length - 1)];
    const blend = frac > 0.6 ? (frac - 0.6) / 0.4 : 0;
    paintRow(ctx, y, 0, VIEW_W - 1, (x) => (blend > 0 && dither(x, y, blend * 0.75) ? b : a));
  }
  // sun with dithered halo
  const sx = 262;
  const sy = 46;
  for (let y = sy - 15; y <= sy + 15; y++) {
    paintRow(ctx, y, sx - 15, sx + 15, (x) => {
      const d = Math.hypot(x - sx, y - sy);
      if (d <= 5) return '#fffbe6';
      if (d <= 7) return '#fff1c4';
      if (d <= 10 && dither(x, y, 0.6)) return '#fbe2ac';
      if (d <= 14 && dither(x, y, 0.25)) return '#f6d6a2';
      return null;
    });
  }
  return canvas;
}

function buildCloud(rng, w) {
  const h = 16;
  const { canvas, ctx } = makeCanvas(w + 2, h);
  const yb = h - 4; // flat underside row
  const puffs = [];
  for (let x = 4; x < w - 2; x += rng.int(3, 6)) {
    const r = Math.max(2, Math.min(rng.int(3, 6), x - 1, w - x));
    puffs.push({ x, r, cy: yb - r + 2 - (r > 4 ? 1 : 0) });
  }
  for (const p of puffs) disc(ctx, p.x, p.cy + 1, p.r, '#efc9b0');
  for (const p of puffs) disc(ctx, p.x, p.cy, p.r, '#fdf3e6');
  for (const p of puffs) if (p.r >= 4) disc(ctx, p.x - 1, p.cy - 1, Math.round(p.r * 0.45), '#ffffff');
  ctx.clearRect(0, yb + 2, w + 2, h);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = '#efc9b0';
  ctx.fillRect(0, yb, w + 2, 2);
  ctx.globalCompositeOperation = 'source-over';
  return canvas;
}

/** A few clouds; each drifts left slowly and wraps. */
export function buildClouds() {
  const rng = createRng(31);
  const defs = [
    { w: 34, y: 16, x: 20, v: 2.2 },
    { w: 22, y: 32, x: 125, v: 1.5 },
    { w: 40, y: 10, x: 210, v: 2.7 },
    { w: 18, y: 44, x: 305, v: 1.2 },
  ];
  return defs.map((d) => ({ ...d, img: buildCloud(rng, d.w) }));
}

export function drawClouds(ctx, clouds, camX, t) {
  const span = VIEW_W + 70;
  for (const c of clouds) {
    const raw = c.x - t * c.v - camX * 0.1;
    const sx = (((raw % span) + span) % span) - 50;
    ctx.drawImage(c.img, Math.round(sx), c.y);
  }
}

/** Far (0.25×) hazy hills and near (0.5×) autumn hills with tiny distant trees. */
export function buildHills(worldW = WORLD_W) {
  const range = worldW - VIEW_W;

  const farW = VIEW_W + Math.ceil(range * 0.25) + 2;
  const far = makeCanvas(farW, VIEW_H);
  for (let x = 0; x < farW; x++) {
    const top = Math.round(104 + 6 * Math.sin(x * 0.021 + 1) + 4 * Math.sin(x * 0.053 + 2) + 2 * Math.sin(x * 0.11));
    for (let y = top; y < VIEW_H; y++) {
      const c = y === top ? '#bba3ae' : dither(x, y, (y - top) / 40) ? '#8f7d96' : '#9c88a0';
      far.ctx.fillStyle = c;
      far.ctx.fillRect(x, y, 1, 1);
    }
  }

  const nearW = VIEW_W + Math.ceil(range * 0.5) + 2;
  const near = makeCanvas(nearW, VIEW_H);
  const prof = [];
  for (let x = 0; x < nearW; x++) {
    prof[x] = Math.round(124 + 7 * Math.sin(x * 0.017 + 0.5) + 4 * Math.sin(x * 0.045 + 1.3) + 2 * Math.sin(x * 0.13));
  }
  for (let x = 0; x < nearW; x++) {
    const top = prof[x];
    for (let y = top; y < VIEW_H; y++) {
      const d = y - top;
      let c = d === 0 ? '#d1b064' : dither(x, y, d / 26) ? '#8e7038' : '#a8873f';
      if (d > 1 && hash2(x, y) < 0.05) c = '#b8964a';
      near.ctx.fillStyle = c;
      near.ctx.fillRect(x, y, 1, 1);
    }
  }
  // distant tree clumps sitting on the near ridge
  const rng = createRng(5);
  const fams = ['red', 'orange', 'yellow', 'green', 'orange'];
  for (let x = 6; x < nearW - 4; x += rng.int(9, 22)) {
    const f = LEAF[rng.pick(fams)];
    const y = prof[x];
    const big = rng.chance(0.5);
    near.ctx.fillStyle = '#4a3428';
    near.ctx.fillRect(x, y - 2, 1, 3);
    near.ctx.fillStyle = f[0];
    near.ctx.fillRect(x - (big ? 2 : 1), y - (big ? 4 : 3), big ? 5 : 3, 2);
    near.ctx.fillStyle = f[1];
    near.ctx.fillRect(x - 1, y - (big ? 6 : 4), 3, big ? 2 : 1);
    if (big) near.ctx.fillRect(x - 2, y - 5, 4, 1);
    near.ctx.fillStyle = f[2];
    near.ctx.fillRect(x - 1, y - (big ? 6 : 4), 1, 1);
  }
  return { far: far.canvas, near: near.canvas };
}
