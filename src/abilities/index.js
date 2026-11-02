import { GROUND_Y, KNIGHT_W, VIEW_W, VIEW_H } from '../core/constants.js';
import { drawText, measureText } from '../core/font.js';
import { rect, line, withAlpha, strokeRect } from '../core/draw.js';
import { drawTiny, tinyWidth } from '../battle/hud.js';
import { getIcons, ICON } from './icons.js';
import { createLightning } from './lightning.js';
import { ellipse } from '../battle/paint.js';
import { sfx } from '../sfx/index.js';

/** The three abilities, in key order. Cooldowns in seconds. */
export const ABILITIES = [
  { key: 'ability1', name: 'Lightning Strike', cooldown: 10 },
  { key: 'ability2', name: 'Arrow Storm', cooldown: 10 },
  { key: 'ability3', name: 'Blessed Touch', cooldown: 10 },
];

const LIGHTNING_DAMAGE = 30; // a zombie (30 HP) in one strike
const LIGHTNING_HALF = 12; // px either side of the impact that it hurts
const STORM_W = 5 * KNIGHT_W; // Arrow Storm area width
const STORM_ARROWS = 10;
const STORM_EVERY = 0.07; // s between the Archer's arrows
const STORM_DAMAGE = 5;
const HEAL_FRAC = 0.2; // Blessed Touch: +20% of max HP
const BLESS_TIME = 5; // …and double damage for this long

const SLOT = ICON + 4; // box size
const SLOT_GAP = 3;
const HUD_X = 4;
const HUD_Y = 4;
const OUTLINE = '#14101c';
const GOLD = '#e8c547';
const RETICLE = '#ff5a4a';
const HOLY = ['#ffffff', '#fff6c0', '#ffd84a', '#d9a62c'];
const GLOW_EMERGE = 0.7; // s the Blessed Touch glow bursts out of everyone…
const GLOW_FADE = 0.6; // …and s it fades away at the end of the boon

/**
 * Abilities slice: the party's three special moves, unlocked one by one after the Stage 3 battle.
 *   1 Lightning Strike — press 1 to aim: a target reticle replaces the cursor (with a marker on the
 *     ground below it); click and the Mage calls three rays of lightning that spiral in and fuse
 *     into one bolt on that spot, erupting on impact (lightning.js): LIGHTNING_DAMAGE around it.
 *   2 Arrow Storm — press 2 to aim (a 5-Knight-Width highlight follows the mouse on the ground),
 *     click to have the Archer loose 10 arrows into it in quick succession.
 *   3 Blessed Touch — the Holy Knight heals every hero by 20% and doubles all damage for 5 s;
 *     a radiant glow bursts out of everyone, then keeps glowing softer until the boon ends.
 *   While aiming, the same key again or Esc cancels; the other aimed key switches to it.
 *   Clicking (tapping) an ability's box in the bar does the same as its key.
 * Each recharges over its cooldown (10 s). HUD top-left: three boxes with the icons and 1/2/3;
 * a used icon dims to 50% and refills to full from the bottom up as it recharges.
 * Must be updated BEFORE the Dialogue so an aiming click is consumed (never a "Next" / Strike).
 *
 * @param {import('../core/stage.js').World} world
 * @param {{battle:object, unlocked?:number}} deps  battle: battle/index.js; unlocked: how many carry over
 * @returns {{
 *   unlock(n:number):void, readonly unlocked:number, readonly aiming:null|'lightning'|'storm',
 *   update(dt:number):void,
 *   renderBehind(ctx:CanvasRenderingContext2D):void,  // WORLD, behind the fighters: Blessed Touch halos
 *   renderWorld(ctx:CanvasRenderingContext2D):void,   // WORLD: blessed glow, aim highlight / reticle, lightning
 *   renderScreen(ctx:CanvasRenderingContext2D):void,  // SCREEN: flash + the ability bar
 *   exit():void,                                      // restores the mouse cursor
 * }}
 */
