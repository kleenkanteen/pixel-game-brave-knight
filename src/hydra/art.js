// The Hydra, drawn in code: a huge scaly body hunched on the floor against the cave wall, three
// long necks, three horned heads facing left. Internal to the hydra slice.
import { rect, px, disc, line, withAlpha } from '../core/draw.js';
import { painter, ellipse } from '../battle/paint.js';

export const HC = {
  scale: '#3a6a4a',
  scaleD: '#24442f',
  scaleDD: '#152a1c',
  scaleL: '#5a8a5a',
  scaleLL: '#7aa86a',
  belly: '#c8b878',
  bellyD: '#9a8a50',
  chinHot: '#fff0b0',
  horn: '#d8d0b8',
  hornD: '#9a9282',
  eye: '#ffd23a',
  eyeHot: '#fff6c0',
  pupil: '#3a0a00',
  mouth: '#5a1410',
  tooth: '#f4f0e4',
  fire: ['#fff6d8', '#ffe07a', '#ff8a2a', '#d0342c'],
  outline: '#0c0a10',
};

const HEAD_W = 26;
const HEAD_H = 16;

/** Where the head's back joins its neck, from the head centre (head faces left: back is right). */
export const NECK_JOIN = { dx: 10, dy: 2 };

/**
 * One head, centred on (x, y), facing f (−1 = left).
 * opts: open 0..1 (jaw drop), glow 0..1 (fire in the mouth), eye 'open'|'closed'|'x'|'daze',
 *       chinHot (the exposed underside pulses), dim (the far head), hurt (flash white)
 * @returns {{mouthX:number, mouthY:number, chinX:number, chinY:number}} world points
 */
export function drawHead(ctx, x, y, f, { open = 0, glow = 0, eye = 'open', chinHot = false, dim = false, hurt = false, t = 0 } = {}) {
  const ox = Math.round(x - HEAD_W / 2);
  const oy = Math.round(y - HEAD_H / 2);
  const { P, D, L, wx } = painter(ctx, ox, oy, HEAD_W, f);
  const S = dim ? HC.scaleD : HC.scale;
  const SL = dim ? HC.scale : HC.scaleL;
  const SD = dim ? HC.scaleDD : HC.scaleD;
  const drop = Math.round(open * 10);

  // horns sweeping back + a frill of spikes along the back of the skull
  L(6, 3, -1, -3, HC.hornD, 2);
  L(9, 2, 4, -4, HC.horn, 2);
  D(-2, -4, HC.hornD);
  D(3, -5, HC.horn);
  for (const [sx, sy] of [[1, 6], [0, 9], [2, 12]]) L(sx + 2, sy, sx - 2, sy - 1, SD);

  // cranium + upper jaw, outlined
  const skull = [[3, 3, 11, 8], [12, 5, 6, 5], [17, 6, 6, 4], [22, 7, 3, 3]];
  for (const [a, b, w, h] of skull) P(a - 1, b - 1, w + 2, h + 2, HC.outline);
  for (const [a, b, w, h] of skull) P(a, b, w, h, S);
  P(4, 3, 9, 1, SL); // light along the top
  P(13, 5, 5, 1, SL);
  P(18, 6, 4, 1, SL);
  P(8, 4, 6, 1, SD); // brow ridge
  D(23, 8, HC.outline); // nostril
  for (let i = 0; i < 4; i++) D(5 + i * 2, 7 + (i % 2), SD); // scales

  // eye
  if (eye === 'closed') P(10, 6, 3, 1, SD);
  else if (eye === 'x') {
    D(10, 5, HC.outline);
    D(12, 7, HC.outline);
    D(11, 6, HC.outline);
    D(12, 5, HC.outline);
    D(10, 7, HC.outline);
  } else {
    P(10, 5, 3, 2, eye === 'daze' ? '#c8c0a0' : glow > 0.3 ? HC.eyeHot : HC.eye);
    if (eye !== 'daze') D(11, 5, HC.pupil);
    D(11, 6, HC.pupil);
  }

  // the open mouth: dark gullet, fire welling up inside it
  if (drop > 0) {
    for (let i = 11; i <= 23; i++) {
      const d = Math.round((drop * (i - 10)) / 13);
      if (d <= 0) continue;
      P(i, 10, 1, d, HC.mouth);
    }
    if (glow > 0) {
      const r = Math.max(1, Math.round(1 + glow * 4));
      const fx = wx(16);
      const fy = oy + 10 + Math.round(drop * 0.45);
      const fl = Math.sin(t * 30) > 0 ? 1 : 0;
      withAlpha(ctx, 0.45, () => disc(ctx, fx, fy, r + 2 + fl, HC.fire[2]));
      disc(ctx, fx, fy, r, HC.fire[2]);
      disc(ctx, fx, fy, Math.max(0, r - 1), HC.fire[1]);
      px(ctx, fx, fy, HC.fire[0]);
    }
  }
  // teeth along the upper jaw
  for (const tx of [14, 17, 20, 23]) D(tx, 10, HC.tooth);

  // lower jaw (hinged at x 10), its underside (the chin) pale; pulses hot when exposed
  for (let i = 10; i <= 22; i++) {
    const d = Math.round((drop * (i - 10)) / 13);
    P(i, 9 + d, 1, 1, HC.outline);
    P(i, 10 + d, 1, 2, SD);
    const hot = chinHot && Math.floor(t * 8) % 2 === 0;
    P(i, 12 + d, 1, 2, hot ? HC.chinHot : HC.belly);
    P(i, 14 + d, 1, 1, HC.outline);
    if (i % 3 === 0) D(i, 13 + d, hot ? '#ffffff' : HC.bellyD); // plates
    if (drop > 2 && i % 4 === 1) D(i, 9 + d, HC.tooth);
  }

  if (hurt) withAlpha(ctx, 0.6, () => skull.forEach(([a, b, w, h]) => P(a, b, w, h, '#ffffff')));

  return {
    mouthX: wx(17),
    mouthY: oy + 10 + Math.round(drop * 0.4),
    chinX: wx(17),
    chinY: oy + 13 + Math.round(drop * 0.7),
  };
}

