import { GROUND_Y, KNIGHT_W, KNIGHT_H } from '../core/constants.js';
import { drawText } from '../core/font.js';
import { rect, px, line, disc, withAlpha, strokeRect } from '../core/draw.js';
import { drawTiny } from '../battle/hud.js';
import { isNear } from '../core/proximity.js';

export const RAGE_TIME = 10; // s of 5× damage per dose (battle/index.js applies the multiplier)
const DOSES = 2; // one Potion of Rage can be drunk twice
const HEALTH_COST = 0.2; // each drink takes 20% of his max health (never below 1 HP)
const FALL_G = 420;
const SLOT = 18; // HUD box (matches the ability bar's boxes)
const HUD_X = 4;
const HUD_Y = 4 + SLOT + 7; // second row, under the ability bar (and its Blessed Touch timer)
const OUTLINE = '#14101c';
const EMBERS = ['#fff6c0', '#ffd84a', '#ff8a2a', '#e0331c', '#7a1810'];
const AURA = { outer: '#c8200e', mid: '#ff5a1a', inner: '#ffc23a', core: '#fff3b0' };

/**
 * Rage slice: the Potion of Rage the Hydra drops, and drinking it.
 *   - drop(x, fromY): the potion falls to the floor at x and sits there, glinting; with
 *     {float: true} it rises a little and hovers there instead, bobbing in a light red glow.
 *   - Knight near it (proximity rule), on the floor, no Dialogue → Prompt "Press space to pick up
 *     potion"; Interact → DOSES doses, emit 'potion:picked'.
 *   - Press 4 with a dose left and no rage on → knight.rageT = RAGE_TIME (the battle makes his own
 *     hits 5×): he radiates red fire (a flame aura behind him, a red outline round his silhouette
 *     drawn by the player slice, embers rising) until it runs out. Each drink costs HEALTH_COST of
 *     his max health (battle.player; never below 1 HP).
 *   - HUD (second row, top-left, once he has had a potion): the flask with "4", the doses left,
 *     and while raging a red bar running down + "x5".
 *
 * @param {import('../core/stage.js').World} world
 * @param {{prompts:{show(text:string, worldX:number, topY:number):void}, dialogue:{isOpen():boolean},
 *          battle?:{player:object, number(x:number, y:number, text:string, color:string):void},
 *          potions?:number}} opts  potions: doses carried in from earlier
 * @returns {{
 *   drop(x:number, fromY:number):void, readonly potions:number, readonly onFloor:boolean,
 *   update(dt:number):void,
 *   renderBehind(ctx:CanvasRenderingContext2D):void,  // WORLD, before the player: the potion, the flame aura
 *   renderFront(ctx:CanvasRenderingContext2D):void,   // WORLD, after the player: embers, flame licks
 *   renderScreen(ctx:CanvasRenderingContext2D):void,  // SCREEN: the potion slot
 *   lights():{x:number, y:number, r:number}[],        // light it casts (dark Stages)
 * }}
 */
