// Shared painters for Stage 5's castle: stone walls, battlements, arches, windows, round towers,
// roofs. Everything is drawn in WORLD coords into pre-rendered layers. Lit windows and glowing
// runes go to a separate `glow` layer that the moonlight tint doesn't dim.
import { rect, px } from '../../core/draw.js';
import { hash2 } from '../../stage-1/scenery/util.js';

/** Stone palettes: the outer walls (paler) and the Dark Lord's inner castle (darker, colder). */
export const STONE = { base: '#6c6678', light: '#8a849c', dark: '#524c60', mortar: '#3a3446', moss: '#4a5a3a', shade: '#443e50' };
export const DARK_STONE = { base: '#4e4858', light: '#686278', dark: '#3c3646', mortar: '#28232f', moss: '#3a4632', shade: '#322c3a' };
export const SLATE = { base: '#3a3048', light: '#544864', dark: '#262030' };
export const WOOD = { base: '#6b4428', light: '#8a5a34', dark: '#432a18' };
export const IRON = { base: '#3a3a44', light: '#62626e', dark: '#1e1e26' };
export const LIT = { pane: '#f2c25a', paneL: '#ffe9a0', paneD: '#c8823a', bar: '#6a4020' };
export const VIOLET = { pane: '#8a3ae0', paneL: '#e0a0ff', paneD: '#4a1a7a', red: '#c02a4a' };

/**
 * A brick wall over [x0, x1) × [y0, y1): courses of `bh` px, bricks `bw` wide (alternate rows
 * offset half a brick), each a slightly different shade, mortar lines between, light on the top
 * edge, now and then a crack or moss. `lightSide` > 0 brightens the right part (the moon's side).
 */
export function stoneWall(ctx, x0, y0, x1, y1, P, { bw = 9, bh = 5, seed = 0, moss = 0.03 } = {}) {
  ctx.fillStyle = P.mortar;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  for (let row = 0, y = y0; y < y1; row++, y += bh) {
    const off = row % 2 ? Math.floor(bw / 2) : 0;
    for (let x = x0 - off; x < x1; x += bw) {
      const h = hash2(Math.floor(x / bw) + seed * 31, row + seed * 17);
      const c = h < 0.18 ? P.dark : h > 0.86 ? P.light : P.base;
      const l = Math.max(x0, x);
      const r = Math.min(x1, x + bw - 1);
      const b = Math.min(y1, y + bh - 1);
      if (r <= l || b <= y) continue;
      rect(ctx, l, y, r - l, b - y, c);
      rect(ctx, l, y, r - l, 1, h > 0.5 ? P.light : c); // lit top edge
      if (h > 0.93) px(ctx, l + Math.floor(h * 5) % Math.max(1, r - l), y + 1, P.mortar); // chip
      if (h < moss && b - y > 1) rect(ctx, l, b - 1, Math.min(3, r - l), 1, P.moss);
    }
  }
}

/** Merlons standing on top edge y (5 wide, 6 tall, every 9 px) with a lit cap. */
export function battlements(ctx, x0, x1, y, P, { w = 5, h = 6, gap = 4 } = {}) {
  for (let x = x0; x + w <= x1; x += w + gap) {
    rect(ctx, x, y - h, w, h, P.base);
    rect(ctx, x, y - h, w, 1, P.light);
    rect(ctx, x + w - 1, y - h + 1, 1, h - 1, P.dark);
  }
  rect(ctx, x0, y - 1, x1 - x0, 1, P.dark);
}

/** Round-topped opening: straight sides from `bottom` up to the arch, a semicircle on top. */
export function archShape(cx, w, top, bottom, fn) {
  const r = w / 2;
  for (let y = Math.floor(top); y < bottom; y++) {
    let half = r;
    if (y < top + r) {
      const dy = top + r - y - 0.5;
      half = Math.sqrt(Math.max(0, r * r - dy * dy));
    }
    fn(Math.round(cx - half), y, Math.round(half * 2));
  }
}

/** A dark arched recess / passage, with a stone voussoir rim. */
export function arch(ctx, cx, w, top, bottom, inner, P) {
  archShape(cx, w + 4, top - 2, bottom, (x, y, ww) => rect(ctx, x, y, ww, 1, P.dark));
  archShape(cx, w + 2, top - 1, bottom, (x, y, ww) => {
    rect(ctx, x, y, 1, 1, P.light);
    rect(ctx, x + ww - 1, y, 1, 1, P.base);
  });
  archShape(cx, w, top, bottom, (x, y, ww) => rect(ctx, x, y, ww, 1, inner));
}

/**
 * A window: stone frame in `base`, the pane in `glow` when lit (warm, or violet stained glass),
 * else dark. Pointed (gothic) top when `pointed`.
 */
