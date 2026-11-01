// The Dark Lord, drawn in code: the old sorcerer on his balcony (a dark purple cloak, a long grey
// beard, a staff crowned with a purple crystal), the flying shadow creature he turns into, his
// pulse beam and its aiming glint. Internal to the dark-lord slice.
import { rect, px, line, disc, withAlpha } from '../core/draw.js';
import { painter, ellipse } from '../battle/paint.js';

const DARK = '#14101c';

export const DL = {
  cloak: '#3a1a52',
  cloakD: '#24102e',
  cloakDD: '#160a1e',
  cloakL: '#5a2a7a',
  trim: '#c8a040',
  trimD: '#8a6a24',
  face: '#c8c0b8',
  faceD: '#8a8088',
  beard: '#b8b4ac',
  beardD: '#86827c',
  eye: '#e070ff',
  wood: '#3a2a20',
  woodL: '#5a4232',
  orb: '#b060f0',
  orbL: '#e8c0ff',
  iron: '#4a4454',
};

/**
 * The sorcerer, 18 × 32, feet on footY. pose: walkT (stepping out), cast 0..1 (staff raised,
 * crystal blazing), t.
 * @returns {{orbX:number, orbY:number}} where the crystal is (for sparks + light)
 */
export function drawDarkLord(ctx, cx, footY, f, { walkT = 0, cast = 0, t = 0 } = {}) {
  const ox = Math.round(cx - 9);
  const oy = Math.round(footY - 32);
  const { P, D, L, wx } = painter(ctx, ox, oy, 18, f);
  const fr = walkT > 0 ? Math.floor(walkT * 5) % 2 : 0;
  const lift = Math.round(cast * 3);
  const sway = Math.round(Math.sin(t * 1.6));

  // cloak: long, flaring to the floor, a ragged hem that sweeps as he walks
  for (let y = 9; y < 32; y++) {
    const half = 3 + Math.floor((y - 9) / 4);
    const x0 = 8 - half + (y > 26 ? fr : 0);
    P(x0, y, half * 2 + 1, 1, y % 5 === 0 ? DL.cloakD : DL.cloak);
    D(x0, y, DL.cloakDD);
    D(x0 + 1, y, DL.cloakD);
    D(x0 + half * 2, y, DL.cloakL); // moonlit edge
  }
  P(6, 31, 7, 1, DL.cloakDD);
  for (let x = 3; x < 15; x += 3) D(x + fr, 31, DL.cloakD); // ragged hem
  // gold trim down the front + a clasp
  for (let y = 12; y < 31; y++) D(9 + Math.floor((y - 12) / 9), y, y % 2 ? DL.trim : DL.trimD);
  P(7, 10, 4, 1, DL.trim);
  D(9, 10, DL.orbL);
  // shoulders + mantle
  P(4, 8, 10, 3, DL.cloakD);
  P(5, 8, 8, 1, DL.cloakL);

  // hood, pointed, a dark iron circlet with three spikes over the brow
  P(5, 1, 8, 8, DL.cloakD);
  P(6, 0, 6, 1, DL.cloakD);
  P(8, -2, 2, 2, DL.cloakD);
  D(5, 1, DL.cloakL);
  P(6, 2, 6, 1, DL.iron);
  for (const x of [7, 9, 11]) D(x, 1, DL.iron);
  // the face in the hood's shadow: glowing eyes, hooked nose, a long grey beard
  P(8, 3, 4, 4, DL.faceD);
  P(9, 3, 3, 3, DL.face);
  D(10, 4, DL.eye);
  D(12, 4, DL.eye);
  D(12, 5, DL.faceD);
  P(8, 6, 5, 3, DL.beard);
  P(8, 9, 4, 3, DL.beard);
  P(9, 12, 2, 2 + sway, DL.beard);
  D(8, 8, DL.beardD);
  D(10, 10, DL.beardD);
  D(11, 7, DL.beardD);

  // the staff in his front hand, crowned with a hooked crystal
  const sx = 15;
  const top = 1 - lift;
  P(sx, top + 4, 1, 31 - top - 4, DL.wood);
  D(sx, top + 10, DL.woodL);
  D(sx, top + 20, DL.woodL);
  L(sx, top + 4, sx + 2, top + 1, DL.wood);
  L(sx + 2, top + 1, sx + 1, top - 1, DL.woodL);
  // the hand + sleeve
  P(12, 13 - lift, 4, 3, DL.cloakD);
  D(14, 14 - lift, DL.face);
  D(15, 14 - lift, DL.faceD);
  // the crystal
  const orbX = wx(sx);
  const orbY = oy + top + 1;
  const r = 1 + (cast > 0.3 ? 1 : 0);
  withAlpha(ctx, 0.35 + 0.35 * cast + 0.1 * Math.sin(t * 6), () => disc(ctx, orbX, orbY, r + 3, DL.orb));
  disc(ctx, orbX, orbY, r, DL.orb);
  px(ctx, orbX, orbY - 1, DL.orbL);
  return { orbX, orbY };
}

