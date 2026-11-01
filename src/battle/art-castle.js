// The Dark Lord's castle monsters, drawn in code (facing right in local coords, mirrored for
// facing −1): the Skeleton Archer, the Reptilian, the Shadow (the Dark Lord's flying minion), and
// their shots — a skeleton's arrow and a Shadow's purple pulse. Internal to the battle slice.
import { rect, px, disc, withAlpha } from '../core/draw.js';
import { painter, ellipse } from './paint.js';

const DARK = '#14101c';

// ---------------------------------------------------------------- Skeleton Archer

const SK = {
  bone: '#e4dcc6',
  boneD: '#a89e86',
  boneDD: '#6e6656',
  cape: '#2a2234',
  capeD: '#1a1420',
  helm: '#5a4a3a',
  helmL: '#7a6448',
  rust: '#8a4a2a',
  eye: '#ff3a2a',
  wood: '#6b4428',
  woodD: '#432a18',
  string: '#d8d0c0',
  shaft: '#a07a4a',
  tip: '#c9d0dc',
};

/**
 * 16 × 24, feet on footY. pose: pull 0..1 (bowstring drawn back), t (eye flicker), asleep (still,
 * bow lowered, eyes dark).
 */
export function drawSkeletonArcher(ctx, cx, footY, f, { pull = 0, t = 0, asleep = false } = {}) {
  const ox = Math.round(cx - 7);
  const oy = Math.round(footY - 24);
  const { P, D, L } = painter(ctx, ox, oy, 16, f);
  const B = SK.bone;
  const BD = SK.boneD;

  // tattered cape behind, ragged hem
  P(2, 7, 4, 10, SK.cape);
  P(2, 7, 1, 10, SK.capeD);
  D(2, 17, SK.cape);
  D(4, 17, SK.capeD);
  D(5, 18, SK.cape);

  // legs: bones, knees, feet
  L(5, 16, 4, 20, BD);
  L(4, 20, 5, 23, BD);
  P(4, 23, 3, 1, SK.boneDD);
  L(7, 16, 8, 20, B);
  L(8, 20, 8, 23, B);
  P(8, 23, 3, 1, BD);
  D(4, 20, B); // knee caps
  D(8, 20, '#ffffff');

  // pelvis + spine
  P(4, 14, 5, 2, BD);
  D(6, 15, SK.boneDD);
  for (let y = 7; y < 14; y += 2) D(6, y, BD);

  // ribcage: curved ribs with dark gaps
  for (const [y, x0, w] of [[7, 4, 5], [9, 4, 5], [11, 5, 4], [13, 5, 3]]) P(x0, y, w, 1, B);
  for (const y of [8, 10, 12]) {
    D(4, y, BD);
    D(8, y, BD);
  }
  D(5, 6, B); // collar bones
  D(8, 6, B);

  // skull under a rusty helmet
  P(5, 1, 6, 5, B);
  P(5, 1, 1, 5, BD);
  P(6, 5, 5, 2, B); // jaw
  P(6, 6, 5, 1, BD);
  for (let x = 7; x <= 10; x += 2) D(x, 5, DARK); // teeth gaps
  P(8, 2, 2, 2, DARK); // eye socket
  if (!asleep && Math.sin(t * 7 + cx) > -0.7) D(9, 3, SK.eye);
  D(10, 4, SK.boneDD); // nose hole
  P(4, 0, 8, 2, SK.helm);
  P(5, -1, 5, 1, SK.helm);
  P(4, 2, 8, 1, SK.helmL);
  D(6, 0, SK.rust);
  D(9, -1, SK.helmL);

  // the bow, held out in front; the string pulled back by the far hand
  const sx = 12 - Math.round(pull * 5);
  const hold = asleep ? 2 : 0; // lowered while it dozes
  for (let y = 2; y <= 17; y++) {
    const bx = 12 + Math.round(Math.sin(((y - 2) / 15) * Math.PI) * 2);
    D(bx, y + hold, y === 2 || y === 17 ? SK.woodD : SK.wood);
  }
  L(12, 2 + hold, sx, 9 + hold, SK.string);
  L(sx, 9 + hold, 12, 17 + hold, SK.string);
  L(7, 8, sx, 9 + hold, BD); // far arm to the string
  if (pull > 0.05) {
    L(sx, 9, 16, 9, SK.shaft); // nocked arrow
    D(17, 9, SK.tip);
    D(sx, 8, '#f0ebe0');
    D(sx, 10, '#f0ebe0');
  }
  L(7, 8, 13, 9 + hold, B); // near arm out to the grip
  D(13, 9 + hold, BD);
}

