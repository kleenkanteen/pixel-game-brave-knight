import { GROUND_Y, STRIKE_TIME } from '../core/constants.js';
import { isNear } from '../core/proximity.js';
import { rect, px, withAlpha } from '../core/draw.js';
import { sfx } from '../sfx/index.js';

const GROUND_LEN = 15; // lying-flat sword length (pommel → tip)
const HINT_TIME = 5; // seconds "Click to strike sword" stays up
const GLINT_EVERY = 3.2; // seconds between glint sparkles on the grounded sword
const GLINT_TIME = 0.45;
const BLADE_LEN = 12; // held blade length in px (from the guard)
const TRAIL_TIME = 0.12; // the slash trail lingers a moment after the swing

const C = {
  bladeL: '#f4f7fc',
  blade: '#c9d0dc',
  bladeD: '#7d8597',
  fuller: '#a3abbb',
  guard: '#e0b53a',
  guardD: '#9c7420',
  grip: '#6b4428',
  gripD: '#432a18',
  pommel: '#f0cf5a',
  pommelD: '#a87f22',
  gem: '#c8323c',
  shadow: 'rgba(20,14,10,0.35)',
  glint: '#ffffff',
  trail: '#eaf4ff',
  trailD: '#9fc4ff',
};

/**
 * Sword slice: the sword on the ground, Interact pickup, the held sword and Strike.
 *   - Not held + knight near (proximity rule) → Prompt "Press space to pick up" above the KNIGHT;
 *     Interact → knight.hasSword = true, emit 'sword:picked'.
 *   - Held: Prompt "Click to strike sword" above the knight for 5 s.
 *   - Held + in hand (knight.weapon === 'sword') + click (Dialogue consumes its clicks first)
 *     → knight.strikeT = STRIKE_TIME, emit 'sword:strike'. Animation only; nothing to hit.
 *   - Picking it up puts it in hand (knight.weapon = 'sword'); the bow slice can switch away.
 *   - x = null: no sword on the ground in this Stage (it may arrive carried: knight.hasSword).
 *
 * @param {import('../core/stage.js').World} world
 * @param {{x:number|null, prompts:{show(text:string, worldX:number, topY:number):void}, dialogue?:{isOpen():boolean}}} opts
 *   x = centre on the ground; optional dialogue → no pickup/Prompt while a Dialogue is open
 * @returns {{
 *   update(dt:number):void,
 *   render(ctx:CanvasRenderingContext2D):void,      // WORLD coords: sword lying on the ground (if not held)
 *   renderHeld(ctx:CanvasRenderingContext2D):void,  // WORLD coords: sword in the knight's hand (after player.render)
 * }}
 */
