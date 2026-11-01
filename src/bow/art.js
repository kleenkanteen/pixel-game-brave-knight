// Bow + arrow pixel art, drawn along arbitrary angles. Internal to the bow slice.
import { px, rect, withAlpha } from '../core/draw.js';

export const C = {
  wood: '#8a5430',
  woodL: '#b77a44',
  woodD: '#4e2c16',
  grip: '#3a2414',
  string: '#efe6d2',
  shaft: '#a8743e',
  shaftD: '#6e4622',
  head: '#c9d0dc',
  headD: '#7d8597',
  fletch: '#e8e2d4',
  fletchR: '#c8323c',
  shadow: 'rgba(20,14,10,0.35)',
  glint: '#ffffff',
};

/** Arrow length in px, tip → nock. */
export const ARROW_LEN = 11;
/** Half the bow's length (grip → each tip). */
export const BOW_HALF = 7;

/**
 * Arrow with its TIP at (x, y) pointing along angle `ang` (world radians, 0 = right, + = down).
 * `hidden(i, x, y)` → true skips that pixel (buried in the ground / a target).
 */
export function drawArrow(ctx, x, y, ang, hidden = null) {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const nx = -dy;
  const ny = dx;
  const dot = (i, s, c) => {
    const X = x - dx * i + nx * s;
    const Y = y - dy * i + ny * s;
    if (hidden?.(i, X, Y)) return;
    px(ctx, X, Y, c);
  };
  // steel head with barbs
  dot(0, 0, C.head);
  dot(1, 0, C.head);
  dot(2, 0.9, C.headD);
  dot(2, -0.9, C.headD);
  // shaft
  for (let i = 2; i < ARROW_LEN - 2; i++) dot(i, 0, i % 3 === 0 ? C.shaftD : C.shaft);
  // fletching at the tail
  for (let i = ARROW_LEN - 3; i < ARROW_LEN; i++) {
    dot(i, 0, C.shaftD);
    dot(i, 1, i === ARROW_LEN - 2 ? C.fletchR : C.fletch);
    dot(i, -1, i === ARROW_LEN - 2 ? C.fletchR : C.fletch);
  }
}

/**
 * Bow held at grip (hx, hy), shooting along world angle `ang`. `nock` = [x, y] the string is
 * drawn back to (null → string straight between the tips).
 */
export function drawBow(ctx, hx, hy, ang, nock) {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const nx = -dy;
  const ny = dx;
  const curve = (s) => 2.2 * (s / BOW_HALF) ** 2; // limbs bend back toward the archer
  const at = (s, back = 0) => [hx + nx * s - dx * (curve(s) + back), hy + ny * s - dy * (curve(s) + back)];
  const tipA = at(BOW_HALF);
  const tipB = at(-BOW_HALF);

  // string first (behind the limbs)
  const n = nock ?? [(tipA[0] + tipB[0]) / 2, (tipA[1] + tipB[1]) / 2];
  strand(ctx, tipA, n);
  strand(ctx, n, tipB);

  // limbs: dark back edge, mid, light belly toward the target
  for (let s = -BOW_HALF; s <= BOW_HALF; s += 0.5) {
    const [x, y] = at(s, 0.8);
    px(ctx, x, y, C.woodD);
  }
  for (let s = -BOW_HALF; s <= BOW_HALF; s += 0.5) {
    const tip = Math.abs(s) >= BOW_HALF - 0.5;
    const [x, y] = at(s);
    px(ctx, x, y, tip ? C.woodD : Math.abs(s) < 1.5 ? C.grip : C.wood);
    if (!tip && Math.abs(s) >= 1.5 && Math.abs(s) < BOW_HALF - 1.5) {
      const [lx, ly] = at(s, -0.8);
      px(ctx, lx, ly, C.woodL);
    }
  }
}

function strand(ctx, [x0, y0], [x1, y1]) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  withAlpha(ctx, 0.9, () => {
    for (let i = 0; i <= n; i++) px(ctx, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, C.string);
  });
}

/** The bow lying on its side on a table top (topY = the table's top row), centred on x. */
export function drawBowLying(ctx, x, topY, t) {
  const L = Math.round(x - BOW_HALF);
  rect(ctx, L + 1, topY, BOW_HALF * 2 - 1, 1, C.shadow);
  // string along the bottom, limbs arching above it
  rect(ctx, L + 1, topY - 1, BOW_HALF * 2 - 1, 1, C.string);
  for (let s = -BOW_HALF; s <= BOW_HALF; s++) {
    const lift = Math.round(2.4 * (1 - (s / BOW_HALF) ** 2));
    const X = Math.round(x + s);
    const tip = Math.abs(s) === BOW_HALF;
    px(ctx, X, topY - 1 - lift, tip ? C.woodD : Math.abs(s) <= 1 ? C.grip : C.wood);
    if (!tip && lift > 0) px(ctx, X, topY - lift, C.woodD);
    if (Math.abs(s) > 1 && Math.abs(s) < BOW_HALF - 1) px(ctx, X, topY - 2 - lift, C.woodL);
  }
  // glint sliding along the limb now and then
  const g = t % 3.4;
  if (g < 0.4) {
    const s = Math.round(-BOW_HALF + 2 + (g / 0.4) * (BOW_HALF * 2 - 4));
    const lift = Math.round(2.4 * (1 - (s / BOW_HALF) ** 2));
    px(ctx, x + s, topY - 2 - lift, C.glint);
  }
}
