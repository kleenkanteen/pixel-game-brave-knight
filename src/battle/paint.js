// Local-coordinate painter for battle characters: art is authored facing right in a W-wide box
// and mirrored for facing −1 (same convention as the Brave Knight's art). Internal to the battle slice.
import { rect, line } from '../core/draw.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} ox  left edge of the sprite box (world px)
 * @param {number} oy  top edge of the sprite box (world px)
 * @param {number} W   sprite box width
 * @param {1|-1} f     facing
 */
export function painter(ctx, ox, oy, W, f) {
  const X = (lx, w = 1) => (f === 1 ? ox + lx : ox + W - lx - w);
  /** Filled rect at local coords. */
  const P = (lx, ly, w, h, c) => rect(ctx, X(lx, w), oy + ly, w, h, c);
  /** One pixel at local coords. */
  const D = (lx, ly, c) => rect(ctx, X(Math.round(lx)), oy + Math.round(ly), 1, 1, c);
  /** `size`-px line between local points. */
  const L = (x0, y0, x1, y1, c, size = 1) =>
    line(ctx, X(Math.round(x0), size), oy + Math.round(y0), X(Math.round(x1), size), oy + Math.round(y1), c, size);
  /** World x of a local x (for effects anchored to a body part). */
  const wx = (lx) => X(lx);
  return { P, D, L, wx };
}

/** Filled pixel ellipse (world coords). */
export function ellipse(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  cx = Math.round(cx);
  cy = Math.round(cy);
  for (let dy = -ry; dy <= ry; dy++) {
    const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)) + 0.3);
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}