export function windowAt(base, glow, x, y, w, h, { lit = true, pointed = true, glass = LIT, frame = STONE } = {}) {
  rect(base, x - 1, y - 1, w + 2, h + 2, frame.dark);
  rect(base, x - 1, y + h, w + 2, 1, frame.light); // sill
  const paneRow = (yy, l, ww) => {
    if (!lit) {
      rect(base, l, yy, ww, 1, '#12101c');
      return;
    }
    const t = (yy - y) / h;
    rect(glow, l, yy, ww, 1, t < 0.3 ? glass.paneL : t > 0.8 ? glass.paneD : glass.pane);
  };
  for (let yy = y; yy < y + h; yy++) {
    let l = x;
    let ww = w;
    if (pointed && yy < y + w / 2) {
      const k = (yy - y + 1) / (w / 2);
      ww = Math.max(1, Math.round(w * Math.sqrt(k)));
      l = x + Math.round((w - ww) / 2);
    }
    paneRow(yy, l, ww);
  }
  if (lit && w >= 3) {
    rect(glow, x + Math.floor(w / 2), y + 1, 1, h - 1, glass.paneD); // mullion
    rect(glow, x, y + Math.round(h * 0.55), w, 1, glass.paneD); // transom
  }
}

/**
 * A round tower over [x0, x1) from `top` down to `bottom`: brick courses shaded like a cylinder
 * (dark on the left, moonlit on the right).
 */
export function roundTower(ctx, x0, x1, top, bottom, P, seed = 0) {
  const w = x1 - x0;
  for (let x = x0; x < x1; x++) {
    const u = (x - x0 + 0.5) / w; // 0..1 across
    const lightK = Math.sin(u * Math.PI) * 0.6 + u * 0.5; // brightest right of centre
    for (let y = top; y < bottom; y++) {
      const course = Math.floor((y - top) / 5);
      const brick = Math.floor((x - x0 + (course % 2) * 4) / 8);
      const mortar = (y - top) % 5 === 4 || (x - x0 + (course % 2) * 4) % 8 === 0;
      const h = hash2(brick + seed * 13, course + seed * 7);
      let c = lightK > 0.85 ? P.light : lightK > 0.45 ? P.base : lightK > 0.25 ? P.dark : P.shade;
      if (h < 0.12 && !mortar) c = P.dark;
      if (mortar) c = P.mortar;
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

/** A conical slate roof on [x0, x1) whose base is at y, `h` tall, a little finial on top. */
export function coneRoof(ctx, x0, x1, y, h, P = SLATE) {
  const cx = (x0 + x1) / 2;
  const half = (x1 - x0) / 2 + 2;
  for (let yy = 0; yy < h; yy++) {
    const k = (yy + 1) / h;
    const hw = Math.round(half * k);
    const row = y - h + yy;
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const u = (x - (cx - hw)) / Math.max(1, hw * 2);
      const tile = (Math.floor(x / 3) + yy) % 4 === 0;
      ctx.fillStyle = u > 0.62 ? P.light : u < 0.2 ? P.dark : tile ? P.dark : P.base;
      ctx.fillRect(x, row, 1, 1);
    }
  }
  rect(ctx, Math.round(cx), y - h - 5, 1, 5, IRON.light);
  px(ctx, Math.round(cx), y - h - 6, '#c8a040');
}

/** A gabled roof over [x0, x1) from eave y up to a ridge `h` above. */
export function gableRoof(ctx, x0, x1, y, h, P = SLATE) {
  const cx = (x0 + x1) / 2;
  const half = (x1 - x0) / 2;
  for (let yy = 0; yy < h; yy++) {
    const hw = Math.round((half * (yy + 1)) / h);
    const row = y - h + yy;
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const right = x > cx;
      const tile = (Math.floor((x + (yy % 2) * 2) / 4) + yy) % 3 === 0;
      ctx.fillStyle = right ? (tile ? P.base : P.light) : tile ? P.dark : P.base;
      ctx.fillRect(x, row, 1, 1);
    }
  }
}

/** A hanging banner: deep purple cloth with a gold horned-eye sigil, a swallowtail hem. */
export function banner(ctx, x, y, w, h) {
  rect(ctx, x - 1, y - 1, w + 2, 2, WOOD.dark); // pole
  const mid = x + Math.floor(w / 2);
  for (let yy = 0; yy < h; yy++) {
    const notch = Math.max(0, yy - (h - 5)); // the swallowtail cut, widening to the hem
    if (!notch) {
      rect(ctx, x, y + yy, w, 1, '#4a1a6a');
      rect(ctx, x, y + yy, 1, 1, '#6a2a8a');
      rect(ctx, x + w - 1, y + yy, 1, 1, '#2e0e44');
    } else {
      rect(ctx, x, y + yy, Math.max(0, mid - notch - x), 1, '#4a1a6a');
      rect(ctx, mid + notch, y + yy, Math.max(0, x + w - mid - notch), 1, '#3a1252');
    }
  }
  rect(ctx, x + 1, y + 2, w - 2, 1, '#8a6a24'); // gold hem
  // sigil: a horned eye
  const cy = y + Math.floor(h * 0.4);
  rect(ctx, mid - 2, cy, 5, 1, '#c8a040');
  rect(ctx, mid - 1, cy - 1, 3, 3, '#c8a040');
  px(ctx, mid, cy, '#e070ff');
  px(ctx, mid - 3, cy - 2, '#c8a040');
  px(ctx, mid + 2, cy - 2, '#c8a040');
  px(ctx, mid - 3, cy - 3, '#8a6a24');
  px(ctx, mid + 2, cy - 3, '#8a6a24');
}
