// The monsters, drawn in code (feet on footY, facing right in local coords): the Zombie, the
// Werewolf and the Dark Mage. Internal to the battle slice.
import { disc, withAlpha } from '../core/draw.js';
import { painter } from './paint.js';

const DARK = '#14101c';

// ---------------------------------------------------------------- Zombie

const Z = {
  skin: '#7e9c66',
  skinD: '#5a7646',
  skinL: '#a0bc84',
  shirt: '#6a5844',
  shirtD: '#4a3c2e',
  pants: '#3e4658',
  pantsD: '#2a303e',
  eye: '#ff4a32',
  tooth: '#e0dcc0',
  blood: '#6e1a18',
};

/**
 * 16 × 22. pose: walkT (shamble cycle), lunge 0..1 (arms thrust in an attack).
 */
export function drawZombie(ctx, cx, footY, f, { walkT = 0, lunge = 0 } = {}) {
  const ox = Math.round(cx - 8);
  const oy = footY - 22;
  const { P, D, L } = painter(ctx, ox, oy, 16, f);
  const fr = Math.floor(walkT * 4) % 2;
  const loll = fr; // head lolls with the shamble
  const ext = Math.round(lunge * 3);
  const up = lunge > 0 ? -1 : 0;

  // back arm (far), reaching forward
  L(7, 10, 13 + ext, 10 + up, Z.skinD, 2);
  P(14 + ext, 10 + up, 1, 2, Z.skinD);

  // legs: a dragging shuffle
  P(5 + fr, 16, 2, 5, Z.pantsD);
  P(9 - fr, 16, 2, 5, Z.pants);
  P(4 + fr, 21, 3, 1, DARK);
  P(9 - fr, 21, 3, 1, DARK);
  D(9 - fr, 18, Z.skinD); // torn knee

  // hunched torso in a torn shirt
  P(4, 8, 7, 8, Z.shirt);
  P(4, 8, 1, 8, Z.shirtD);
  P(5, 8, 5, 1, Z.shirtD);
  D(4, 16, Z.shirtD);
  D(6, 16, Z.shirt);
  D(9, 16, Z.shirtD);
  P(6, 11, 2, 2, Z.skinD); // hole
  D(8, 13, Z.blood);
  D(9, 14, Z.blood);

  // head pushed forward
  const hy = 1 + loll;
  P(7, hy, 6, 6, Z.skin);
  P(7, hy, 6, 1, Z.skinD);
  P(12, hy + 1, 1, 4, Z.skinL);
  D(8, hy - 1, DARK); // patchy hair
  D(10, hy - 1, DARK);
  D(9, hy, DARK);
  P(10, hy + 2, 2, 2, DARK); // eye socket
  D(11, hy + 2, Z.eye);
  D(8, hy + 2, DARK);
  P(10, hy + 5, 3, 1, DARK); // gaping mouth
  D(11, hy + 5, Z.tooth);
  D(7, hy + 3, Z.skinD); // ear
  P(8, hy + 6, 4, 1, Z.skinD); // jaw

  // front arm, reaching
  L(9, 10, 14 + ext, 11 + up, Z.skin, 2);
  P(15 + ext, 11 + up, 1, 2, Z.skinD);
  D(15 + ext, 13 + up, Z.skinD);
}

// ---------------------------------------------------------------- Werewolf

const W = {
  fur: '#5e5058',
  furD: '#3e343c',
  furDD: '#2a2228',
  furL: '#84747e',
  belly: '#9a8a7c',
  eye: '#ffd23a',
  claw: '#ece4d4',
  tooth: '#f4f0e4',
  mouth: '#6e1a18',
};

/**
 * 24 × 28. pose: walkT, arm: 'idle' | 'wind' (claw raised back) | 'swing' (claw slashing, p 0..1),
 * air (px above the ground, for the jump back).
 */