export function createRage(world, { prompts, dialogue, battle = null, potions: startDoses = 0 }) {
  let doses = startDoses;
  let everHad = doses > 0;
  let item = null; // {x, y, vy, landed}
  let t = 0;
  let flash = 0; // drink flash
  const embers = [];
  const motes = []; // red sparkles drifting up round a floating potion

  /** float: rise out of the gore and hover there, bobbing in a red glow (else fall and bounce). */
  function drop(x, fromY, { float = false } = {}) {
    item = float ? { x, y: fromY, vy: 0, landed: true, float: true, born: t } : { x, y: fromY, vy: -60, landed: false };
  }

  /** Hover height of a floating potion's base (rises in over 1.2 s, then bobs). */
  function floatY() {
    const age = t - item.born;
    const rise = Math.min(1, age / 1.2);
    const e = 1 - (1 - rise) * (1 - rise);
    return GROUND_Y - 4 - 14 * e + (rise >= 1 ? Math.sin((age - 1.2) * 2.2) * 2 : 0);
  }

  function update(dt) {
    t += dt;
    flash = Math.max(0, flash - dt);
    const k = world.knight;
    if (k.rageT > 0) k.rageT = Math.max(0, k.rageT - dt);

    if (item?.float) {
      item.y = floatY();
      if (Math.random() < dt * 6) motes.push({ x: item.x + (Math.random() - 0.5) * 14, y: item.y - 4 + (Math.random() - 0.5) * 10, t: 0, life: 0.8 + Math.random() * 0.6 });
    }
    for (let i = motes.length - 1; i >= 0; i--) if ((motes[i].t += dt) >= motes[i].life) motes.splice(i, 1);
    if (item) {
      if (!item.landed) {
        item.vy += FALL_G * dt;
        item.y += item.vy * dt;
        if (item.y >= GROUND_Y) {
          item.y = GROUND_Y;
          if (item.vy > 90) item.vy *= -0.35; // a little bounce
          else item.landed = true;
        }
      } else if (k.controlsEnabled && !dialogue.isOpen() && Math.abs(k.y - GROUND_Y) < 1 && isNear(k, item.x, 7)) {
        prompts.show('Press space to pick up potion', item.x, item.float ? item.y - 16 : GROUND_Y - 14);
        if (world.input.wasPressed('interact')) {
          item = null;
          doses += DOSES;
          everHad = true;
          world.events.emit('potion:picked');
        }
      }
    }

    if (doses > 0 && k.rageT <= 0 && k.controlsEnabled && !dialogue.isOpen() && world.input.wasPressed('potion')) {
      doses--;
      k.rageT = RAGE_TIME;
      flash = 0.5;
      const p = battle?.player;
      if (p) {
        const cost = Math.round(p.maxHp * HEALTH_COST);
        p.hp = Math.max(1, p.hp - cost);
        battle.number(p.x, p.y - p.h - 12, `-${cost}`, '#ff6a5a');
      }
      world.events.emit('potion:drunk', { left: doses });
      for (let i = 0; i < 30; i++) ember(k, 90);
    }

    if (k.rageT > 0 && k.visible) for (let i = 0; i < 3; i++) if (Math.random() < 0.7) ember(k, 30);
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i];
      e.t += dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vx *= Math.exp(-2 * dt);
      if (e.t >= e.life) embers.splice(i, 1);
    }
  }

  function ember(k, speed) {
    const top = k.y - k.lift - KNIGHT_H;
    const a = Math.random() * Math.PI * 2;
    embers.push({
      x: k.x + KNIGHT_W / 2 + (Math.random() - 0.5) * 18,
      y: top + Math.random() * (KNIGHT_H + 2),
      vx: Math.cos(a) * speed * 0.3,
      vy: -20 - Math.random() * speed,
      t: 0,
      life: 0.35 + Math.random() * 0.4,
    });
  }

  /** Jagged flame tongues licking up round his body: three layers, flickering every frame. */
  function drawAura(ctx, k, front) {
    const ox = Math.round(k.x);
    const feet = Math.round(k.y - k.lift);
    const top = feet - KNIGHT_H;
    const swell = flash > 0 ? 1 + flash * 1.2 : 1;
    const layers = front
      ? [[AURA.mid, 0.5, 4, 0.55]]
      : [
          [AURA.outer, 1, 10, 0.55],
          [AURA.mid, 0.8, 7, 0.7],
          [AURA.inner, 0.6, 4, 0.75],
          [AURA.core, 0.4, 1, 0.6],
        ];
    for (const [color, hScale, spread, alpha] of layers) {
      withAlpha(ctx, alpha, () => {
        for (let i = -spread; i < KNIGHT_W + spread; i++) {
          // taller in the middle, tapering at the sides, each column flickering on its own
          const edge = Math.min(i + spread, KNIGHT_W + spread - 1 - i) / (KNIGHT_W / 2 + spread);
          const flick = 0.55 + 0.45 * Math.sin(t * 23 + i * 1.9) * Math.sin(t * 9 + i * 0.7);
          const h = Math.round((KNIGHT_H + 14) * hScale * swell * Math.min(1, edge * 1.6) * (0.75 + 0.35 * flick));
          if (h <= 2) continue;
          if (front && (i + Math.floor(t * 20)) % 3 !== 0) continue;
          rect(ctx, ox + i, feet - h, 1, front ? Math.min(h, 6) : h, color);
        }
      });
    }
    if (!front) {
      // DBZ streaks: thin lines of light shooting up past his head
      for (let i = 0; i < 4; i++) {
        const sx = ox + ((i * 7 + Math.floor(t * 13) * 5) % (KNIGHT_W + 10)) - 5;
        const len = 6 + ((i * 11 + Math.floor(t * 30)) % 9);
        const sy = top - 4 - ((Math.floor(t * 60) + i * 13) % 14);
        withAlpha(ctx, 0.75, () => rect(ctx, sx, sy, 1, len, AURA.inner));
      }
    }
  }

  /** The floating potion's light red radiance: soft pulsing halo, slow turning rays, motes. */
  function drawRadiance(ctx, cx, cy) {
    const pulse = 0.85 + 0.15 * Math.sin(t * 3);
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    for (const [r, a, c] of [[16, 0.07, '#ff4a4a'], [12, 0.09, '#ff6a6a'], [8, 0.12, '#ff8a8a'], [5, 0.16, '#ffb0a8']]) {
      withAlpha(ctx, a * pulse, () => disc(ctx, cx, cy, Math.round(r * pulse), c));
    }
    for (let i = 0; i < 8; i++) {
      const a = t * 0.6 + (i / 8) * Math.PI * 2;
      const r0 = 7;
      const r1 = 12 + (i % 2 ? 2 : 5) * pulse;
      withAlpha(ctx, 0.22, () => line(ctx, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, '#ff9a9a'));
    }
    ctx.globalCompositeOperation = prev;
    for (const m of motes) {
      withAlpha(ctx, 1 - m.t / m.life, () => px(ctx, m.x, m.y - m.t * 14, m.t < m.life / 2 ? '#ffd0c8' : '#ff6a6a'));
    }
  }

  function renderBehind(ctx) {
    if (item && !item.float) {
      const bob = item.landed ? Math.round(Math.sin(t * 3) * 1) : 0;
      drawPotion(ctx, item.x - 3, item.y - 10 + bob, t);
      if (item.landed && Math.floor(t * 2.5) % 3 === 0) {
        px(ctx, item.x + 3, item.y - 12 + bob, '#ffffff');
        px(ctx, item.x + 4, item.y - 13 + bob, '#ffd0c0');
      }
    }
    const k = world.knight;
    if (k.rageT > 0 && k.visible) drawAura(ctx, k, false);
  }

  function renderFront(ctx) {
    if (item?.float) {
      // drawn over the darkness, so it shines
      drawRadiance(ctx, item.x, item.y - 5);
      drawPotion(ctx, item.x - 3, item.y - 10, t);
      if (Math.floor(t * 2.5) % 3 === 0) px(ctx, item.x + 3, item.y - 12, '#ffffff');
    }
    const k = world.knight;
    if (k.rageT > 0 && k.visible) drawAura(ctx, k, true);
    for (const e of embers) {
      const c = EMBERS[Math.min(EMBERS.length - 1, Math.floor((e.t / e.life) * EMBERS.length))];
      px(ctx, e.x, e.y, c);
    }
    if (flash > 0) {
      const cx = Math.round(k.x + KNIGHT_W / 2);
      const cy = Math.round(k.y - k.lift - KNIGHT_H / 2);
      const r = Math.round((1 - flash / 0.5) * 30);
      withAlpha(ctx, flash * 1.6, () => {
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * Math.PI * 2;
          px(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, i % 2 ? AURA.inner : AURA.mid);
        }
      });
    }
  }

  function renderScreen(ctx) {
    if (!everHad) return;
    const k = world.knight;
    const x = HUD_X;
    const y = HUD_Y;
    const raging = k.rageT > 0;
    rect(ctx, x, y, SLOT, SLOT, OUTLINE);
    strokeRect(ctx, x + 1, y + 1, SLOT - 2, SLOT - 2, raging ? '#ff8a5a' : doses > 0 ? '#8a7aa8' : '#3a3050');
    withAlpha(ctx, doses > 0 || raging ? 1 : 0.4, () => drawPotion(ctx, x + 6, y + 3, t));
    drawTiny(ctx, '4', x + SLOT - 4, y + SLOT - 5, '#f4efe2');
    drawText(ctx, `x${doses}`, x + SLOT + 3, y + 6, { color: doses > 0 ? '#f4efe2' : '#8a8098', outline: OUTLINE });
    if (raging) {
      const w = 40;
      rect(ctx, x + SLOT + 20, y + 7, w, 3, OUTLINE);
      rect(ctx, x + SLOT + 21, y + 8, Math.ceil((w - 2) * (k.rageT / RAGE_TIME)), 1, '#ff5a2a');
      drawText(ctx, 'x5', x + SLOT + 24 + w - 2, y + 5, { color: '#ff7a4a', outline: OUTLINE });
    }
  }

  function lights() {
    const out = [];
    const k = world.knight;
    if (k.rageT > 0 && k.visible) out.push({ x: k.x + KNIGHT_W / 2, y: k.y - k.lift - 12, r: 34, warm: true });
    if (item) out.push(item.float ? { x: item.x, y: item.y - 5, r: 30, tint: '#ff5a5a' } : { x: item.x, y: item.y - 5, r: 12, warm: true });
    return out;
  }

  return {
    drop,
    get potions() {
      return doses;
    },
    get onFloor() {
      return item !== null;
    },
    update,
    renderBehind,
    renderFront,
    renderScreen,
    lights,
  };
}

/** The Potion of Rage: a 7×10 round flask of swirling red, corked, top-left at (x, y). */
export function drawPotion(ctx, x, y, t = 0) {
  x = Math.round(x);
  y = Math.round(y);
  rect(ctx, x + 2, y, 3, 2, '#8a5a34'); // cork
  rect(ctx, x + 2, y + 2, 3, 2, '#c8d0e0'); // neck
  rect(ctx, x + 1, y + 4, 5, 6, '#c8d0e0'); // bulb (glass)
  rect(ctx, x, y + 5, 7, 4, '#c8d0e0');
  rect(ctx, x + 1, y + 5, 5, 4, '#c8200e'); // red brew
  rect(ctx, x + 2, y + 9, 3, 1, '#a8180c');
  const sw = Math.floor(t * 4) % 3;
  px(ctx, x + 2 + sw, y + 6, '#ff6a3a'); // swirl
  px(ctx, x + 4 - sw, y + 7, '#ff9a5a');
  px(ctx, x + 1, y + 5, '#ffffff'); // glint
  rect(ctx, x + 1, y + 10, 5, 1, OUTLINE);
}
