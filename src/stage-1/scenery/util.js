// Shared helpers for the pre-rendered scenery layers (offscreen canvases, seeded RNG, pixel spans).

/** Offscreen canvas + 2D context with smoothing off. */
export function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/** Seeded deterministic RNG (mulberry32) with small conveniences. */
export function createRng(seed) {
  let s = seed | 0;
  const next = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (a, b) => a + next() * (b - a),
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
  };
}

/** Stable 0..1 hash of an integer pair (per-pixel texture without state). */
export function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul((y | 0) + 7919, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** Ordered 4×4 dither: true on roughly fraction `f` of pixels. */
export function dither(x, y, f) {
  return f > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
}

/** Paint row y from xa..xb (inclusive) with colorFn(x, y) → css colour | null, merging runs. */
export function paintRow(ctx, y, xa, xb, colorFn) {
  if (xa > xb) return;
  let start = xa;
  let cur = colorFn(xa, y);
  for (let x = xa + 1; x <= xb + 1; x++) {
    const c = x <= xb ? colorFn(x, y) : undefined;
    if (c !== cur) {
      if (cur) {
        ctx.fillStyle = cur;
        ctx.fillRect(start, y, x - start, 1);
      }
      start = x;
      cur = c;
    }
  }
}

/** Paint a shape given as rows of [x0, x1] (relative, inclusive); colorFn(rx, ry, row). */
export function drawMask(ctx, ox, oy, rows, colorFn) {
  rows.forEach((row, ry) => {
    paintRow(ctx, oy + ry, ox + row[0], ox + row[1], (x) => colorFn(x - ox, ry, row));
  });
}

/** 1 px 4-neighbour outline around every opaque pixel of the canvas (rows < maxY only). */
export function outline(canvas, color, maxY = canvas.height) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const w = canvas.width;
  const h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const a = img.data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && a[(y * w + x) * 4 + 3] > 0;
  const n = parseInt(color.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const hits = [];
  const yMax = Math.min(h, maxY);
  for (let y = 0; y < yMax; y++) {
    for (let x = 0; x < w; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) hits.push((y * w + x) * 4);
    }
  }
  for (const i of hits) {
    a[i] = r;
    a[i + 1] = g;
    a[i + 2] = b;
    a[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

/** Fall leaf colour families: [dark, mid, light]. */
export const LEAF = {
  red: ['#6a1e1c', '#b0362a', '#de5a3c'],
  orange: ['#7a3816', '#cf6a22', '#f0983c'],
  yellow: ['#8a6418', '#d9a62c', '#f5d45e'],
  green: ['#2e4a22', '#5a7e2e', '#8cad46'],
  darkred: ['#3e0f14', '#6e1a22', '#962a2e'],
  green2: ['#1c3a1e', '#386030', '#5a8a3e'], // deep forest
  green3: ['#4a5a1e', '#7f9a32', '#b2c652'], // yellow-green
  green4: ['#22402e', '#40704a', '#6c9c5e'], // cool green
  // the rotted woods past the warning sign (Stage 2)
  violet: ['#2a1838', '#52306c', '#7e4c9a'],
  violetD: ['#1c1026', '#3a2050', '#5c3678'],
  rotgreen: ['#121e16', '#203824', '#365234'],
  moss: ['#22261a', '#3a4226', '#566034'],
};
export const LEAF_FAMILIES = ['red', 'darkred', 'orange', 'yellow', 'green'];
