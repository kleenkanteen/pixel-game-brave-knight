// Pixel helpers: everything snaps to integer coordinates.

/** Filled rectangle at integer coords. */
export function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Single pixel. */
export function px(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

/** 1px rectangle outline. */
export function strokeRect(ctx, x, y, w, h, color) {
  rect(ctx, x, y, w, 1, color);
  rect(ctx, x, y + h - 1, w, 1, color);
  rect(ctx, x, y, 1, h, color);
  rect(ctx, x + w - 1, y, 1, h, color);
}

/** Bresenham line of `size`×`size` dots between two points. */
export function line(ctx, x0, y0, x1, y1, color, size = 1) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  ctx.fillStyle = color;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    ctx.fillRect(x0, y0, size, size);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

/** Filled pixel disc (for leaves, bushes, round windows). */
export function disc(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  cx = Math.round(cx);
  cy = Math.round(cy);
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy) + 0.3);
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}

/** Run `fn` with ctx.globalAlpha multiplied by `alpha`. */
export function withAlpha(ctx, alpha, fn) {
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * Math.max(0, Math.min(1, alpha));
  fn();
  ctx.globalAlpha = prev;
}