/** Quadratic Bézier point. */
function bez(p0, p1, p2, u) {
  const a = (1 - u) * (1 - u);
  const b = 2 * (1 - u) * u;
  const c = u * u;
  return { x: a * p0.x + b * p1.x + c * p2.x, y: a * p0.y + b * p1.y + c * p2.y };
}

/** A thick scaly neck from `root` (on the body) curving up into the back of a head at `join`. */
export function drawNeck(ctx, root, join, { dim = false, rRoot = 7, rHead = 4 } = {}) {
  const ctrl = { x: root.x - 4, y: join.y + 6 };
  const len = Math.hypot(join.x - root.x, join.y - root.y) * 1.3;
  const n = Math.max(8, Math.round(len));
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(bez(root, ctrl, join, i / n));
  const r = (i) => Math.round(rRoot + (rHead - rRoot) * (i / n));
  for (let i = 0; i <= n; i++) disc(ctx, pts[i].x, pts[i].y, r(i) + 1, HC.outline);
  for (let i = 0; i <= n; i++) disc(ctx, pts[i].x, pts[i].y, r(i), dim ? HC.scaleD : HC.scale);
  for (let i = 0; i <= n; i++) {
    // pale belly scales down the front (left) of the neck, a sheen down the back
    const p = pts[i];
    const rr = r(i);
    px(ctx, p.x - rr + 1, p.y + 1, dim ? HC.bellyD : HC.belly);
    px(ctx, p.x - rr + 2, p.y + 1, dim ? HC.bellyD : i % 3 ? HC.belly : HC.bellyD);
    if (i % 2 === 0) px(ctx, p.x + rr - 2, p.y - 1, dim ? HC.scale : HC.scaleL);
    if (i % 4 === 0) px(ctx, p.x, p.y, dim ? HC.scaleDD : HC.scaleD);
  }
}

/** Rough extent of the body for hit tests: an ellipse rx × ry centred `up` px above the feet. */
export const BODY = { rx: 52, ry: 20, up: 33 };

// The torso's side profile (u = px from the body centre, + = towards the tail; y = px above the
// feet, negative up): a deep chest under the necks, the back dipping behind the shoulders and
// rising again to the hips, the belly curving up into a tucked waist, then the haunches.
const TOP = [[-46, -20], [-45, -30], [-40, -40], [-30, -48], [-16, -52], [-2, -50], [12, -47], [26, -50], [38, -49], [48, -44], [56, -34], [60, -26]];
const BOTTOM = [[-46, -18], [-44, -13], [-36, -10], [-24, -11], [-10, -15], [4, -19], [16, -20], [28, -18], [40, -15], [52, -16], [60, -22]];