/** A heap of bones where a Skeleton Archer fell. */
export function drawBonePile(ctx, cx, footY, f) {
  const { P, D, L } = painter(ctx, Math.round(cx - 8), Math.round(footY - 5), 16, f);
  L(1, 4, 7, 3, SK.boneD);
  L(5, 4, 12, 2, SK.bone);
  P(9, 1, 4, 3, SK.bone); // skull
  D(10, 2, DARK);
  P(8, 0, 6, 1, SK.helm);
  P(3, 2, 3, 2, SK.boneD); // ribs
  D(4, 2, DARK);
  L(13, 4, 15, 1, SK.wood); // broken bow
  D(0, 4, SK.boneDD);
}

/** A skeleton's arrow in flight (or stuck: tip buried), (x, y) = the tip, `ang` its heading. */
export function drawBoneArrow(ctx, x, y, ang, { buried = false } = {}) {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  for (let i = buried ? 2 : 0; i <= 7; i++) px(ctx, x - dx * i, y - dy * i, i < 2 ? '#9aa0aa' : i > 5 ? '#3a2a3a' : '#5e4a3a');
}

// ---------------------------------------------------------------- Reptilian

const RP = {
  out: '#0e0716',
  body: '#553a84',
  bodyD: '#3a2560',
  bodyDD: '#24163a',
  bodyL: '#7656a8',
  bodyLL: '#a084d0',
  spike: '#6e4c98',
  spikeL: '#c0a6ec',
  eye: '#7aff4a',
  eyeD: '#1a7a2a',
  mouth: '#1a0812',
  gum: '#5a1a3a',
  tooth: '#f4ecd0',
  toothD: '#bcb08c',
  claw: '#e0d8c4',
  goo: '#5ae04a',
  gooL: '#c4ff8a',
  gooD: '#2a8a3a',
};

/** 0..1 hump centred on c with half-width r. */
const bump = (x, c, r) => Math.max(0, 1 - ((x - c) / r) ** 2);

/**
 * The Reptilian: a big, hunched purple beast — 56 × 36, feet on footY. A ridge of tall spikes down
 * its back, a curling tail, a glowing green eye, and a huge jaw of fangs drooling green goo. pose:
 * walkT, coil 0..1 (crouched to spring), lunge 0..1 (stretched out), jaw 0..1 (how wide the mouth
 * gapes), asleep, t.
 */
