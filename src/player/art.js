// Brave Knight drawn in code: 16×24, facing right in local coords, mirrored for facing −1.
// Internal to the player slice.
import { rect, line } from '../core/draw.js';
import { KNIGHT_W } from '../core/constants.js';

const C = {
  steel: '#aeb4c2',
  steelD: '#6f7587',
  steelL: '#e1e5ee',
  dark: '#221e2b',
  tabard: '#2f4f9a',
  tabardD: '#22386e',
  gold: '#e8c547',
  plume: '#c8323c',
  plumeD: '#8e1f2b',
  leather: '#5a3a24',
  glove: '#4a3426',
};

/** Shoulder pivot of the front arm, local coords (before bodyDy). */
export const SHOULDER = { x: 10, y: 12 };

/**
 * Pose description (all local, facing right):
 * {
 *   bodyDy,                         // upper body vertical offset
 *   legs: [{x, lift}, {x, lift}] | 'seated',   // back leg, front leg; 'seated' = astride the horse
 *   backArm:  'down' | {hx, hy},    // 'down' or a hand point
 *   frontArm: 'down' | {hx, hy},
 *   plumeSway,                      // 0 | 1
 * }
 */
export function drawKnight(ctx, ox, oy, facing, pose) {
  const P = (lx, ly, w, h, c) =>
    rect(ctx, facing === 1 ? ox + lx : ox + KNIGHT_W - lx - w, oy + ly, w, h, c);
  const X = (lx) => (facing === 1 ? ox + lx : ox + KNIGHT_W - 1 - lx);
  const dy = pose.bodyDy;

  const arm = (spec, sx, color) => {
    if (spec === 'down') {
      P(sx, 12 + dy, 2, 5, color);
      P(sx, 17 + dy, 2, 1, C.glove);
    } else {
      line(ctx, X(sx) - (facing === 1 ? 0 : 1), oy + 12 + dy, X(spec.hx) - (facing === 1 ? 0 : 1), oy + spec.hy, color, 2);
      P(spec.hx, spec.hy, 2, 2, C.glove);
    }
  };

  // Back arm (behind the body)
  arm(pose.backArm, 3, C.steelD);

  if (pose.legs !== 'seated') {
    // Legs: grey greaves with dark boots; back leg darker so the stride reads.
    pose.legs.forEach((leg, i) => {
      const top = 19 + dy;
      const bottom = 23 - leg.lift;
      if (bottom > top) P(leg.x, top, 3, bottom - top, i === 0 ? C.steelD : C.steel);
      P(leg.x, bottom, 4, 1, C.dark);
    });
  }

  // Torso armour + tabard
  P(4, 11 + dy, 8, 7, C.steel);
  P(4, 11 + dy, 8, 1, C.steelL);
  P(5, 12 + dy, 6, 6, C.tabard);
  P(5, 12 + dy, 1, 6, C.tabardD);
  P(8, 13 + dy, 1, 3, C.gold);
  P(7, 14 + dy, 3, 1, C.gold);
  P(5, 17 + dy, 6, 1, C.leather);
  P(8, 17 + dy, 1, 1, C.gold);
  P(5, 18 + dy, 6, 2, C.tabard);
  P(5, 19 + dy, 6, 1, C.tabardD);

  if (pose.legs === 'seated') {
    // Astride the horse (drawn over the tabard hem): near thigh forward along the saddle,
    // shin hanging down the flank, boot in the stirrup.
    P(5, 20 + dy, 7, 2, C.steel); // thigh
    P(5, 20 + dy, 7, 1, C.steelL);
    P(9, 22 + dy, 3, 7 - dy, C.steel); // shin, down the horse's flank
    P(9, 22 + dy, 1, 7 - dy, C.steelD);
    P(9, 29, 4, 1, C.dark); // boot
  }

  // Gorget + helmet
  P(5, 10 + dy, 6, 1, C.steelD);
  P(5, 2 + dy, 6, 1, C.steelL);
  P(4, 3 + dy, 8, 6, C.steel);
  P(4, 3 + dy, 1, 6, C.steelD);
  P(6, 3 + dy, 2, 1, C.steelL);
  P(5, 9 + dy, 6, 1, C.steelD);
  P(7, 5 + dy, 5, 1, C.dark); // visor slit
  P(10, 7 + dy, 1, 1, C.dark); // breath hole

  // Plume (trails behind)
  const s = pose.plumeSway;
  P(4, 0 + dy, 4, 1, C.plume);
  P(2 - s, 1 + dy, 6 + s, 1, C.plume);
  P(2 - s, 2 + dy, 3, 1, C.plumeD);
  P(2 - s, 3 + dy, 2, 1, C.plumeD);

  // Front arm (over the body)
  arm(pose.frontArm, 10, C.steel);
}

export const COLORS = C;
