import { GROUND_Y } from '../core/constants.js';
import { isNear } from '../core/proximity.js';
import { px, rect, withAlpha } from '../core/draw.js';
import { drawArrow, drawBow, drawBowLying, ARROW_LEN, BOW_HALF } from './art.js';
import { stepArrow, predict } from './arrows.js';
import { sfx } from '../sfx/index.js';

const PICKUP_W = BOW_HALF * 2 + 1; // the bow on the table, for the proximity rule
const POWER = 5; // launch speed (px/s) per px of pull
const MAX_PULL = 64; // px of drag for a full draw
const MIN_PULL = 4; // shorter drags don't draw the string (releasing cancels)
const DRAW_BACK = 2; // px behind the grip the string rests at, + DRAW_SPAN × pull
const DRAW_SPAN = 5; // (matches the player's string-hand pose)
const MAX_STUCK = 60; // oldest stuck arrows disappear past this
const SWITCH_HINT_TIME = 8;
const AIM_HINT_TIME = 6;
const REST_TILT = 0.25; // bow carried nearly upright, tilted a little forward
const PREVIEW_DOT = ['#fff6d8', '#e8c547'];
const PREVIEW_SHADOW = '#14101c';
const PREVIEW_SPACING = 7; // px between dots along the arc

/**
 * Bow slice: the bow on its table, pickup, switching weapons, drawing + shooting arrows.
 *   - Not picked up + knight near the table's bow (proximity rule) + no Dialogue →
 *     Prompt "Press B to pick up bow" above the KNIGHT; B → knight.hasBow, emit 'bow:picked'.
 *     With the sword he keeps the sword in hand and is told "Press Q to switch weapons";
 *     without one the bow goes straight into his hand.
 *   - Q (both weapons, not drawing / striking) → knight.weapon toggles 'sword' ↔ 'bow'.
 *   - Bow in hand: press anywhere (click), drag BACK and release — a slingshot pull. The pull
 *     (press point − mouse) sets direction and power; while drawing he faces the shot (even
 *     running the other way), and a dotted line shows the arc up to where it will hit.
 *     Release → the arrow flies that arc (gravity) and stays where it lands: in the ground, or
 *     in a collider (targets, the sign). Unlimited arrows; works walking, jumping and mounted.
 *     A collider with `sticks: false` (monsters) takes the hit — onHit(x, y, vx) — and the arrow
 *     is spent: nothing stays stuck.
 *   - Emits 'bow:shot', and 'arrow:hit' {collider, x, y} / 'arrow:ground' {x, y}.
 *
 * @param {import('../core/stage.js').World} world
 * @param {{
 *   x:number|null, tableTop:number,  // bow lying centred on x on a table whose top row is tableTop (null: none)
 *   prompts:{show(text:string, worldX:number, topY:number):void},
 *   dialogue:{isOpen():boolean},
 *   colliders?:{hit(x:number, y:number):boolean, onHit?(x:number, y:number, vx?:number):void, sticks?:boolean}[],
 *   power?:()=>number,  // launch speed multiplier this tick (default 1; Stage 5's tall plaza: 1.5)
 * }} opts
 * @returns {{
 *   update(dt:number):void,
 *   render(ctx:CanvasRenderingContext2D):void,      // WORLD: bow on the table, stuck + flying arrows
 *   renderHeld(ctx:CanvasRenderingContext2D):void,  // WORLD: bow in hand + aim preview (after player.render)
 * }}
 */
