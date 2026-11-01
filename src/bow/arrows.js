// Arrow flight: one simulation shared by the aim preview (the dotted line) and real arrows,
// so the preview shows exactly where an arrow lands. Internal to the bow slice.
import { GROUND_Y } from '../core/constants.js';

/** Gravity on arrows, px/s² (lighter than the knight's, so shots fly flat enough to aim). */
export const ARROW_G = 300;
const SUB = 1 / 120; // simulation substep (2 per fixed update)
const BURY = 1; // px an arrow's tip sinks into the ground
const MAX_FLIGHT = 4; // s; arrows that never land (off the world) are dropped

/**
 * Advance one arrow {x, y, vx, vy} (x, y = the TIP) by `dt` in SUB steps.
 * Returns null while flying, or what it hit: {kind:'ground'} | {kind:'collider', collider} |
 * {kind:'gone'} (left the world).
 * @param {{hit(x:number, y:number):boolean}[]} colliders
 */
export function stepArrow(a, dt, colliders, worldW) {
  for (let t = 0; t < dt - 1e-9; t += SUB) {
    a.vy += ARROW_G * SUB;
    a.x += a.vx * SUB;
    a.y += a.vy * SUB;
    a.age = (a.age ?? 0) + SUB;
    for (const c of colliders) if (c.hit(a.x, a.y)) return { kind: 'collider', collider: c };
    if (a.y >= GROUND_Y + BURY) {
      a.y = GROUND_Y + BURY;
      return { kind: 'ground' };
    }
    if (a.x < -40 || a.x > worldW + 40 || a.age > MAX_FLIGHT) return { kind: 'gone' };
  }
  return null;
}

/**
 * Path an arrow would take: points every ~`spacing` px along the flight, and where it ends.
 * @returns {{dots:[number, number][], end:[number, number], landed:boolean}}
 */
export function predict(x, y, vx, vy, colliders, worldW, spacing = 5) {
  const a = { x, y, vx, vy };
  const dots = [];
  let dist = 0;
  let px0 = x;
  let py0 = y;
  for (let i = 0; i < MAX_FLIGHT * 120; i++) {
    const hit = stepArrow(a, SUB, colliders, worldW);
    dist += Math.hypot(a.x - px0, a.y - py0);
    px0 = a.x;
    py0 = a.y;
    if (dist >= spacing) {
      dist -= spacing;
      dots.push([a.x, a.y]);
    }
    if (hit) return { dots, end: [a.x, a.y], landed: hit.kind !== 'gone' };
  }
  return { dots, end: [a.x, a.y], landed: false };
}
