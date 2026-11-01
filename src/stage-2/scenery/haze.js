// The weather turns past the warning sign: a violet-grey haze over the far scenery, a thinner one
// over everything, and slow mist wisps along the ground — all ramping in with rotAt(x).
import { VIEW_W, VIEW_H, GROUND_Y } from '../../core/constants.js';
import { makeCanvas, createRng, dither } from '../../stage-1/scenery/util.js';
import { WORLD_W, rotAt } from '../layout.js';

const HAZE = [74, 66, 92];

/**
 * World-space haze layer: alpha = rot × (heavier up high, where the sky dims).
 * opts default to Stage 2's world; another Stage passes its own width / rot.
 */
export function buildHaze(strength, { width = WORLD_W, rot = rotAt } = {}) {
  const { canvas, ctx } = makeCanvas(width, VIEW_H);
  const img = ctx.createImageData(width, VIEW_H);
  const a = img.data;
  for (let x = 0; x < width; x++) {
    const r = rot(x);
    if (r <= 0) continue;
    for (let y = 0; y < VIEW_H; y++) {
      const i = (y * width + x) * 4;
      a[i] = HAZE[0];
      a[i + 1] = HAZE[1];
      a[i + 2] = HAZE[2];
      a[i + 3] = Math.round(255 * r * strength * (1 - 0.35 * (y / VIEW_H)));
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function buildWisp(rng, w, h) {
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = '#9a90a8';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = ((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2;
      if (d < 1 && dither(x, y, (1 - d) * 0.7 + rng.range(-0.05, 0.05))) ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

/**
 * Drifting mist wisps in the rotted woods, wrapping between world x0 and width.
 * opts default to Stage 2's world (mist past the sign).
 */
export function createMist({ x0 = 440, width = WORLD_W, rot = rotAt, n = 9, seed = 909 } = {}) {
  const rng = createRng(seed);
  const wisps = [];
  for (let i = 0; i < n; i++) {
    const w = rng.int(50, 90);
    wisps.push({ x: rng.range(x0 + 40, width), y: rng.int(GROUND_Y - 22, GROUND_Y + 4), v: rng.range(2, 5), img: buildWisp(rng, w, rng.int(6, 10)), w });
  }
  const span = width - x0;

  function render(ctx, camX, t) {
    for (const m of wisps) {
      const wx = x0 + ((((m.x - x0 - t * m.v) % span) + span) % span);
      const sx = Math.round(wx - camX);
      if (sx > VIEW_W || sx + m.w < 0) continue;
      const prev = ctx.globalAlpha;
      ctx.globalAlpha = 0.22 * rot(wx + m.w / 2);
      ctx.drawImage(m.img, sx, m.y);
      ctx.globalAlpha = prev;
    }
  }
  return { render };
}