export function createBow(world, { x = null, tableTop = GROUND_Y, prompts, dialogue, colliders = [], power = () => 1 }) {
  let t = 0;
  let aim = null; // {ax, ay} press point (screen px) while the button is held
  let pull = null; // {vx, vy, len} this tick's launch vector (len ≥ MIN_PULL) or null
  let preview = null;
  let switchHintT = 0;
  let aimHintT = 0;
  let aimHintShown = false;
  const flying = [];
  const stuck = [];
  const sparks = [];

  const head = (k) => k.y - k.height;
  const centre = (k) => k.x + k.width / 2;

  function equipBow(k) {
    k.weapon = 'bow';
    if (!aimHintShown) {
      aimHintShown = true;
      aimHintT = AIM_HINT_TIME;
    }
  }

  function cancelAim(k) {
    aim = null;
    pull = null;
    preview = null;
    k.drawPull = 0;
    k.aimFacing = 0;
  }

  function update(dt) {
    t += dt;
    const { knight: k, input, events } = world;
    updateArrows(dt);

    if (!k.controlsEnabled || dialogue.isOpen()) {
      if (aim) cancelAim(k);
      return;
    }

    // pickup
    if (!k.hasBow) {
      if (x !== null && isNear(k, x, PICKUP_W)) {
        prompts.show('Press B to pick up bow', centre(k), head(k));
        if (input.wasPressed('bow')) {
          k.hasBow = true;
          events.emit('bow:picked');
          if (k.hasSword) switchHintT = SWITCH_HINT_TIME;
          else equipBow(k);
        }
      }
      return;
    }

    // switching weapons
    if (input.wasPressed('switch') && !aim && k.strikeT <= 0) {
      if (k.weapon === 'bow' && k.hasSword) k.weapon = 'sword';
      else equipBow(k);
      switchHintT = 0;
      events.emit('weapon:switched', { weapon: k.weapon });
    }
    if (switchHintT > 0) {
      switchHintT -= dt;
      prompts.show('Press Q to switch weapons', centre(k), head(k));
    } else if (aimHintT > 0 && k.weapon === 'bow') {
      aimHintT -= dt;
      prompts.show('Click, pull back and let go to shoot', centre(k), head(k));
    }

    if (k.weapon !== 'bow') {
      if (aim) cancelAim(k);
      return;
    }

    // drawing: press anywhere, drag back, release
    if (!aim && input.wasClicked()) {
      input.consumeClick();
      aim = { ax: input.mouse.x, ay: input.mouse.y };
    }
    if (!aim) return;
    const dx = aim.ax - input.mouse.x;
    const dy = aim.ay - input.mouse.y;
    const len = Math.hypot(dx, dy);
    if (len >= MIN_PULL) {
      const s = (Math.min(len, MAX_PULL) / len) * POWER * power();
      pull = { vx: dx * s, vy: dy * s, len: Math.min(len, MAX_PULL) };
      k.aimFacing = dx > 0 ? 1 : dx < 0 ? -1 : k.facing;
      k.aimAngle = Math.atan2(dy, Math.abs(dx) || 1e-6);
      k.drawPull = pull.len / MAX_PULL;
      const [ox, oy] = nockTip(k);
      preview = predict(ox, oy, pull.vx, pull.vy, colliders, world.worldWidth, PREVIEW_SPACING);
    } else {
      pull = null;
      preview = null;
      k.drawPull = 0;
      k.aimFacing = 0;
    }

    if (input.wasReleased() || !input.isMouseDown()) {
      if (pull) {
        const [ox, oy] = nockTip(k);
        flying.push({ x: ox, y: oy, vx: pull.vx, vy: pull.vy });
        aimHintT = 0;
        events.emit('bow:shot');
        sfx.bowString();
      }
      cancelAim(k);
    }
  }

  /** World position of the nocked arrow's tip (where a shot starts). */
  function nockTip(k) {
    const f = k.aimFacing || k.facing;
    const dx = Math.cos(k.aimAngle) * f;
    const dy = Math.sin(k.aimAngle);
    const back = DRAW_BACK + k.drawPull * DRAW_SPAN;
    return [k.handX - dx * back + dx * ARROW_LEN, k.handY - dy * back + dy * ARROW_LEN];
  }

  function updateArrows(dt) {
    const { events } = world;
    for (let i = flying.length - 1; i >= 0; i--) {
      const a = flying[i];
      const hit = stepArrow(a, dt, colliders, world.worldWidth);
      if (!hit) continue;
      flying.splice(i, 1);
      if (hit.kind === 'gone') continue;
      const ang = Math.atan2(a.vy, a.vx);
      if (hit.kind === 'collider' && hit.collider.sticks === false) {
        // a moving target (a monster): the arrow is spent on it, nothing stays stuck
        hit.collider.onHit?.(a.x, a.y, a.vx);
        events.emit('arrow:hit', { collider: hit.collider, x: a.x, y: a.y });
        for (let j = 0; j < 5; j++) {
          sparks.push({ x: a.x, y: a.y, vx: (Math.random() - 0.5) * 50 - Math.cos(ang) * 20, vy: -Math.random() * 40, life: 0.3 });
        }
        continue;
      }
      if (hit.kind === 'collider') {
        // sink the tip a little into what it hit
        a.x += Math.cos(ang) * 2;
        a.y += Math.sin(ang) * 2;
      }
      stuck.push({ x: a.x, y: a.y, ang, inGround: hit.kind === 'ground' });
      if (stuck.length > MAX_STUCK) stuck.shift();
      if (hit.kind === 'collider') {
        hit.collider.onHit?.(a.x, a.y);
        events.emit('arrow:hit', { collider: hit.collider, x: a.x, y: a.y });
        for (let j = 0; j < 5; j++) {
          sparks.push({ x: a.x, y: a.y, vx: (Math.random() - 0.5) * 50 - Math.cos(ang) * 20, vy: -Math.random() * 40, life: 0.3 });
        }
      } else {
        events.emit('arrow:ground', { x: a.x, y: a.y });
        for (let j = 0; j < 3; j++) {
          sparks.push({ x: a.x, y: GROUND_Y - 1, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 20, life: 0.25, dirt: true });
        }
      }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life -= dt;
      s.vy += 200 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.life <= 0) sparks.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------- render

  function render(ctx) {
    if (!world.knight.hasBow && x !== null) drawBowLying(ctx, x, tableTop, t);
    for (const a of stuck) {
      // the tip is buried: in the ground nothing below the grass line shows; in a target the
      // first couple of px are inside it
      const hidden = a.inGround ? (i, X, Y) => Math.round(Y) > GROUND_Y : (i) => i < 3;
      drawArrow(ctx, a.x, a.y, a.ang, hidden);
    }
    for (const a of flying) drawArrow(ctx, a.x, a.y, Math.atan2(a.vy, a.vx));
    for (const s of sparks) px(ctx, s.x, s.y, s.dirt ? '#5e4a32' : s.life > 0.15 ? '#fff1c4' : '#d9a62c');
  }

  function renderHeld(ctx) {
    const k = world.knight;
    if (!k.hasBow || k.weapon !== 'bow' || !k.visible) return;
    const f = k.aimFacing || k.facing;
    const rel = k.drawPull > 0 ? k.aimAngle : REST_TILT;
    const ang = f === 1 ? rel : Math.PI - rel; // facing-relative → world
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);

    if (preview) drawPreview(ctx);

    if (k.drawPull > 0) {
      const back = DRAW_BACK + k.drawPull * DRAW_SPAN;
      const nock = [k.handX - dx * back, k.handY - dy * back];
      drawBow(ctx, k.handX, k.handY, ang, nock);
      drawArrow(ctx, nock[0] + dx * ARROW_LEN, nock[1] + dy * ARROW_LEN, ang);
    } else {
      drawBow(ctx, k.handX, k.handY, ang, null);
    }
  }

  /** Dotted arc to the landing point, fading in as the string is drawn, + a mark where it hits. */
  function drawPreview(ctx) {
    const { dots, end, landed } = preview;
    const a = 0.7 + 0.3 * world.knight.drawPull;
    withAlpha(ctx, a, () => {
      // 2×2 dots with a dark shadow so the line reads over sky and leaves alike
      for (const [dx, dy] of dots) rect(ctx, dx, dy + 1, 2, 2, PREVIEW_SHADOW);
      dots.forEach(([dx, dy], i) => rect(ctx, dx - 1, dy, 2, 2, PREVIEW_DOT[i % 2]));
      if (landed) {
        const ex = Math.round(end[0]);
        const ey = Math.round(Math.min(end[1], GROUND_Y));
        const blink = Math.floor(t * 5) % 2;
        const c = blink ? '#fff6d8' : '#e8c547';
        for (const [ox, oy] of [[-2, -2], [-1, -1], [1, 1], [2, 2], [-2, 2], [-1, 1], [1, -1], [2, -2]]) {
          px(ctx, ex + ox + 1, ey + oy, PREVIEW_SHADOW);
          px(ctx, ex + ox, ey + oy, c);
        }
        rect(ctx, ex, ey, 1, 1, '#c8323c');
      }
    });
  }

  return { update, render, renderHeld };
}