export function drawReptile(ctx, cx, footY, f, { walkT = 0, coil = 0, lunge = 0, jaw = 0.25, asleep = false, t = 0 } = {}) {
  const W = 56;
  const H = 36;
  const ox = Math.round(cx - 28);
  const oy = Math.round(footY - H);
  const { P, D, L } = painter(ctx, ox, oy, W, f);
  const fy = H - 1; // the ground row
  const low = Math.round(coil * 3) + (asleep ? 3 : 0);
  const hb = -Math.round(coil * 3); // hind end shift
  const fb = hb + Math.round(lunge * 6); // front end shift (stretches out mid-lunge)
  const breathe = asleep ? 0 : Math.sin(t * 3 + cx) > 0 ? 1 : 0;
  const gait = walkT * 9;
  const X0 = 12;
  const X1 = 40;
  const sx = (x) => Math.round(x + hb + ((fb - hb) * (x - X0)) / (X1 - X0));
  const top = (x) => Math.round(17 - 2 * bump(x, 16, 6) - 6 * bump(x, 32, 8)) + low - (x > 24 && x < 38 ? breathe : 0);
  const bot = (x) => Math.round(22 + 1 * bump(x, 24, 10)) + low;

  // curling tail: from the hip, up and over, swaying (outlined)
  const sway = Math.sin(t * (coil > 0 ? 10 : 2.5) + cx) * 1.5;
  const tail = [
    [15, 19 + low],
    [8, 19 + low],
    [4, 16 + low],
    [3 + sway * 0.4, 9 + low],
    [6 + sway * 0.8, 4 + low],
    [11 + sway, 3 + low],
    [13 + sway, 6 + low],
  ];
  const tailSize = (i) => (i < 2 ? 3 : 2);
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < tail.length - 1; i++) {
      const [x0, y0] = tail[i];
      const [x1, y1] = tail[i + 1];
      if (pass === 0) L(x0 + hb - 1, y0 - 1, x1 + hb - 1, y1 - 1, RP.out, tailSize(i) + 2);
      else {
        L(x0 + hb, y0, x1 + hb, y1, RP.bodyD, tailSize(i));
        L(x0 + hb, y0, x1 + hb, y1, RP.body, Math.max(1, tailSize(i) - 2));
      }
    }
  }
  for (let i = 1; i < 5; i++) D(tail[i][0] + hb - 2, tail[i][1] - 1, RP.spikeL); // tail barbs

  // a leg: thick upper limb to a knee, shin down to a clawed foot
  const leg = (hx, hy, phase, near, front) => {
    const s = walkT > 0 && !asleep ? Math.round(Math.sin(gait + phase) * 2) : 0;
    const c = near ? RP.bodyD : RP.bodyDD;
    const kx = front ? hx - 1 + s : hx - 4 + s;
    const ky = hy + 6;
    const fx = front ? hx + 1 + Math.round(s * 1.5) : hx + Math.round(s * 1.5);
    L(hx - 1, hy - 1, kx - 1, ky - 1, RP.out, 5);
    L(kx, ky, fx - 1, fy - 2, RP.out, 4);
    L(hx, hy, kx, ky, c, 3);
    L(kx + 1, ky, fx, fy - 1, c, 2);
    if (near) {
      D(kx + 1, ky - 1, RP.body);
      D(kx + 2, ky, RP.body);
      L(hx + 1, hy, kx + 1, ky - 1, RP.body);
    }
    P(fx - 1, fy, 6, 1, c);
    D(fx + 5, fy, RP.claw);
    D(fx + 3, fy, RP.claw);
    D(fx + 1, fy, RP.claw);
    D(fx + 5, fy - 1, RP.claw);
  };
  leg(16 + hb, 20 + low, 1, false, false);
  leg(33 + fb, 20 + low, 0, false, true);

  // hunched body: an outline pass, then the fill, column by column
  for (let x = X0; x <= X1; x++) P(sx(x) - 1, top(x) - 1, 4, bot(x) - top(x) + 3, RP.out);
  for (let x = X0; x <= X1; x++) {
    const X = sx(x);
    const y0 = top(x);
    const y1 = bot(x);
    P(X, y0, 2, y1 - y0 + 1, RP.body);
    D(X, y0, RP.bodyLL);
    P(X, y0 + 1, 2, 1, RP.bodyL);
    P(X, y1 - 2, 2, 3, RP.bodyD);
    D(X, y1, RP.bodyDD);
    const mid = Math.round((y0 + y1) / 2);
    if (x % 4 === 0) D(X, mid, RP.bodyD); // scale ridges
    if (x % 4 === 2) D(X, mid + 2, RP.bodyD);
    if (x % 5 === 0) D(X, mid - 2, RP.bodyL);
  }
  // muscle lines over shoulder and haunch
  for (let x = 27; x <= 36; x++) D(sx(x), top(x) + 4 + Math.round(bump(x, 31, 6)), RP.bodyD);
  for (let x = 13; x <= 19; x++) D(sx(x), top(x) + 3, RP.bodyD);

  // ridge of tall spikes, leaning back toward the tail, biggest over the shoulders
  const spikes = [];
  for (let x = 13; x <= 39; x += 3) spikes.push(x);
  for (const x of spikes) {
    const h = 4 + Math.round(7 * bump(x, 31, 8) + 3 * bump(x, 16, 5));
    const X = sx(x);
    const y0 = top(x);
    for (let k = 1; k <= h; k++) {
      const w = Math.max(1, 3 - Math.floor((k * 3) / (h + 1)));
      const lx = X - Math.round(k * 0.45);
      P(lx - 1, y0 - k, w + 2, 1, RP.out);
    }
    for (let k = 0; k < h; k++) {
      const w = Math.max(1, 3 - Math.floor((k * 3) / (h + 1)));
      P(X - Math.round(k * 0.45), y0 - k, w, 1, k > h - 3 ? RP.spikeL : RP.spike);
    }
  }

  // near legs
  leg(19 + hb, 20 + low, 0, true, false);
  leg(36 + fb, 20 + low, 1, true, true);

  // head: big, low and forward, a long fanged snout
  const hx = 38 + fb;
  const hy = 13 + low;
  const open = asleep ? 0 : Math.round(jaw * 8);
  const jy = hy + 6 + open; // top of the lower jaw
  // outlines
  P(hx - 1, hy - 1, 12, 8, RP.out);
  P(hx + 9, hy, 9, 7, RP.out);
  P(hx, jy - 1, 16, 5, RP.out);
  if (open > 0) P(hx + 2, hy + 6, 14, open, RP.out);
  // skull + snout
  P(hx, hy, 10, 6, RP.body);
  P(hx + 10, hy + 1, 7, 5, RP.body);
  P(hx + 1, hy, 9, 1, RP.bodyLL);
  P(hx + 10, hy + 1, 6, 1, RP.bodyL);
  P(hx, hy + 4, 17, 2, RP.bodyD);
  D(hx + 15, hy + 2, RP.out); // nostril
  // brow ridge + horns swept back
  L(hx + 4, hy, hx + 1, hy - 4, RP.out, 2);
  L(hx + 4, hy, hx + 1, hy - 4, RP.spike);
  D(hx + 1, hy - 4, RP.spikeL);
  L(hx + 7, hy, hx + 5, hy - 3, RP.spike);
  D(hx + 5, hy - 3, RP.spikeL);
  D(hx - 1, hy + 5, RP.spike);
  D(hx - 2, hy + 6, RP.spikeL);
  // eye: a glowing green slit under a heavy brow
  if (asleep) P(hx + 5, hy + 2, 3, 1, RP.out);
  else {
    P(hx + 5, hy + 1, 4, 1, RP.out);
    P(hx + 6, hy + 2, 2, 1, RP.eye);
    D(hx + 5, hy + 2, RP.eyeD);
    withAlpha(ctx, 0.25 + 0.2 * Math.sin(t * 5 + cx), () => P(hx + 4, hy + 1, 5, 3, RP.gooL));
  }
  // mouth: dark gullet with ropes of goo between the jaws
  if (open > 0) {
    P(hx + 3, hy + 6, 13, open, RP.mouth);
    P(hx + 3, hy + 6, 3, open, RP.gum);
    if (open >= 3) {
      L(hx + 8, hy + 6, hx + 8, jy - 1, RP.goo);
      L(hx + 12, hy + 6, hx + 11, jy - 1, RP.gooD);
      D(hx + 6, jy - 1, RP.goo);
      D(hx + 9, hy + 7, RP.gooL);
    }
  }
  // upper fangs
  for (let x = hx + 3; x <= hx + 16; x += 2) {
    const len = (x - hx) % 6 === 1 ? 3 : (x - hx) % 4 === 1 ? 2 : 1;
    const l = open > 0 ? Math.min(len, open) : 1;
    P(x, hy + 6, 1, l, RP.tooth);
    if (l > 1) D(x, hy + 5 + l, RP.toothD);
  }
  // lower jaw, hinged at the back, with its own fangs
  P(hx + 1, jy, 15, 3, RP.bodyD);
  P(hx + 2, jy + 1, 12, 1, RP.body);
  P(hx + 2, jy + 2, 12, 1, RP.bodyDD);
  for (let x = hx + 4; x <= hx + 15; x += 2) {
    const len = (x - hx) % 6 === 2 ? 3 : 1;
    const l = open > 0 ? Math.min(len, open) : 1;
    P(x, jy - l, 1, l, RP.tooth);
  }
  // goo drooling off the jaw: thick strands that stretch, drop and grow again
  const chin = jy + 3;
  const strands = [hx + 5, hx + 9, hx + 12];
  strands.forEach((x, i) => {
    const ph = (t * 0.9 + i * 0.37 + cx * 0.013) % 1;
    const len = Math.max(1, Math.min(fy - chin - 1, Math.round(1 + ph * (asleep ? 2 : 8))));
    P(x, chin - 1, 2, len, RP.goo);
    D(x + 1, chin - 1, RP.gooD);
    P(x - (i === 1 ? 1 : 0), chin + len - 1, 3, 2, RP.goo);
    D(x, chin + len - 1, RP.gooL);
  });
  D(hx + 2, jy - 1, RP.goo); // dribble at the jaw's corner
  D(hx + 16, hy + 6, RP.goo);
}

