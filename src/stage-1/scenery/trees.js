// Fall trees: a trunk that forks into reaching branches, with small leaf sprites clustered on the
// branch tips (sky shows between clusters). Two trees are all-green; the rest mix yellow / red / dark red.
import { GROUND_Y } from '../../core/constants.js';
import { rect, px, line } from '../../core/draw.js';
import { createRng, LEAF } from './util.js';

const AUTUMN = ['yellow', 'red', 'darkred'];
const GREENS = ['green', 'green2', 'green3', 'green4'];

/**
 * Tree fields: x (trunk centre), h (total height), r (rough canopy radius, also used for fallen
 * leaves), shape (branching style), leaves (colour families), seed.
 * Optional: trunk ([mid, highlight, dark] bark colours), rot (0..1: share of leaves missing;
 * 1 = bare branches).
 */

/** Trees standing behind the church (hazed slightly for depth). */
export const BACK_TREES = [
  { x: 114, h: 62, r: 16, shape: 'tall', leaves: AUTUMN, seed: 11 },
  { x: 142, h: 80, r: 18, shape: 'oak', leaves: ['red', 'darkred', 'yellow', 'red'], seed: 12 },
  { x: 182, h: 76, r: 18, shape: 'oak', leaves: GREENS, seed: 13 },
  { x: 208, h: 60, r: 16, shape: 'tall', leaves: ['yellow', 'yellow', 'red', 'darkred'], seed: 14 },
];

/** Trees scattered across 0–240 (graveyard and past the church). */
export const MID_TREES = [
  { x: 14, h: 70, r: 20, shape: 'spread', leaves: ['darkred', 'red', 'darkred', 'yellow'], seed: 21 },
  { x: 32, h: 48, r: 12, shape: 'tall', leaves: ['yellow', 'yellow', 'red'], seed: 22 },
  { x: 96, h: 60, r: 16, shape: 'oak', leaves: GREENS, seed: 23 },
  { x: 230, h: 66, r: 19, shape: 'spread', leaves: AUTUMN, seed: 24 },
];

/** Branching styles: fan angle around the parent, length falloff, depth. */
const SHAPES = {
  oak: { fan: 0.62, decay: 0.74, depth: 4, trunk: 0.38 },
  spread: { fan: 0.85, decay: 0.78, depth: 4, trunk: 0.34 },
  tall: { fan: 0.42, decay: 0.72, depth: 4, trunk: 0.42 },
  // rotted: crooked, wide-flung limbs that droop instead of reaching up
  dead: { fan: 0.8, decay: 0.68, depth: 4, trunk: 0.46, lift: 0.02, jitter: 0.55 },
};

/**
 * Leaf sprites ('.' empty, d/m/l = dark/mid/light shade of the leaf's family). Flipped at random.
 */
const LEAF_SPRITES = [
  ['.l.', 'lmm', '.md'], // diamond
  ['lm', 'md'], // small round
  ['ll.', '.mm', '..d'], // diagonal blade
  ['lmm.', '.mmd'], // long oval
  ['m.m', 'mlm', '.d.'], // maple
  ['.l', 'lm', 'd.'], // narrow slant
  ['lm.', 'mmm', '.dm'], // broad
];

const BARK = ['#3b2a20', '#5a4230', '#24180f'];
// set per drawTree call (tree.trunk overrides)
let TRUNK = BARK[0];
let TRUNK_HI = BARK[1];
let TRUNK_DK = BARK[2];

function stamp(ctx, x, y, sprite, fam, flip, shade = 0) {
  const pal = LEAF[fam];
  const w = sprite[0].length;
  for (let ry = 0; ry < sprite.length; ry++) {
    for (let rx = 0; rx < w; rx++) {
      const ch = sprite[ry][flip ? w - 1 - rx : rx];
      if (ch === '.') continue;
      const i = Math.max(0, (ch === 'd' ? 0 : ch === 'm' ? 1 : 2) - shade);
      px(ctx, x + rx, y + ry, pal[i]);
    }
  }
}

function limb(ctx, x0, y0, x1, y1, size) {
  const o = size >> 1;
  line(ctx, x0 - o, y0, x1 - o, y1, TRUNK_DK, size);
  if (size >= 2) line(ctx, x0 - o, y0, x1 - o, y1, TRUNK, size - 1);
  if (size >= 3) line(ctx, x0 - o, y0, x1 - o, y1, TRUNK_HI, 1);
}