// ---------------------------------------------------------------- the shadow form

const SF = {
  aura: '#3a1a5a',
  wing: '#1a0e26',
  wingD: '#0e0716',
  wingL: '#2e1a42',
  bone: '#4a2a6a',
  boneL: '#7a4aa8',
  body: '#140a1e',
  bodyD: '#0a0510',
  rim: '#5a3a82',
  core: '#8a3ae0',
  coreL: '#e0a0ff',
  horn: '#2a1a38',
  hornL: '#5a4472',
  eye: '#ff4ae0',
};

/** Crisp scanline triangle (no antialiasing), for wing membranes. */
function tri(ctx, a, b, c, color) {
  ctx.fillStyle = color;
  const pts = [a, b, c].map(([x, y]) => [x, Math.round(y)]).sort((p, q) => p[1] - q[1]);
  const [p0, p1, p2] = pts;
  const xAt = (pA, pB, y) => (pB[1] === pA[1] ? pA[0] : pA[0] + ((pB[0] - pA[0]) * (y - pA[1])) / (pB[1] - pA[1]));
  for (let y = p0[1]; y <= p2[1]; y++) {
    const xa = xAt(p0, p2, y);
    const xb = y < p1[1] ? xAt(p0, p1, y) : xAt(p1, p2, y);
    const l = Math.round(Math.min(xa, xb));
    const r = Math.round(Math.max(xa, xb));
    ctx.fillRect(l, y, r - l + 1, 1);
  }
}

/** One wing (side −1 left / 1 right): a tattered bat membrane on three finger bones. */
function wing(ctx, cx, cy, side, flap, hurt) {
  const sh = [cx + side * 8, cy - 8];
  const tip = [cx + side * 40, cy - 22 + flap * 14];
  const f1 = [cx + side * 36, cy + 2 + flap * 9];
  const f2 = [cx + side * 26, cy + 10 + flap * 5];
  const f3 = [cx + side * 15, cy + 9 + flap * 2];
  const mid = (p, q, k) => [p[0] + (q[0] - p[0]) * 0.5 + side * k, p[1] + (q[1] - p[1]) * 0.5 - Math.abs(k)];
  // scalloped trailing edge: each panel dips up between its bones
  const m1 = mid(tip, f1, -2);
  const m2 = mid(f1, f2, -1);
  const m3 = mid(f2, f3, -1);
  const fill = hurt ? '#6a4a8a' : SF.wing;
  tri(ctx, sh, tip, m1, fill);
  tri(ctx, sh, m1, f1, fill);
  tri(ctx, sh, f1, m2, SF.wingD);
  tri(ctx, sh, m2, f2, SF.wingD);
  tri(ctx, sh, f2, m3, fill);
  tri(ctx, sh, m3, f3, fill);
  // tears in the membrane
  px(ctx, (sh[0] + f1[0] * 2) / 3, (sh[1] + f1[1] * 2) / 3 + 2, SF.aura);
  px(ctx, (sh[0] + f2[0] * 2) / 3 + side, (sh[1] + f2[1] * 2) / 3 + 1, SF.aura);
  // bones: the arm along the leading edge, fingers to the trailing edge, a claw at the wrist
  const bone = hurt ? '#ffffff' : SF.bone;
  line(ctx, sh[0], sh[1], tip[0], tip[1], bone, 2);
  line(ctx, sh[0], sh[1] - 1, tip[0], tip[1] - 1, SF.boneL);
  for (const p of [f1, f2, f3]) line(ctx, sh[0] + side * 6, sh[1] - 2, p[0], p[1], bone);
  px(ctx, tip[0] + side, tip[1] - 2, SF.boneL);
  px(ctx, tip[0] + side * 2, tip[1] - 3, SF.hornL);
}