export function createAbilities(world, { battle, unlocked: startUnlocked = 0 }) {
  const { input } = world;
  let unlocked = startUnlocked;
  const cd = ABILITIES.map(() => 0); // s left until each is ready
  const readyFlash = ABILITIES.map(() => 0);
  /** @type {null|'lightning'|'storm'} */
  let aiming = null;
  let aimX = 0;
  let aimY = 0;
  const volley = []; // {at, x} arrows still to loose
  // the bolts come down from the top of the view (higher up when the camera looks up / zooms out)
  const lightning = createLightning({ battle, damage: LIGHTNING_DAMAGE, radius: LIGHTNING_HALF, skyY: () => world.camera.y - 6 });
  sfx.preload(); // the thunder recording, ready before the first strike
  let t = 0;
  let blessedAt = -99; // t when Blessed Touch was last cast

  const canUse = () => !battle.fallen && world.knight.visible;
  const ready = (i) => i < unlocked && cd[i] <= 0 && canUse();
  const canvas = typeof document !== 'undefined' ? document.getElementById('game') : null;
  const setCursor = (hidden) => {
    if (canvas) canvas.style.cursor = hidden ? 'none' : '';
  };

  /** Press an aimed ability's key: start aiming, switch to it, or cancel it. */
  function toggleAim(kind, i) {
    if (aiming === kind) aiming = null;
    else if (ready(i)) aiming = kind;
  }

  function castLightning(x) {
    battle.perform('mage', x);
    lightning.cast(x);
    sfx.lightning(lightning.gatherTime);
    cd[0] = ABILITIES[0].cooldown;
  }

  function arrowStorm(cx) {
    const x0 = cx - STORM_W / 2;
    const xs = Array.from({ length: STORM_ARROWS }, (_, i) => x0 + ((i + 0.5) * STORM_W) / STORM_ARROWS + (Math.random() - 0.5) * 5);
    xs.sort(() => Math.random() - 0.5);
    xs.forEach((x, i) => volley.push({ at: t + i * STORM_EVERY, x }));
    sfx.volley(5, (STORM_ARROWS * STORM_EVERY) / 5);
    cd[1] = ABILITIES[1].cooldown;
  }

  function blessedTouch() {
    battle.perform('holy');
    for (const h of battle.heal(HEAL_FRAC)) {
      battle.burst(h.x, (h.y ?? GROUND_Y) - h.h / 2, 14, { colors: HOLY, speed: 40, up: 30, g: -30, life: [0.5, 0.9], drag: 2 });
    }
    battle.bless(BLESS_TIME);
    blessedAt = t;
    sfx.blessed();
    cd[2] = ABILITIES[2].cooldown;
  }

  /** The mouse in world coords, x clamped so an area of `half` px either side stays in the world. */
  function aimAt(half) {
    const cam = world.camera;
    const mx = Math.max(0, Math.min(VIEW_W - 1, input.mouse.x));
    const my = Math.max(0, Math.min(VIEW_H - 1, input.mouse.y));
    aimX = Math.max(half, Math.min(world.worldWidth - half, cam.toWorldX(mx)));
    aimY = Math.max(cam.y, Math.min(GROUND_Y, cam.toWorldY(my)));
  }

  /** The unlocked ability box under the mouse when `clicked` (HUD px), else -1. */
  function slotAt(clicked) {
    if (!clicked) return -1;
    const { x, y } = input.mouse;
    if (y < HUD_Y || y >= HUD_Y + SLOT) return -1;
    const i = Math.floor((x - HUD_X) / (SLOT + SLOT_GAP));
    const inBox = i >= 0 && x - HUD_X - i * (SLOT + SLOT_GAP) < SLOT;
    return inBox && i < unlocked ? i : -1;
  }

  function update(dt) {
    t += dt;
    for (let i = 0; i < cd.length; i++) {
      if (cd[i] > 0 && (cd[i] -= dt) <= 0) {
        cd[i] = 0;
        readyFlash[i] = 0.4;
      }
      readyFlash[i] = Math.max(0, readyFlash[i] - dt);
    }

    // keys, or a click (tap) on the ability's box in the bar
    const clickedSlot = slotAt(input.wasClicked());
    if (clickedSlot >= 0) input.consumeClick(); // never also a Strike / a shot / a cast
    if (input.wasPressed('ability1') || clickedSlot === 0) toggleAim('lightning', 0);
    if (input.wasPressed('ability2') || clickedSlot === 1) toggleAim('storm', 1);
    if ((input.wasPressed('ability3') || clickedSlot === 2) && ready(2)) blessedTouch();
    if (aiming && (input.wasPressed('cancel') || !canUse())) aiming = null;

    // aiming: the click is ours
    if (aiming) {
      aimAt(aiming === 'storm' ? STORM_W / 2 : 4);
      if (input.wasClicked()) {
        input.consumeClick();
        if (aiming === 'lightning') castLightning(aimX);
        else arrowStorm(aimX);
        aiming = null;
      }
    }
    setCursor(aiming === 'lightning');

    for (let i = volley.length - 1; i >= 0; i--) {
      if (t < volley[i].at) continue;
      battle.shootAt(volley[i].x, { T: 1.1 + Math.random() * 0.25, damage: STORM_DAMAGE });
      volley.splice(i, 1);
    }
    lightning.update(dt);

    // Blessed: gold motes drift up off every hero while the boon lasts
    if (battle.blessT > 0) {
      for (const h of battle.heroes) {
        if (Math.random() > 0.12) continue;
        battle.particle({ x: h.x + (Math.random() - 0.5) * 12, y: (h.y ?? GROUND_Y) - Math.random() * h.h, vx: 0, vy: -12 - Math.random() * 10, life: 0.6, colors: HOLY });
      }
    }
  }

  /** Centre of each hero's body (world px), where the Blessed Touch glow sits. */
  function heroCentres() {
    const k = world.knight;
    const out = [];
    if (k.visible) out.push({ x: Math.round(k.x) + k.width / 2, y: Math.round(k.y - k.lift) - 12 });
    for (const h of battle.heroes) if (h.kind !== 'player') out.push({ x: Math.round(h.x), y: Math.round(h.y ?? GROUND_Y) - 12 });
    return out;
  }

  /**
   * Blessed Touch glow: { r, alpha, burst } — a bright radiance bursting out of each hero, then a
   * softer pulsing glow for as long as the boon lasts, fading at the end. null when not blessed.
   */
  function glowState() {
    if (battle.blessT <= 0) return null;
    const since = t - blessedAt;
    const fadeOut = Math.min(1, battle.blessT / GLOW_FADE);
    if (since < GLOW_EMERGE) {
      const e = since / GLOW_EMERGE;
      const grow = 1 - (1 - e) * (1 - e);
      // swells out big and bright, then eases back down to the steady glow
      return { r: 6 + 22 * grow - 7 * e * e, alpha: (1 - 0.25 * e) * fadeOut, burst: 1 - e };
    }
    const pulse = Math.sin((since - GLOW_EMERGE) * 5);
    return { r: 15 + pulse * 1.5, alpha: (0.75 + 0.12 * pulse) * fadeOut, burst: 0 };
  }

  /** WORLD, drawn BEHIND the fighters: the Blessed Touch halo around everyone. */
  function renderBehind(ctx) {
    const g = glowState();
    if (!g) return;
    for (const c of heroCentres()) {
      // soft layered halo, taller than wide like the body inside it
      withAlpha(ctx, g.alpha * 0.18, () => ellipse(ctx, c.x, c.y, Math.round(g.r), Math.round(g.r * 1.25), '#ffd84a'));
      withAlpha(ctx, g.alpha * 0.25, () => ellipse(ctx, c.x, c.y, Math.round(g.r * 0.72), Math.round(g.r * 0.95), '#ffe98a'));
      withAlpha(ctx, g.alpha * 0.35, () => ellipse(ctx, c.x, c.y, Math.round(g.r * 0.45), Math.round(g.r * 0.7), '#fff6c0'));
      if (g.burst > 0) {
        // the emergence: a pillar of light up through them + spokes radiating out
        const pw = Math.max(1, Math.round(10 * g.burst));
        const top = Math.min(0, world.camera.y);
        withAlpha(ctx, g.burst * 0.6, () => rect(ctx, c.x - Math.floor(pw / 2), top, pw, GROUND_Y - top, '#fff6c0'));
        const len = 10 + (1 - g.burst) * 22;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + t * 0.8;
          withAlpha(ctx, g.burst, () => line(ctx, c.x + Math.cos(a) * len * 0.5, c.y + Math.sin(a) * len * 0.6, c.x + Math.cos(a) * len, c.y + Math.sin(a) * len * 1.2, '#fff0a0'));
        }
      }
    }
  }

  /** WORLD, over the fighters: the glow lightens them (additive), strongest as it emerges. */
  function renderGlowFront(ctx) {
    const g = glowState();
    if (!g) return;
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    for (const c of heroCentres()) {
      withAlpha(ctx, g.alpha * (0.2 + 0.3 * g.burst), () => ellipse(ctx, c.x, c.y, Math.round(g.r * 0.6), Math.round(g.r * 0.9), '#ffcf5a'));
    }
    ctx.globalCompositeOperation = prev;
  }

  function renderWorld(ctx) {
    renderGlowFront(ctx);
    if (aiming === 'storm') renderStormAim(ctx);
    lightning.render(ctx);
    if (aiming === 'lightning') renderReticle(ctx);
  }

  /** Crosshair on the cursor + a marker on the ground where the bolt will land. */
  function renderReticle(ctx) {
    const x = Math.round(aimX);
    const y = Math.round(aimY);
    const pulse = Math.floor(t * 6) % 2;
    // dotted drop line + ground marker
    for (let yy = y + 9; yy < GROUND_Y - 2; yy += 4) rect(ctx, x, yy, 1, 2, 'rgba(255,90,74,0.55)');
    const gw = 7 + pulse;
    withAlpha(ctx, 0.35, () => rect(ctx, x - gw, GROUND_Y, gw * 2 + 1, 2, RETICLE));
    rect(ctx, x - gw, GROUND_Y, 2, 1, RETICLE);
    rect(ctx, x + gw - 1, GROUND_Y, 2, 1, RETICLE);
    // the reticle: a ring with four ticks and a centre dot, outlined so it reads on any background
    const r = 6 + pulse;
    for (const [c, o] of [[OUTLINE, 1], [RETICLE, 0]]) {
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const gap = i % 6 === 0; // ring breaks where the ticks go
        if (gap) continue;
        const px0 = x + Math.round(Math.cos(a) * r);
        const py0 = y + Math.round(Math.sin(a) * r);
        rect(ctx, px0 - o, py0 - o, 1 + o * 2, 1 + o * 2, c);
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ax = x + dx * (r - 2);
        const ay = y + dy * (r - 2);
        const len = 5;
        const w = dx ? len : 1;
        const h = dy ? len : 1;
        rect(ctx, (dx < 0 ? ax - len + 1 : ax) - o, (dy < 0 ? ay - len + 1 : ay) - o, w + o * 2, h + o * 2, c);
      }
      rect(ctx, x - o, y - o, 1 + o * 2, 1 + o * 2, c === OUTLINE ? OUTLINE : '#ffffff');
    }
  }

  function renderStormAim(ctx) {
    const x = Math.round(aimX - STORM_W / 2);
    const top = GROUND_Y - 34;
    const pulse = 0.18 + 0.08 * Math.sin(t * 8);
    withAlpha(ctx, pulse, () => rect(ctx, x, top, STORM_W, GROUND_Y + 3 - top, '#ffd84a'));
    // solid edges + a bright strip on the ground where they land
    rect(ctx, x, top, 1, GROUND_Y + 3 - top, GOLD);
    rect(ctx, x + STORM_W - 1, top, 1, GROUND_Y + 3 - top, GOLD);
    rect(ctx, x, GROUND_Y + 1, STORM_W, 2, '#fff0a0');
    // falling chevrons
    const drop = Math.floor(t * 20) % 8;
    for (let i = 0; i < 4; i++) {
      const cx = x + 10 + i * 20;
      const cy = top + 6 + drop;
      for (let k = 0; k < 3; k++) {
        rect(ctx, cx - 2 + k, cy + k, 1, 1, '#fff0a0');
        rect(ctx, cx + 2 - k, cy + k, 1, 1, '#fff0a0');
      }
    }
    const label = 'Click to fire';
    const lx = Math.max(world.camera.x + 2, Math.min(world.camera.x + world.camera.viewW - 2 - measureText(label), Math.round(aimX - measureText(label) / 2)));
    drawText(ctx, label, lx, top - 11, { color: '#fff6d8', outline: OUTLINE });
  }

  function renderScreen(ctx) {
    lightning.renderScreen(ctx);
    sfx.renderCredit(ctx); // the thunder recording's CC BY credit while it plays
    if (unlocked <= 0) return;
    const icons = getIcons();
    ABILITIES.forEach((ab, i) => {
      const x = HUD_X + i * (SLOT + SLOT_GAP);
      const y = HUD_Y;
      const open = i < unlocked;
      const selected = (i === 0 && aiming === 'lightning') || (i === 1 && aiming === 'storm') || (i === 2 && battle.blessT > 0);
      rect(ctx, x, y, SLOT, SLOT, OUTLINE);
      strokeRect(ctx, x + 1, y + 1, SLOT - 2, SLOT - 2, selected ? '#fff0a0' : open ? '#8a7aa8' : '#3a3050');
      if (!open) {
        withAlpha(ctx, 0.7, () => rect(ctx, x + 2, y + 2, ICON, ICON, '#1e1a2a'));
        return;
      }
      const ix = x + 2;
      const iy = y + 2;
      if (cd[i] > 0) {
        // used: the whole icon at 50%, and the recharged part (from the bottom up) back at full
        withAlpha(ctx, 0.5, () => ctx.drawImage(icons[i], ix, iy));
        const filled = Math.floor(ICON * (1 - cd[i] / ab.cooldown));
        if (filled > 0) ctx.drawImage(icons[i], 0, ICON - filled, ICON, filled, ix, iy + ICON - filled, ICON, filled);
      } else {
        ctx.drawImage(icons[i], ix, iy);
      }
      if (readyFlash[i] > 0) withAlpha(ctx, readyFlash[i] / 0.4, () => strokeRect(ctx, x + 1, y + 1, SLOT - 2, SLOT - 2, '#ffffff'));
      drawTiny(ctx, String(i + 1), x + SLOT - tinyWidth('1') - 1, y + SLOT - 5, cd[i] > 0 ? '#a8a0b8' : '#f4efe2');
    });
    // double damage left: a gold bar under the boxes + "x2"
    if (battle.blessT > 0) {
      const w = 3 * SLOT + 2 * SLOT_GAP;
      const y = HUD_Y + SLOT + 2;
      rect(ctx, HUD_X, y, w, 3, OUTLINE);
      rect(ctx, HUD_X + 1, y + 1, Math.ceil((w - 2) * (battle.blessT / BLESS_TIME)), 1, '#ffd84a');
      drawText(ctx, 'x2', HUD_X + w + 3, HUD_Y + SLOT - 4, { color: '#ffd84a', outline: OUTLINE });
    }
  }

  return {
    unlock(n) {
      unlocked = Math.max(unlocked, Math.min(ABILITIES.length, n));
    },
    get unlocked() {
      return unlocked;
    },
    get aiming() {
      return aiming;
    },
    update,
    renderBehind,
    renderWorld,
    renderScreen,
    exit() {
      aiming = null;
      setCursor(false);
    },
  };
}