/** World offset of a Reptilian's chin (where its goo drips from), for x facing f. */
export const REPTILE_CHIN = { dx: 19, dy: -12 };

/** A splat of goo on the ground, fading with `alpha`. */
export function drawGooPuddle(ctx, x, y, size, alpha) {
  withAlpha(ctx, alpha, () => {
    rect(ctx, Math.round(x - size), Math.round(y), size * 2 + 1, 1, RP.gooD);
    rect(ctx, Math.round(x - size + 1), Math.round(y), size * 2 - 1, 1, RP.goo);
    rect(ctx, Math.round(x), Math.round(y), 1, 1, RP.gooL);
  });
}

// ---------------------------------------------------------------- Shadow (minion)

const SH = {
  core: '#140a20',
  body: '#2a1840',
  bodyL: '#4a2c6a',
  rim: '#9a6ad0',
  wing: '#341e4c',
  wingD: '#201232',
  vein: '#7a4aa8',
  horn: '#5a4472',
};
/** Eye colours of the seven Shadows (variant 0–6), so each reads as its own creature. */
const SHADE_EYES = ['#ff4ae0', '#c070ff', '#ff6a9a', '#a070ff', '#ff4ae0', '#e070ff', '#ff5ac0'];

/**
 * A Shadow: a small flying wraith of smoke — tattered bat wings, horns, two glowing eyes, wisps
 * trailing below. (cx, y) = the bottom-centre of its body box (≈ 16 × 12). pose: flapT, charge 0..1
 * (a pulse gathering in its jaws), variant 0–6 (eye colour, horns, size), t.
 */