export function createSword(world, { x, prompts, dialogue = null }) {
  let hintT = 0;
  let t = 0;
  // Slash trail: drawn from the swing's start angle to the current blade, + linger timer.
  let trailFade = 0;
  let swingFrom = null; // angle at the start of the current Strike
  let swingTo = 0; // last blade angle of the Strike (the trail keeps it while it lingers)

  function update(dt) {
    t += dt;
    const { knight, input, events } = world;
    updateTrail(dt, knight);
    if (!knight.controlsEnabled || dialogue?.isOpen()) return;
    const head = knight.y - knight.height;
    const centre = knight.x + knight.width / 2;

    if (!knight.hasSword) {
      if (x !== null && isNear(knight, x, GROUND_LEN)) {
        prompts.show('Press space to pick up', centre, head);
        if (input.wasPressed('interact')) {
          knight.hasSword = true;
          knight.weapon = 'sword';
          hintT = HINT_TIME;
          events.emit('sword:picked');
        }
      }
      return;
    }

    if (knight.weapon !== 'sword') return;
    if (hintT > 0) {
      hintT -= dt;
      prompts.show('Click to strike sword', centre, head);
    }
    if (input.wasClicked() && knight.strikeT <= 0) {
      input.consumeClick();
      knight.strikeT = STRIKE_TIME;
      swingFrom = null;
      events.emit('sword:strike');
      sfx.slash();
    }
  }

  function updateTrail(dt, k) {
    if (k.strikeT > 0) {
      if (swingFrom === null) swingFrom = k.swordAngle;
      swingTo = k.swordAngle;
      trailFade = TRAIL_TIME;
    } else if (trailFade > 0) {
      trailFade = Math.max(0, trailFade - dt);
      if (trailFade === 0) swingFrom = null;
    }
  }

  // ---------------------------------------------------------------- on the ground

  function render(ctx) {
    if (world.knight.hasSword || x === null) return;
    const L = Math.round(x - GROUND_LEN / 2); // pommel end (left), tip to the right
    const y = GROUND_Y - 3; // top row of the guard; blade rows y+1..y+2

    // soft shadow in the grass
    rect(ctx, L + 1, GROUND_Y, GROUND_LEN - 1, 1, C.shadow);

    // pommel (round, with a gem)
    rect(ctx, L, y + 1, 2, 2, C.pommel);
    px(ctx, L, y + 2, C.pommelD);
    px(ctx, L + 1, y + 1, C.gem);
    // grip with leather wrap
    rect(ctx, L + 2, y + 1, 3, 2, C.grip);
    px(ctx, L + 3, y + 1, C.gripD);
    px(ctx, L + 2, y + 2, C.gripD);
    px(ctx, L + 4, y + 2, C.gripD);
    // crossguard (seen from the side: tall bar with gold tips)
    rect(ctx, L + 5, y - 1, 1, 5, C.guard);
    rect(ctx, L + 6, y, 1, 3, C.guardD);
    px(ctx, L + 5, y - 1, C.pommel);
    // blade: highlight row on top, darker edge below, fuller line, tapered tip
    const b0 = L + 7;
    const bl = GROUND_LEN - 7;
    rect(ctx, b0, y + 1, bl - 1, 1, C.bladeL);
    rect(ctx, b0, y + 2, bl - 2, 1, C.blade);
    rect(ctx, b0 + 1, y + 2, bl - 4, 1, C.fuller);
    px(ctx, b0 + bl - 1, y + 2, C.bladeD); // tip
    px(ctx, b0 + bl - 2, y + 2, C.blade);

    // glint: a small 4-point sparkle sliding along the blade every few seconds
    const g = t % GLINT_EVERY;
    if (g < GLINT_TIME) {
      const p = g / GLINT_TIME;
      const gx = Math.round(b0 + p * (bl - 2));
      const gy = y + 1;
      const arm = p < 0.25 || p > 0.75 ? 1 : 2;
      px(ctx, gx, gy, C.glint);
      withAlpha(ctx, 0.85, () => {
        for (let i = 1; i <= arm; i++) {
          px(ctx, gx - i, gy, C.glint);
          px(ctx, gx + i, gy, C.glint);
          px(ctx, gx, gy - i, C.glint);
          if (i === 1) px(ctx, gx, gy + i, C.glint);
        }
      });
    }
  }

  // ---------------------------------------------------------------- in hand

  function renderHeld(ctx) {
    const k = world.knight;
    if (!k.hasSword || k.weapon !== 'sword') return;
    const f = k.facing;
    const a = k.swordAngle;
    const dx = Math.cos(a) * f;
    const dy = Math.sin(a);
    // perpendicular, pointing to the blade's "top" side (towards the light)
    const nx = -dy * f;
    const ny = dx * f;
    const hx = k.handX;
    const hy = k.handY;
    const at = (i, s = 0) => [hx + dx * i + nx * s, hy + dy * i + ny * s];
    const dot = (p, c) => px(ctx, p[0], p[1], c);

    if (k.strikeT > 0 || trailFade > 0) drawTrail(ctx, k);

    // pommel + grip (behind the hand), guard, blade
    dot(at(-3), C.pommel);
    dot(at(-2), C.gripD);
    dot(at(-1), C.grip);
    for (let s = -2; s <= 2; s++) dot(at(1, s), Math.abs(s) === 2 ? C.guardD : C.guard);
    for (let i = 2; i <= BLADE_LEN; i++) {
      const tip = i === BLADE_LEN;
      dot(at(i), tip ? C.bladeD : i === BLADE_LEN - 1 ? C.blade : C.fuller);
      if (!tip) dot(at(i, 0.75), C.bladeL);
      if (i < BLADE_LEN - 1) dot(at(i, -0.75), C.bladeD);
    }
    // a little shine on the blade while it's idle
    if (k.strikeT <= 0 && t % 2.6 < 0.2) dot(at(BLADE_LEN - 3, 0.75), C.glint);
  }

  /** Crescent of pixels sweeping behind the blade from the swing's start to now. */
  function drawTrail(ctx, k) {
    const f = k.facing;
    const cur = k.strikeT > 0 ? k.swordAngle : swingTo;
    const from = swingFrom ?? cur;
    const span = cur - from;
    if (Math.abs(span) < 0.05) return;
    const fade = k.strikeT > 0 ? 1 : trailFade / TRAIL_TIME;
    const steps = Math.ceil(Math.abs(span) / 0.06);
    for (let s = 0; s <= steps; s++) {
      const q = s / steps; // 0 = start of swing, 1 = current blade
      const ang = from + span * q;
      const cx = Math.cos(ang) * f;
      const cy = Math.sin(ang);
      // crescent: thick near the blade, thinning towards the start
      const inner = BLADE_LEN - 1 - Math.round(q * 5);
      const alpha = fade * (0.15 + 0.75 * q * q);
      withAlpha(ctx, alpha, () => {
        for (let r = inner; r <= BLADE_LEN + 1; r++) {
          const c = r >= BLADE_LEN ? C.trail : C.trailD;
          px(ctx, k.handX + cx * r, k.handY + cy * r, c);
        }
      });
    }
  }

  return { update, render, renderHeld };
}
