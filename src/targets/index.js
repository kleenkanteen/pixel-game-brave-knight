import { GROUND_Y } from '../core/constants.js';
import { rect, px, withAlpha } from '../core/draw.js';
import { drawText } from '../core/font.js';

const RX = 5; // face half-width (the round target is turned three-quarters toward the knight)
const RY = 9; // face half-height
const CY = GROUND_Y - 19; // face centre
const RINGS = ['#f2c840', '#d0342c', '#3c6ac0', '#24202c', '#f0ebe0']; // bullseye → outer
const RIM = '#7a5a34';
const RIM_D = '#4e3820';
const LEG = '#7a5230';
const LEG_D = '#4e321c';
const SHAKE_TIME = 0.25;
const POP_TIME = 0.9;

/**
 * Targets slice: round archery targets on wooden easels. Each one is an arrow collider
 * (bow slice `colliders`): an arrow whose tip enters the face sticks; the target shakes, and a
 * bullseye pops "Bullseye!" above it. Emits 'target:hit' {index, ring} (ring 0 = bullseye).
 *
 * @param {import('../core/stage.js').World} world
 * @param {{xs:number[]}} opts  centre x of each target
 * @returns {{
 *   colliders:{hit(x:number, y:number):boolean, onHit(x:number, y:number):void}[],
 *   update(dt:number):void,
 *   render(ctx:CanvasRenderingContext2D):void,  // WORLD coords, before the arrows
 *   renderFront(ctx:CanvasRenderingContext2D):void,  // WORLD coords: "Bullseye!" pops
 * }}
 */
export function createTargets(world, { xs }) {
  const targets = xs.map((x, index) => ({ x, index, shakeT: 0 }));
  const pops = [];

  const inFace = (tg, x, y) => ((x - tg.x) / RX) ** 2 + ((y - CY) / RY) ** 2 <= 1;

  const colliders = targets.map((tg) => ({
    hit: (x, y) => inFace(tg, x, y),
    onHit(x, y) {
      tg.shakeT = SHAKE_TIME;
      const d = Math.abs(y - CY) / RY;
      const ring = Math.min(RINGS.length - 1, Math.floor(d * RINGS.length));
      if (ring === 0) pops.push({ x: tg.x, t: 0 });
      world.events.emit('target:hit', { index: tg.index, ring });
    },
  }));

  function update(dt) {
    for (const tg of targets) tg.shakeT = Math.max(0, tg.shakeT - dt);
    for (let i = pops.length - 1; i >= 0; i--) {
      pops[i].t += dt;
      if (pops[i].t >= POP_TIME) pops.splice(i, 1);
    }
  }

  function render(ctx) {
    for (const tg of targets) {
      const shake = tg.shakeT > 0 ? (Math.floor(tg.shakeT * 40) % 2 ? 1 : -1) : 0;
      const cx = Math.round(tg.x);
      // easel: two splayed front legs + a back prop, shadow
      rect(ctx, cx - 7, GROUND_Y, 15, 1, 'rgba(20,14,10,0.3)');
      for (let y = CY; y < GROUND_Y; y++) {
        const k = (y - CY) / (GROUND_Y - CY);
        px(ctx, cx - 1 - Math.round(k * 5), y, LEG);
        px(ctx, cx + 1 + Math.round(k * 5), y, LEG_D);
      }
      rect(ctx, cx - 4, GROUND_Y - 6, 9, 1, LEG_D); // cross brace
      // face: concentric ellipses, outer rim first
      const fx = cx + shake;
      ellipse(ctx, fx, CY, RX + 1, RY + 1, RIM_D);
      ellipse(ctx, fx, CY, RX + 1, RY, RIM);
      for (let r = RINGS.length - 1; r >= 0; r--) {
        const f = (r + 1) / RINGS.length;
        ellipse(ctx, fx, CY, Math.max(1, Math.round(RX * f)), Math.max(1, Math.round(RY * f)), RINGS[r]);
      }
      // straw edge on the far side (it's turned), light catch on the near
      rect(ctx, fx + RX + 1, CY - RY + 2, 1, RY * 2 - 3, RIM_D);
      px(ctx, fx - RX + 1, CY - RY + 3, '#ffffff');
    }
  }

  function renderFront(ctx) {
    for (const p of pops) {
      const rise = Math.round(p.t * 14);
      const a = Math.min(1, (POP_TIME - p.t) / 0.3);
      withAlpha(ctx, a, () =>
        drawText(ctx, 'Bullseye!', p.x, CY - RY - 14 - rise, { color: '#f2c840', align: 'center', outline: '#14101c' }),
      );
    }
  }

  return { colliders, update, render, renderFront };
}

/** Filled pixel ellipse. */
function ellipse(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  for (let dy = -ry; dy <= ry; dy++) {
    const half = Math.floor(rx * Math.sqrt(1 - (dy / ry) ** 2) + 0.3);
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}