/** y on a keyed profile at u (eased between keys). */
function profile(keys, u) {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [u1, y1] = keys[i];
    const [u0, y0] = keys[i - 1];
    if (u <= u1) {
      const p = (u - u0) / (u1 - u0);
      return y0 + (y1 - y0) * (1 - Math.cos(p * Math.PI)) / 2;
    }
  }
  return keys[keys.length - 1][1];
}

/** A tapering, outlined limb through `pts` ({x, y}), radius r0 → r1, lit along its front edge. */
function limb(ctx, pts, r0, r1, { fill, light, dark }) {
  const samples = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  let run = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(2, Math.ceil(len));
    for (let k = 0; k <= n; k++) {
      const q = k / n;
      samples.push({ x: a.x + (b.x - a.x) * q, y: a.y + (b.y - a.y) * q, r: Math.round(r0 + (r1 - r0) * ((run + len * q) / total)) });
    }
    run += len;
  }
  for (const p of samples) disc(ctx, p.x, p.y, p.r + 1, HC.outline);
  for (const p of samples) disc(ctx, p.x, p.y, p.r, fill);
  samples.forEach((p, i) => {
    px(ctx, p.x - p.r + 1, p.y - 1, light); // lit front edge
    if (p.r > 2) px(ctx, p.x + p.r - 1, p.y + 1, dark); // shaded back edge
    if (i % 5 === 0 && p.r > 3) px(ctx, p.x, p.y, dark); // scales
  });
}

/** A clawed dragon foot on the floor, toes pointing left from heel x `hx`. */
function drawFoot(ctx, hx, footY, { dim = false, flex = false } = {}) {
  const S = dim ? HC.scaleD : HC.scale;
  const SL = dim ? HC.scale : HC.scaleL;
  const claw = dim ? HC.hornD : HC.horn;
  // the pad: a low rounded wedge, high at the heel
  for (let x = hx - 10; x <= hx + 2; x++) {
    const h = x > hx - 3 ? 5 : x > hx - 8 ? 4 : 3;
    rect(ctx, x, footY - h - 1, 1, h + 1, HC.outline);
  }
  for (let x = hx - 9; x <= hx + 1; x++) {
    const h = x > hx - 3 ? 4 : x > hx - 8 ? 3 : 2;
    rect(ctx, x, footY - h, 1, h, S);
    px(ctx, x, footY - h, SL);
  }
  // three toes, each with a big claw hooking forward and down
  const up = flex ? 1 : 0;
  for (let i = 0; i < 3; i++) {
    const x0 = hx - 9 + i * 3;
    const y = footY - 3 - (i === 0 ? up : 0);
    for (const [dx, dy] of [[0, -1], [-1, -1], [-2, -1], [-3, 0], [-4, 1], [-4, 2], [-3, 3]]) px(ctx, x0 + dx, y + dy, HC.outline);
    px(ctx, x0, y, claw);
    px(ctx, x0 - 1, y, claw);
    px(ctx, x0 - 2, y, '#f4f0e4');
    px(ctx, x0 - 2, y + 1, claw);
    px(ctx, x0 - 3, y + 1, claw);
    px(ctx, x0 - 3, y + 2, HC.hornD);
  }
  // dewclaw at the heel
  px(ctx, hx + 2, footY - 3, claw);
  px(ctx, hx + 3, footY - 2, claw);
  px(ctx, hx + 3, footY - 1, HC.hornD);
}

const COLORS = (dim) => ({ fill: dim ? HC.scaleD : HC.scale, light: dim ? HC.scale : HC.scaleL, dark: dim ? HC.scaleDD : HC.scaleD });

/** Foreleg (u = shoulder): upper arm back to the elbow, forearm forward to the wrist, the foot. */
function drawForelegAt(ctx, x, footY, { dim = false, flex = false } = {}) {
  const c = COLORS(dim);
  limb(ctx, [{ x, y: footY - 30 }, { x: x + 7, y: footY - 16 }, { x: x - 2, y: footY - 6 }], 7, 3, c);
  px(ctx, x + 10, footY - 16, c.dark); // the elbow's point
  drawFoot(ctx, x + 1, footY, { dim, flex });
}