/**
 * The flying shadow creature (≈ 84 × 64), centred on (cx, cy) — the middle of its chest.
 * pose: t, charge 0..1 (the beam gathering in its maw + chest), hurt (a white flash), scale
 * (grows in as he transforms), fade (dissolving as he dies).
 */
export function drawShadowForm(ctx, cx, cy, { t = 0, charge = 0, hurt = false, scale = 1 } = {}) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  const flap = Math.sin(t * 4.2);
  const s = scale;
  if (s !== 1) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
  }

  // aura: slow, throbbing dark halo
  const pulse = 0.5 + 0.5 * Math.sin(t * 3);
  withAlpha(ctx, 0.18 + 0.1 * pulse + 0.25 * charge, () => ellipse(ctx, cx, cy - 2, 34, 26, SF.aura));
  withAlpha(ctx, 0.2 + 0.25 * charge, () => ellipse(ctx, cx, cy, 20, 18, '#5a2a8a'));

  // smoky tendrils trailing beneath, waving
  for (let i = 0; i < 5; i++) {
    const bx = cx - 8 + i * 4;
    let x = bx;
    let y = cy + 9;
    const len = 18 + (i % 2) * 8 + (i === 2 ? 6 : 0);
    for (let k = 0; k < len; k++) {
      x = bx + Math.sin(t * 5 + i * 1.3 + k * 0.25) * (k / len) * 4;
      y = cy + 9 + k;
      const w = k < len * 0.4 ? 3 : k < len * 0.75 ? 2 : 1;
      withAlpha(ctx, 1 - (k / len) * 0.8, () => rect(ctx, x - Math.floor(w / 2), y, w, 1, k % 4 === 0 ? SF.body : SF.bodyD));
    }
  }

  wing(ctx, cx, cy, -1, flap, hurt);
  wing(ctx, cx, cy, 1, flap, hurt);

  // arms: long, reaching down and forward, clawed
  for (const side of [-1, 1]) {
    const sx = cx + side * 9;
    const ex = cx + side * 15;
    const hx = cx + side * 12;
    const hy = cy + 15 + Math.round(Math.sin(t * 2 + side) * 1);
    line(ctx, sx, cy - 4, ex, cy + 6, SF.body, 2);
    line(ctx, ex, cy + 6, hx, hy, SF.body, 2);
    for (let c = -1; c <= 1; c++) line(ctx, hx + c, hy + 1, hx + c * 2, hy + 4, SF.boneL);
  }

  // hunched torso: a dark mass with a moonlit rim and a violet heart glowing through cracks
  ellipse(ctx, cx, cy, 11, 13, SF.body);
  ellipse(ctx, cx, cy + 2, 8, 9, SF.bodyD);
  for (let a = -2.6; a < -0.6; a += 0.12) px(ctx, cx + Math.cos(a) * 11, cy + Math.sin(a) * 13, hurt ? '#ffffff' : SF.rim);
  const heat = 0.35 + 0.15 * pulse + 0.5 * charge;
  withAlpha(ctx, heat, () => {
    // rib-like cracks of light
    for (const [dx, dy, len] of [[-5, -3, 3], [5, -3, 3], [-6, 1, 4], [6, 1, 4], [-4, 5, 3], [4, 5, 3]]) {
      line(ctx, cx + Math.sign(dx), cy + dy, cx + dx + Math.sign(dx) * len * 0.5, cy + dy + 1, SF.core);
    }
    disc(ctx, cx, cy, 2 + Math.round(charge * 2), SF.core);
  });
  if (charge > 0.2) disc(ctx, cx, cy, Math.round(charge * 2), SF.coreL);

  // head: a horned skull of shadow with a jagged crown, burning eyes, a maw that glows
  const hy = cy - 15;
  ellipse(ctx, cx, hy, 6, 6, SF.body);
  rect(ctx, cx - 4, hy + 3, 9, 4, SF.body);
  for (const side of [-1, 1]) {
    // horns sweeping up and out
    line(ctx, cx + side * 4, hy - 3, cx + side * 9, hy - 9, SF.horn, 2);
    line(ctx, cx + side * 9, hy - 9, cx + side * 10, hy - 15, SF.horn);
    line(ctx, cx + side * 5, hy - 4, cx + side * 9, hy - 10, SF.hornL);
    px(ctx, cx + side * 10, hy - 16, SF.hornL);
    // eyes
    rect(ctx, cx + (side < 0 ? -3 : 2), hy - 1, 2, 2, SF.eye);
    px(ctx, cx + (side < 0 ? -3 : 3), hy - 1, '#ffffff');
  }
  // crown: three short spikes between the horns
  for (const dx of [-2, 0, 2]) rect(ctx, cx + dx, hy - 8 + (dx ? 1 : 0), 1, 3 - (dx ? 1 : 0), SF.hornL);
  rect(ctx, cx - 3, hy - 6, 7, 1, SF.horn);
  // maw
  rect(ctx, cx - 2, hy + 4, 5, 2, charge > 0 ? '#c070ff' : SF.bodyD);
  if (charge > 0.5) rect(ctx, cx - 1, hy + 4, 3, 1, '#ffffff');
  for (const dx of [-2, 0, 2]) px(ctx, cx + dx, hy + 4, '#c8bcd8'); // fangs

  if (s !== 1) ctx.restore();
}