/** Recursively grow branches; collects leaf-cluster anchors in `tips`. */
function grow(ctx, rng, s, x, y, ang, len, size, depth, tips) {
  const ex = x + Math.cos(ang) * len;
  const ey = y + Math.sin(ang) * len;
  limb(ctx, x, y, ex, ey, size);
  // leaves all along the branch, not just at the tips: clusters at points on the limb, plus short
  // leafy twigs sprouting sideways from it (fewer on the thick limbs near the trunk)
  const along = depth >= 3 ? 1 : 2;
  for (let k = 1; k <= along; k++) {
    const f = k / (along + 1) + rng.range(-0.1, 0.1);
    tips.push({ x: x + (ex - x) * f, y: y + (ey - y) * f, small: true });
  }
  const twigs = depth >= 3 ? rng.int(1, 2) : rng.int(1, 3);
  for (let k = 0; k < twigs; k++) {
    const f = rng.range(0.3, 0.95);
    const bx = x + (ex - x) * f;
    const by = y + (ey - y) * f;
    const ta = ang + (rng.chance(0.5) ? 1 : -1) * rng.range(0.6, 1.2);
    const tl = rng.range(3, 6);
    const tx = bx + Math.cos(ta) * tl;
    const ty = by + Math.sin(ta) * tl;
    line(ctx, bx, by, tx, ty, TRUNK_DK, 1);
    tips.push({ x: tx, y: ty, small: rng.chance(0.5) });
  }
  if (depth === 0 || len < 3) {
    tips.push({ x: ex, y: ey });
    return;
  }
  const n = depth >= 3 ? 2 : rng.int(2, 3);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5; // -0.5..0.5
    const j = s.jitter ?? 0.18;
    const lift = s.lift ?? 0.15;
    let a = ang + t * 2 * s.fan + rng.range(-j, j);
    a = a * (1 - Math.abs(lift)) + (-Math.PI / 2) * lift; // gentle pull upward (or a droop, for dead trees)
    grow(ctx, rng, s, ex, ey, a, len * rng.range(s.decay - 0.08, s.decay + 0.06), Math.max(1, size - 1), depth - 1, tips);
  }
}

/** Draw one tree in world coords. */
export function drawTree(ctx, tree) {
  const rng = createRng(tree.seed);
  const s = SHAPES[tree.shape];
  [TRUNK, TRUNK_HI, TRUNK_DK] = tree.trunk ?? BARK;
  const rot = tree.rot ?? 0;
  const G = GROUND_Y;
  const cx = tree.x;
  const big = tree.r >= 16;
  const tw = big ? 4 : 3;
  const trunkH = Math.round(tree.h * s.trunk);
  const forkY = G - trunkH;

  // trunk + root flare + bark
  const tx = cx - (tw >> 1);
  rect(ctx, tx, forkY, tw, trunkH, TRUNK);
  rect(ctx, tx, forkY, 1, trunkH, TRUNK_HI);
  rect(ctx, tx + tw - 1, forkY, 1, trunkH, TRUNK_DK);
  rect(ctx, tx - 1, G - 2, tw + 2, 2, TRUNK);
  px(ctx, tx - 1, G - 2, TRUNK_HI);
  px(ctx, tx + tw, G - 1, TRUNK_DK);
  for (let y = forkY + 3; y < G - 4; y += rng.int(4, 7)) px(ctx, tx + 1, y, TRUNK_DK);

  // limbs: two or three main branches off the fork, plus a leader straight up
  const tips = [];
  const len0 = (tree.h - trunkH) / 2.6;
  const mains = big ? 3 : 2;
  for (let i = 0; i < mains; i++) {
    const t = mains === 1 ? 0 : i / (mains - 1) - 0.5;
    const a = -Math.PI / 2 + t * 2 * (s.fan + 0.25) + rng.range(-0.1, 0.1);
    const fy = forkY + (i === 1 ? 0 : rng.int(0, 4)); // side limbs leave the trunk a little lower
    grow(ctx, rng, s, cx, fy, a, len0 * (i === 1 ? 1 : rng.range(0.9, 1.1)), big ? 3 : 2, s.depth - 1, tips);
  }

  // leaves: each cluster leans toward one colour family; back layer darker, front layer lighter
  const clusters = tips.map((t) => ({
    ...t,
    fam: rng.pick(tree.leaves),
    rad: t.small ? rng.int(2, 3) : rng.int(3, big ? 6 : 5),
  }));
  for (let pass = 0; pass < 2; pass++) {
    for (const c of clusters) {
      const count = Math.round(c.rad * (pass === 0 ? 1.6 : 2.2));
      for (let i = 0; i < count; i++) {
        if (rot > 0 && rng.next() < rot) continue;
        const ang = rng.next() * Math.PI * 2;
        const d = Math.sqrt(rng.next()) * c.rad;
        const lx = Math.round(c.x + Math.cos(ang) * d) - 1;
        const ly = Math.round(c.y + Math.sin(ang) * d * 0.8) - 1 + (pass === 0 ? 1 : 0);
        const fam = rng.chance(0.72) ? c.fam : rng.pick(tree.leaves);
        stamp(ctx, lx, ly, rng.pick(LEAF_SPRITES), fam, rng.chance(0.5), pass === 0 ? 1 : 0);
      }
    }
  }
}