export function drawWerewolf(ctx, cx, footY, f, { walkT = 0, arm = 'idle', p = 0, air = 0, t = 0 } = {}) {
  const ox = Math.round(cx - 12);
  const oy = Math.round(footY - 28 - air);
  const { P, D, L } = painter(ctx, ox, oy, 24, f);
  const fr = Math.floor(walkT * 7) % 2;
  const tuck = air > 2 ? 2 : 0;
  const breathe = arm === 'idle' && Math.sin(t * 3) > 0.5 ? 1 : 0;
  const b = breathe;

  // bushy tail
  P(1, 13 + b, 4, 3, W.furD);
  P(0, 11 + b, 3, 3, W.fur);
  D(0, 10 + b, W.furL);

  // far arm hanging, claws
  P(7, 11 + b, 2, 7, W.furD);
  D(7, 18 + b, W.claw);
  D(9, 18 + b, W.claw);

  // digitigrade legs (far darker), feet with claws
  const lg = (x, c, s) => {
    P(x, 18, 4, 4 - tuck, c);
    L(x + 1 + s, 22 - tuck, x - 1 + s, 25 - tuck, c, 2);
    P(x - 1 + s, 26 - tuck, 4, 2, W.furDD);
    D(x + 3 + s, 27 - tuck, W.claw);
  };
  lg(5, W.furD, fr ? 1 : -1);
  lg(10, W.fur, fr ? -1 : 1);

  // hunched torso, shaggy back
  P(4, 9 + b, 11, 10, W.fur);
  P(5, 7 + b, 7, 2, W.fur);
  P(4, 10 + b, 1, 9, W.furD);
  for (const x of [4, 6, 8, 10]) D(x, 6 + b + (x % 4 ? 0 : 1), W.furD);
  D(5, 7 + b, W.furL);
  D(9, 7 + b, W.furL);
  P(12, 11 + b, 3, 7, W.belly);
  P(9, 17 + b, 5, 2, W.belly);
  D(12, 13 + b, W.fur);
  D(13, 15 + b, W.fur);

  // neck ruff
  P(11, 6 + b, 4, 5, W.furD);
  D(11, 11 + b, W.furD);

  // head: skull, snout, open jaws, yellow eye, ears
  P(12, 3 + b, 6, 6, W.fur);
  P(12, 3 + b, 6, 1, W.furL);
  P(18, 5 + b, 5, 2, W.fur);
  D(22, 5 + b, DARK); // nose
  P(18, 7 + b, 4, 1, W.mouth);
  P(18, 8 + b, 4, 1, W.furD); // jaw
  D(19, 7 + b, W.tooth);
  D(21, 7 + b, W.tooth);
  D(20, 8 + b, W.tooth);
  P(15, 3 + b, 3, 1, W.furDD); // brow
  D(16, 4 + b, W.eye);
  D(17, 4 + b, '#fff6a0');
  P(12, 0 + b, 2, 3, W.furD);
  P(14, 1 + b, 2, 3, W.fur);
  D(15, 2 + b, W.mouth);

  // front arm: idle hangs forward, wind raises it back, swing slashes down in front
  const sh = [13, 11 + b];
  let hand;
  if (arm === 'wind') hand = [10, 1];
  else if (arm === 'swing') {
    const a = -2.2 + 2.9 * Math.min(1, p * 1.4);
    hand = [13 + Math.cos(a) * 10, 11 + Math.sin(a) * 10];
  } else hand = [16, 18 + b];
  L(sh[0], sh[1], hand[0], hand[1], W.fur, 3);
  // three claws pointing away from the shoulder
  const dx = hand[0] - sh[0];
  const dy = hand[1] - sh[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  for (let k = -1; k <= 1; k++) {
    D(hand[0] + ux * 3 - uy * k * 1.5, hand[1] + uy * 3 + ux * k * 1.5, W.claw);
    D(hand[0] + ux * 4 - uy * k * 1.5, hand[1] + uy * 4 + ux * k * 1.5, W.claw);
  }

  // slash trail: three pale arcs sweeping after the claws
  if (arm === 'swing') {
    const end = -2.2 + 2.9 * Math.min(1, p * 1.4);
    withAlpha(ctx, Math.max(0, 1 - p * 0.8), () => {
      for (let k = 0; k < 3; k++) {
        const r = 12 + k * 2;
        for (let a = end - 1.5; a <= end; a += 0.09) {
          D(13 + Math.cos(a) * r, 11 + Math.sin(a) * r, a > end - 0.4 ? '#ffffff' : '#d8d0e8');
        }
      }
    });
  }
}

// ---------------------------------------------------------------- Dark Mage

const DM = {
  robe: '#3a2244',
  robeD: '#24142c',
  robeL: '#58346a',
  trim: '#b0302c',
  trimD: '#701c1c',
  face: '#0a060c',
  eye: '#ff5a3a',
  eyeL: '#ffd27a',
  hand: '#c8bca8',
  staff: '#3e2c1e',
  staffL: '#5e4430',
  fire: '#ff8a2a',
  fireL: '#ffd060',
  fireD: '#c83c1c',
};

/** World position of the Dark Mage's fire orb for a pose (kept in sync with drawDarkMage). */
export function darkOrb(cx, footY, f, { cast = 0 } = {}) {
  const ox = Math.round(cx - 8);
  const sx = 13;
  return { x: f === 1 ? ox + sx : ox + 15 - sx, y: footY - 26 - 4 - Math.round(cast * 4) };
}

/**
 * 16 × 26. pose: bob, cast 0..1 (staff raised, orb flaring), t.
 */
export function drawDarkMage(ctx, cx, footY, f, { bob = 0, cast = 0, t = 0 } = {}) {
  const ox = Math.round(cx - 8);
  const oy = footY - 26;
  const { P, D, L } = painter(ctx, ox, oy, 16, f);
  const b = bob;
  const raise = Math.round(cast * 4);

  // robe: widens to a ragged hem, red trim
  for (let y = 10; y <= 25; y++) {
    const l = 4 - Math.floor((y - 10) / 6);
    const r = 11 + Math.floor((y - 10) / 5);
    const yy = y + (y < 22 ? b : 0);
    P(l, yy, r - l + 1, 1, DM.robe);
    P(l, yy, 2, 1, DM.robeD);
    D(r, yy, DM.trim);
  }
  P(2, 25, 13, 1, DM.trim);
  for (const x of [3, 6, 9, 12]) D(x, 25, DM.trimD);
  P(5, 15 + b, 7, 1, DM.trimD); // sash
  D(9, 16 + b, DM.eyeL);
  D(7, 19 + b, DM.robeL); // rune
  D(8, 20 + b, DM.robeL);
  D(7, 21 + b, DM.robeL);

  // pointed hood, empty dark face with burning eyes
  P(4, 0 + b, 2, 1, DM.robeD);
  P(4, 1 + b, 4, 1, DM.robe);
  P(5, 2 + b, 6, 1, DM.robe);
  P(4, 3 + b, 8, 7, DM.robe);
  P(4, 3 + b, 2, 7, DM.robeD);
  P(6, 2 + b, 3, 1, DM.robeL);
  P(7, 4 + b, 4, 5, DM.face);
  const glow = cast > 0 || Math.sin(t * 3) > 0.7;
  D(8, 5 + b, glow ? DM.eyeL : DM.eye);
  D(10, 5 + b, glow ? DM.eyeL : DM.eye);
  P(11, 3 + b, 1, 6, DM.robeL);

  // gnarled staff with a claw head holding the fire
  const top = -1 + b - raise;
  P(13, top + 1, 1, 25 - top, DM.staff);
  for (let y = top + 3; y < 25; y += 5) D(13, y, DM.staffL);
  D(12, top, DM.staff);
  D(14, top, DM.staff);
  D(11, top - 1, DM.staffL);
  D(15, top - 1, DM.staffL);
  D(11, top - 2, DM.staff);
  D(15, top - 2, DM.staff);

  // sleeve + bony hand
  L(9, 12 + b, 12, 14 + b - raise, DM.robeL, 2);
  P(12, 13 + b - raise, 2, 2, DM.hand);

  // fire orb: flickering glow
  const o = darkOrb(cx, footY, f, { cast });
  const fl = Math.sin(t * 17) > 0 ? 1 : 0;
  withAlpha(ctx, 0.18 + cast * 0.3, () => disc(ctx, o.x, o.y, 4 + fl + Math.round(cast * 3), DM.fire));
  disc(ctx, o.x, o.y, 2, DM.fireD);
  disc(ctx, o.x, o.y - fl, 1, DM.fire);
  ctx.fillStyle = DM.fireL;
  ctx.fillRect(o.x, o.y - 1 - fl, 1, 1);
  ctx.fillRect(o.x, o.y - 3 - fl, 1, 1);
}