/** Where the beam leaves him: his maw, relative to the chest centre. */
export const MAW = { dx: 0, dy: -10 };

/**
 * The 2-second warning: a small purple glint along the direction he's aiming — a short tapering
 * ray from his maw with a pointed head, throbbing faster as the beam nears. p = 0..1 of the wait.
 */
export function drawAimGlint(ctx, x, y, dx, dy, p, t) {
  const len = 30 + Math.round(p * 18);
  const on = 0.55 + 0.45 * Math.sin(t * (10 + p * 20));
  withAlpha(ctx, on, () => {
    for (let i = 4; i < len; i++) {
      const w = i < len - 6 ? 3 : 1;
      const X = x + dx * i;
      const Y = y + dy * i;
      withAlpha(ctx, 0.35, () => rect(ctx, X - w, Y - w, w * 2 + 1, w * 2 + 1, '#8a3ae0'));
      px(ctx, X, Y, i % 3 ? '#e0a0ff' : '#ffffff');
    }
    // arrowhead
    const ex = x + dx * len;
    const ey = y + dy * len;
    const nx = -dy;
    const ny = dx;
    line(ctx, ex, ey, ex - dx * 5 + nx * 4, ey - dy * 5 + ny * 4, '#e0a0ff');
    line(ctx, ex, ey, ex - dx * 5 - nx * 4, ey - dy * 5 - ny * 4, '#e0a0ff');
  });
}

/** The pulse beam from (x0, y0) to (x1, y1): a glow, a violet body, a white-hot core. a = 0..1 (fading). */
export function drawBeam(ctx, x0, y0, x1, y1, a, t) {
  const throb = Math.sin(t * 50) > 0 ? 1 : 0;
  withAlpha(ctx, a * 0.3, () => line(ctx, x0 - 7, y0 - 7, x1 - 7, y1 - 7, '#6a2aa8', 15));
  withAlpha(ctx, a * 0.6, () => line(ctx, x0 - 4 - throb, y0 - 4 - throb, x1 - 4 - throb, y1 - 4 - throb, '#a050f0', 9 + throb * 2));
  withAlpha(ctx, a, () => line(ctx, x0 - 2, y0 - 2, x1 - 2, y1 - 2, '#e0b0ff', 5));
  withAlpha(ctx, a, () => line(ctx, x0, y0, x1, y1, '#ffffff', 2));
}