/** Hind leg (x = hip): a heavy curved thigh forward to the knee, shin back to the hock, foot. */
function drawHindlegAt(ctx, x, footY, { dim = false } = {}) {
  const c = COLORS(dim);
  // the haunch: a big rounded muscle
  limb(ctx, [{ x, y: footY - 34 }, { x: x - 6, y: footY - 24 }, { x: x - 11, y: footY - 16 }], 12, 6, c);
  // shin back to the hock (the backward bend), then down to the foot
  limb(ctx, [{ x: x - 11, y: footY - 16 }, { x: x + 1, y: footY - 9 }, { x: x - 1, y: footY - 3 }], 5, 3, c);
  px(ctx, x + 3, footY - 9, c.dark); // the hock's point
  drawFoot(ctx, x + 1, footY, { dim });
}

/**
 * The body: a curved dragon's torso centred on cx, standing on four bent, clawed legs on footY —
 * deep chest, dipping back, tucked belly with pale plates, ridged spine, a tail sweeping away to
 * the right. breathe 0..1 swells the chest slightly.
 */
export function drawBody(ctx, cx, footY, { breathe = 0, t = 0 } = {}) {
  const top = (u) => Math.round(footY + profile(TOP, u) - (u < 10 ? breathe : 0));
  const bot = (u) => Math.round(footY + profile(BOTTOM, u));
  // far-side legs first (darker, behind the body)
  drawForelegAt(ctx, cx - 24, footY, { dim: true, flex: Math.sin(t * 2 + 1) > 0.6 });
  drawHindlegAt(ctx, cx + 44, footY, { dim: true });
  // tail: from the rump sweeping down to the floor and curling up at the tip
  const tail = [];
  for (let i = 0; i <= 30; i++) {
    const q = i / 30;
    tail.push({ x: cx + 56 + q * 46, y: footY - 28 + Math.sin(q * Math.PI * 0.9) * 22 - q * q * 6, r: Math.max(2, Math.round(9 - q * 7)) });
  }
  for (const p of tail) disc(ctx, p.x, p.y, p.r + 1, HC.outline);
  for (const p of tail) disc(ctx, p.x, p.y, p.r, HC.scaleD);
  tail.forEach((p, i) => {
    if (i % 3 === 0) px(ctx, p.x, p.y - p.r + 1, HC.scale);
    if (i % 4 === 2 && p.r > 3) rect(ctx, p.x, p.y - p.r - 2, 1, 2, HC.scaleD); // spines
  });
  // dorsal spikes along the spine, tallest over the shoulders
  for (let u = -36; u <= 52; u += 8) {
    const h = Math.max(2, Math.round(7 - Math.abs(u + 14) / 10));
    const y = top(u);
    for (let k = 0; k < h; k++) rect(ctx, cx + u - Math.floor((h - k) / 2) + k, y - k, Math.max(1, h - k), 1, k === h - 1 ? HC.horn : HC.scaleD);
  }
  // the torso, column by column: outline, scales lit along the back, darker low down
  for (let u = -46; u <= 60; u++) {
    const y0 = top(u);
    const y1 = bot(u);
    const x = cx + u;
    rect(ctx, x, y0 - 1, 1, y1 - y0 + 3, HC.outline);
  }
  for (let u = -45; u <= 59; u++) {
    const y0 = top(u);
    const y1 = bot(u);
    const x = cx + u;
    const h = y1 - y0;
    rect(ctx, x, y0, 1, h + 1, HC.scale);
    rect(ctx, x, y0, 1, Math.min(h, 2), HC.scaleLL);
    rect(ctx, x, y0 + 2, 1, Math.min(Math.max(0, h - 2), 5), HC.scaleL);
    rect(ctx, x, y1 - Math.round(h * 0.3), 1, Math.round(h * 0.3), HC.scaleD);
    // scale pattern
    for (let y = y0 + 4; y < y1 - 2; y++) if ((x * 3 + y * 7) % 13 === 0 || ((x + 1) * 3 + (y - 1) * 7) % 13 === 0) px(ctx, x, y, HC.scaleD);
  }
  // pale belly plates along the chest and belly, banded, following the underside
  for (let u = -44; u <= 30; u++) {
    const y1 = bot(u);
    const depth = Math.min(Math.round((u + 46) * 1.2), u < -30 ? 9 : Math.max(3, Math.round(9 - (u + 30) / 10)));
    const x = cx + u;
    rect(ctx, x, y1 - depth + 1, 1, depth, (u + 60) % 4 === 0 ? HC.bellyD : HC.belly);
    px(ctx, x, y1 - depth + 1, HC.bellyD);
  }
  // the ribs' curve and the line of the haunch, so the torso reads as rounded
  for (let u = -24; u <= 6; u += 6) {
    for (let k = 0; k < 8; k++) px(ctx, cx + u + Math.round(k * 0.4), bot(u) - 10 - k, HC.scaleD);
  }
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 0.9 + 0.2;
    px(ctx, cx + 44 - Math.cos(a) * 12, footY - 32 + Math.sin(a) * 12 - 6, HC.scaleD);
  }
  // near-side hind leg (in front of the body; the near foreleg goes over the necks: drawForeleg)
  drawHindlegAt(ctx, cx + 38, footY);
}