export function drawShade(ctx, cx, y, f, { flapT = 0, charge = 0, variant = 0, t = 0 } = {}) {
  const big = variant % 3 === 2 ? 1 : 0;
  const ox = Math.round(cx - 9);
  const oy = Math.round(y - 13 - big);
  const { P, D, L } = painter(ctx, ox, oy, 18, f);
  const flap = Math.sin(flapT * 11);
  const wy = Math.round(flap * 4); // wing tips up/down
  const eye = SHADE_EYES[variant % SHADE_EYES.length];
  // a dim violet haze round it, so it reads against the dark stone
  withAlpha(ctx, 0.22, () => disc(ctx, Math.round(cx), Math.round(y - 7), 10, '#7a3ab0'));

  // wisps trailing beneath, waving
  for (let i = 0; i < 3; i++) {
    const sw = Math.round(Math.sin(t * 6 + i * 2 + cx * 0.05) * 1.5);
    L(6 + i * 2, 10 + big, 5 + i * 2 + sw, 13 + big + (i % 2), i === 1 ? SH.bodyL : SH.body);
  }
  // far wing
  L(8, 6, 3, 2 + wy, SH.wingD, 2);
  L(3, 2 + wy, 0, 5 + wy, SH.wingD);
  // body: a smoky teardrop
  P(5, 4, 8, 6 + big, SH.body);
  P(6, 3, 6, 1, SH.body);
  P(6, 10 + big, 6, 1, SH.body);
  P(6, 5, 2, 4, SH.core);
  P(11, 4, 1, 5, SH.bodyL);
  P(6, 3, 6, 1, SH.rim); // moonlit back
  D(5, 4, SH.rim);
  D(12, 9, SH.rim);
  // head + horns
  P(10, 1, 5, 4, SH.body);
  P(11, 0, 3, 1, SH.body);
  const hornLen = 1 + (variant % 2);
  L(11, 0, 10 - hornLen, -1 - hornLen, SH.horn);
  L(13, 0, 14, -1 - hornLen, SH.horn);
  // eyes (and a pulse gathering in its jaws)
  D(12, 2, eye);
  D(14, 2, eye);
  if (charge > 0) {
    withAlpha(ctx, 0.4 + 0.6 * charge, () => disc(ctx, f === 1 ? ox + 15 : ox + 2, oy + 4, Math.round(1 + charge * 2), '#c070ff'));
    D(15, 4, '#ffffff');
  } else D(13, 4, SH.core);
  // near wing: tattered membrane with veins
  P(7, 5, 3, 2, SH.wing);
  L(8, 5, 14, 1 + wy, SH.wing, 2);
  L(14, 1 + wy, 17, 4 + wy, SH.wing);
  L(9, 6, 15, 5 + wy, SH.wing);
  L(9, 5, 15, 2 + wy, SH.vein);
  D(16, 5 + wy, SH.wingD); // ragged tip
  D(12, 6 + wy, SH.wingD);
}

/** A Shadow's purple pulse: a glowing orb with a throbbing ring. */
export function drawPulse(ctx, x, y, t) {
  const r = 4 + (Math.floor(t * 14) % 3);
  withAlpha(ctx, 0.25, () => disc(ctx, x, y, r + 1, '#9a4ae8'));
  withAlpha(ctx, 0.6, () => {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + t * 6;
      px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, '#d090ff');
    }
  });
  disc(ctx, x, y, 2, '#b060f0');
  disc(ctx, x, y, 1, '#e8c0ff');
  px(ctx, x, y, '#ffffff');
}

/** A faint violet smudge on the ground where a pulse burst. */
export function drawPulseScorch(ctx, x, y, a) {
  withAlpha(ctx, a, () => {
    ellipse(ctx, x, y, 7, 1, '#2a1438');
    rect(ctx, x - 2, y - 1, 1, 1, '#7a3ab0');
    rect(ctx, x + 3, y, 1, 1, '#7a3ab0');
  });
}