/** The near-side foreleg, drawn after the necks so it stands in front of them. */
export function drawForeleg(ctx, cx, footY, t = 0) {
  drawForelegAt(ctx, cx - 36, footY, { flex: Math.sin(t * 2) > 0.6 });
}

const pool = new Map();
/** A scratch canvas per key, grown as needed. */
function scratch(key, w, h) {
  let c = pool.get(key);
  if (!c || c.width < w || c.height < h) {
    c = document.createElement('canvas');
    c.width = Math.max(w, c?.width ?? 0);
    c.height = Math.max(h, c?.height ?? 0);
    pool.set(key, c);
  }
  return c;
}

/**
 * Draw `fn(g)` (world coords inside `box`) scaled by (sx, sy) about the world anchor (ax, ay),
 * nearest-neighbour so the pixels stay crisp; tint {color, a} washes it over (silhouette only).
 * `key` picks the scratch canvas (nest calls with different keys).
 */
export function drawScaled(ctx, key, box, ax, ay, sx, sy, fn, tint = null) {
  const w = Math.ceil(box.w);
  const h = Math.ceil(box.h);
  const c = scratch(key, w, h);
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, c.width, c.height);
  g.translate(-Math.round(box.x), -Math.round(box.y));
  fn(g);
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (tint && tint.a > 0) {
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = Math.min(1, tint.a);
    g.fillStyle = tint.color;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
  }
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  const dx = ax + (Math.round(box.x) - ax) * sx;
  const dy = ay + (Math.round(box.y) - ay) * sy;
  ctx.drawImage(c, 0, 0, w, h, Math.round(dx), Math.round(dy), Math.round(w * sx), Math.round(h * sy));
  ctx.imageSmoothingEnabled = prev;
}

/** A spat fireball in flight. */
export function drawHydraFireball(ctx, x, y, t) {
  const fl = Math.sin(t * 28) > 0 ? 1 : 0;
  withAlpha(ctx, 0.35, () => disc(ctx, x, y, 6 + fl, '#ff8a2a'));
  disc(ctx, x, y, 4, '#d0342c');
  disc(ctx, x, y, 3, '#ff8a2a');
  disc(ctx, x - 1, y - 1, 1, '#ffe07a');
  px(ctx, x - 1, y - 1, '#ffffff');
}

/** A sheet of flame over [x0, x1] on the floor, `h` px tall at most, flickering. */
export function drawFloorFire(ctx, x0, x1, floorY, h, t, alpha = 1) {
  withAlpha(ctx, alpha, () => {
    for (let x = Math.floor(x0); x < x1; x++) {
      const f = 0.55 + 0.45 * Math.sin(t * 21 + x * 0.9) * Math.sin(t * 7 + x * 0.37);
      const hh = Math.max(2, Math.round(h * (0.5 + 0.5 * f)));
      rect(ctx, x, floorY - hh, 1, hh, HC.fire[3]);
      rect(ctx, x, floorY - Math.round(hh * 0.7), 1, Math.round(hh * 0.7), HC.fire[2]);
      rect(ctx, x, floorY - Math.round(hh * 0.35), 1, Math.round(hh * 0.35), HC.fire[1]);
      if ((x + Math.floor(t * 40)) % 7 === 0) px(ctx, x, floorY - hh - 2, HC.fire[1]);
    }
  });
}

/** The gout of fire from the mouth down to the floor (blast). */
export function drawFireStream(ctx, mx, my, gx, gy, t) {
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = mx + (gx - mx) * u + Math.sin(t * 30 + i) * 2;
    const y = my + (gy - my) * u;
    const r = Math.round(2 + u * 5);
    withAlpha(ctx, 0.5, () => disc(ctx, x, y, r + 2, HC.fire[3]));
    disc(ctx, x, y, r, HC.fire[2]);
    disc(ctx, x, y, Math.max(0, r - 2), HC.fire[1]);
  }
  line(ctx, mx, my, gx, gy, HC.fire[0]);
}
