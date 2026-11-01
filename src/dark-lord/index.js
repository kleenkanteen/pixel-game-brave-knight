import { GROUND_Y, KNIGHT_W, VIEW_W, VIEW_H } from '../core/constants.js';
import { drawText, measureText } from '../core/font.js';
import { rect, withAlpha } from '../core/draw.js';
import { drawDarkLord, drawShadowForm, drawAimGlint, drawBeam, MAW } from './art.js';
import { sfx } from '../sfx/index.js';
import { hydraSounds } from '../hydra/sounds.js';

export const DARK_LORD_HITS = 30; // hits to bring the shadow form down
const DOOR_TIME = 0.6; // s the balcony doors take to swing open
const WALK_OUT = 1.4; // s he takes to step out to the balustrade
const RAISE_TIME = 1.2; // transformation: s with the staff raised as the shadows gather
const GROW_TIME = 1.5; // …then s the shadow form takes to grow out of the flash
const FIRST_BEAM = 5; // s into the fight
const BEAM_EVERY = 8; // s from one beam to the next
const AIM_TIME = 2; // s the aiming glint shows before it fires
const FIRE_TIME = 0.65; // s the beam lasts
const BEAM_HALF = 4; // px either side of the beam's centre line that it burns
const BEAM_DAMAGE = 20; // everyone in its path (it pierces through all of them)
const LIGHTNING_HITS = 4; // a Lightning Strike through him counts as this many hits
const FIRST_MINION = 0.6; // s into the fight: the first Shadow swoops in as he takes to the air
const MINION_EVERY = 1.2; // s between Shadows swooping in: all seven swarm in at the start
const MINIONS = 7; // his seven Shadows: each comes once (a fallen one doesn't come back)
const ULT_EVERY = 40; // s of fight from one ultimate blast to the next (the first at 40 s)
const ULT_WARN = 7; // s the warning shows before it lands
const ULT_SAFE_W = 3 * KNIGHT_W; // the one safe slice: three hero widths, top to bottom
const ULT_REACH = 380; // px: the slice opens at most this far from the Brave Knight (7 s on foot)
const ULT_MIN_DIST = 110; // px: …and at least this far, so he has to move
const ULT_BLAST_TIME = 1; // s the blast burns
const ULT_DAMAGE = 50; // every hero outside the slice, wherever they stand (floor or platform)
const DIE_TIME = 3.2; // s from the last hit to 'dead'
const BURST_AT = 2.2; // s into dying: it bursts apart
const HIT_TEXTS = ['Ngh!', 'Insolent!', 'You dare?!'];

const SPARKS = ['#ffffff', '#e8c0ff', '#c070ff', '#7a3ab0'];
const SAFE_LIGHT = ['#ffffff', '#fff6c8', '#ffe27a', '#e8b84a'];
const SMOKE = ['#5a3a82', '#33194a', '#1c0e2a', '#0c0614'];

/**
 * Dark Lord slice: the boss of Stage 5's castle plaza.
 *   - appear(): the balcony doors swing open and he steps out to the balustrade — a dark purple
 *     cloak, a staff crackling with purple magic — then onAppear() (the Stage plays the talk).
 *   - transform(): he raises his staff, the shadows gather round him, a flash, and he grows into a
 *     flying shadow creature (onTransformed: the fight is on).
 *   - Fight (paused while a Dialogue is open): he flies to and fro across the top of the plaza.
 *       Pulse beam — every BEAM_EVERY s he locks on to a hero (mostly the Brave Knight): for
 *       AIM_TIME s a small purple glint shows the direction he's aiming, then a straight beam fires
 *       that way to the ground / wall, burning everyone in its path (BEAM_DAMAGE). Step out of line.
 *       Minions — every MINION_EVERY s one of his seven Shadows (at random, each one once)
 *       swoops in from a random side (top, left or right): battle.spawnMonster. Seven in all.
 *       Ultimate — every ULT_EVERY s he blasts the whole plaza, floor and platforms alike, except
 *       one slice ULT_SAFE_W wide (top to bottom). For ULT_WARN s first the doomed area glows and
 *       the slice is lit gold with a countdown; the allies run into it (battle.setRally). Anyone
 *       outside it when it lands takes ULT_DAMAGE.
 *   - DARK_LORD_HITS hits kill him: an arrow (his or an ally's) is one hit, a Lightning Strike
 *     through him LIGHTNING_HITS; Blessed Touch doubles them, and so does a Potion of Rage for the
 *     Brave Knight's own arrows. Dying, he writhes, implodes and bursts into shadow; his Shadows
 *     dissolve with him; onDefeated(x, y) once it's over.
 * `boss` is what battle.setBoss() takes; `collider` goes to the bow.
 *
 * @param {import('../core/stage.js').World} world
 * @param {{
 *   balcony:{x:number, y:number, doorX:number},  // where he stands (feet), and the door he comes out of
 *   arena:{x0:number, x1:number, top:number},     // the plaza: x range, top of the view (world y)
 *   battle:object, dialogue:{isOpen():boolean},
 *   onAppear:()=>void, onTransformed:()=>void, onDefeated:(x:number, y:number)=>void,
 * }} opts
 */
export function createDarkLord(world, { balcony, arena, battle, dialogue, onAppear, onTransformed, onDefeated }) {
  hydraSounds.preload(); // the roar as his shadow form takes shape
  let state = 'away'; // 'away' | 'door' | 'walk' | 'stand' | 'raise' | 'grow' | 'fight' | 'dying' | 'dead'
  let st = 0;
  let t = 0;
  let ft = 0; // fight clock: only runs while he's free to fly about (not aiming / firing)
  let hp = DARK_LORD_HITS;
  let hurtT = 0;
  let shake = 0;
  let flash = 0;
  let beamCd = FIRST_BEAM;
  let aim = null; // {t, dx, dy} the glint before a beam
  let beam = null; // {t, x0, y0, x1, y1, hit:Set}
  let minionCd = FIRST_MINION;
  let ultCd = ULT_EVERY; // s until the next ultimate lands
  let ult = null; // {t, x0, x1, blast:number|null} the warning, then the blast
  const shades = []; // the Shadows out on the field
  // the order his seven Shadows come in (each is its own look: variant 0–6)
  const pending = Array.from({ length: MINIONS }, (_, i) => i).sort(() => Math.random() - 0.5);
  const texts = []; // {x, y, text, t}
  let lastText = -9;
  // the human form on the balcony
  const standX = balcony.x;
  let hx = balcony.doorX;
  let orb = { orbX: hx, orbY: balcony.y - 30 };
  // the shadow form (chest centre)
  const pos = { x: standX, y: balcony.y - 20 };
  // his sweep: the right two-thirds of the sky (clear of the HUD at the top left)
  const midX = arena.x0 + (arena.x1 - arena.x0) * 0.58;
  const range = (arena.x1 - arena.x0) * 0.32;
  const flyY = arena.top + 94;

  const fighting = () => state === 'fight';
  const alive = () => state === 'fight' || state === 'grow';

  function appear() {
    if (state !== 'away') return;
    state = 'door';
    st = 0;
  }

  function transform() {
    if (state !== 'stand') return;
    state = 'raise';
    st = 0;
    sfx.transform(RAISE_TIME + GROW_TIME);
  }

  /** Where he wants to be at fight time `ft`: sweeping across the top of the plaza. */
  function flyTo(time) {
    return { x: midX + Math.sin(time * 0.33 + Math.PI / 2) * range, y: flyY + Math.sin(time * 0.9) * 12 };
  }

  function update(dt) {
    t += dt;
    st += dt;
    hurtT = Math.max(0, hurtT - dt);
    shake = Math.max(0, shake - dt);
    flash = Math.max(0, flash - dt);
    for (let i = texts.length - 1; i >= 0; i--) if ((texts[i].t += dt) >= 1.2) texts.splice(i, 1);
    for (let i = shades.length - 1; i >= 0; i--) if (shades[i].dead) shades.splice(i, 1);

    switch (state) {
      case 'door':
        if (st >= DOOR_TIME) next('walk');
        return;
      case 'walk': {
        const p = Math.min(1, st / WALK_OUT);
        hx = balcony.doorX + (standX - balcony.doorX) * p;
        if (p >= 1) {
          next('stand');
          onAppear();
        }
        return;
      }
      case 'stand':
        if (Math.random() < 0.25) spark(orb.orbX, orb.orbY, 1);
        return;
      case 'raise':
        gather(dt);
        if (st >= RAISE_TIME) {
          next('grow');
          flash = 0.35;
          battle.burst(standX, balcony.y - 16, 40, { colors: SPARKS, speed: 120, up: 20, g: 0, life: [0.3, 0.8], drag: 1 });
        }
        return;
      case 'grow': {
        const p = Math.min(1, st / GROW_TIME);
        const e = 1 - (1 - p) * (1 - p);
        const to = flyTo(0);
        pos.x = standX + (to.x - standX) * e;
        pos.y = balcony.y - 20 + (to.y - (balcony.y - 20)) * e;
        if (Math.random() < 0.6) smoke(pos.x, pos.y, 2);
        if (p >= 1) {
          next('fight');
          shake = 0.9;
          hydraSounds.roar();
          onTransformed();
        }
        return;
      }
      case 'dying':
        updateDying(dt);
        return;
      case 'fight':
        break;
      default:
        return;
    }
    if (dialogue.isOpen()) return;

    // ---- flying about (holding still while he aims and fires)
    if (!aim && !beam && !ult) ft += dt;
    const want = flyTo(ft);
    const k = Math.min(1, dt * 2);
    pos.x += (want.x - pos.x) * k;
    pos.y += (want.y - pos.y) * k;
    if (Math.random() < 0.3) smoke(pos.x + (Math.random() - 0.5) * 20, pos.y + 14, 1);

    // ---- the pulse beam
    beamCd -= dt;
    // no new beam that would still be going when the ultimate's warning starts
    if (!aim && !beam && !ult && beamCd <= 0 && ultCd > ULT_WARN + AIM_TIME + FIRE_TIME + 0.3) startAim();
    if (aim) {
      aim.t += dt;
      if (Math.random() < 0.7) gatherAt(maw().x, maw().y, 10);
      if (aim.t >= AIM_TIME) fire();
    }
    if (beam) updateBeam(dt);

    // ---- the ultimate
    if (!ult) ultCd -= dt;
    if (!ult && !aim && !beam && ultCd <= ULT_WARN) startUlt();
    if (ult) updateUlt(dt);

    // ---- the Shadows
    minionCd -= dt;
    if (minionCd <= 0) {
      minionCd = MINION_EVERY;
      sendMinion();
    }
  }

  function next(s) {
    state = s;
    st = 0;
  }

  const maw = () => ({ x: pos.x + MAW.dx, y: pos.y + MAW.dy });

  /** Lock on to a hero (mostly the Brave Knight) and show the glint that way. */
  function startAim() {
    const heroes = battle.targetableHeroes();
    if (!heroes.length) {
      beamCd = 1;
      return;
    }
    const knight = heroes.find((h) => h.kind === 'player');
    const h = knight && Math.random() < 0.75 ? knight : heroes[Math.floor(Math.random() * heroes.length)];
    const m = maw();
    const dx = h.x - m.x;
    const dy = h.y - h.h * 0.5 - m.y;
    const len = Math.hypot(dx, dy) || 1;
    aim = { t: 0, dx: dx / len, dy: dy / len };
    beamCd = BEAM_EVERY;
    sfx.beamCharge(AIM_TIME);
  }

  /** The ultimate's warning: pick the safe slice (within reach of the Brave Knight) and light it. */
  function startUlt() {
    const kx = battle.player.x;
    const lo = arena.x0 + ULT_SAFE_W / 2 + 8;
    const hi = arena.x1 - ULT_SAFE_W / 2 - 8;
    let dir = Math.random() < 0.5 ? -1 : 1;
    const d = ULT_MIN_DIST + Math.random() * (ULT_REACH - ULT_MIN_DIST);
    if (kx + dir * d < lo || kx + dir * d > hi) dir = -dir; // no room that way: the other
    const cx = Math.round(Math.max(lo, Math.min(hi, kx + dir * d)));
    ult = { t: 0, x0: cx - ULT_SAFE_W / 2, x1: cx + ULT_SAFE_W / 2, blast: null };
    battle.setRally(cx);
    shake = Math.max(shake, 0.5);
    hydraSounds.roar();
    sfx.beamCharge(ULT_WARN);
    texts.push({ x: pos.x, y: pos.y - 34, text: 'Kneel before the dark!', t: 0 });
    lastText = t;
  }

  function updateUlt(dt) {
    ult.t += dt;
    if (ult.blast === null) {
      // charging: shadow spirals in to him, faster as it nears
      const p = ult.t / ULT_WARN;
      if (Math.random() < 0.4 + p * 0.6) gatherAt(pos.x, pos.y, 30 + p * 30, p > 0.6 ? 2 : 1);
      if (Math.random() < 0.5) spark(ult.x0 + Math.random() * ULT_SAFE_W, GROUND_Y - Math.random() * 6, 1);
      if (ult.t >= ULT_WARN) blastUlt();
      return;
    }
    ult.blast += dt;
    // the blast burns over everything outside the slice
    for (let i = 0; i < 6; i++) {
      const x = arena.x0 - 40 + Math.random() * (arena.x1 - arena.x0 + 120);
      if (x >= ult.x0 - 2 && x <= ult.x1 + 2) continue;
      const y = arena.top + Math.random() * (GROUND_Y - arena.top);
      battle.particle({ x, y, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 40, life: 0.5, colors: SPARKS, size: 2 });
    }
    if (ult.blast >= ULT_BLAST_TIME) {
      ult = null;
      ultCd = ULT_EVERY;
      battle.setRally(null);
    }
  }

  /** It lands: every hero not wholly inside the slice burns, on the floor or up on a platform. */
  function blastUlt() {
    ult.blast = 0;
    shake = Math.max(shake, 1.2);
    sfx.beam(1.2);
    hydraSounds.blast();
    for (const h of battle.targetableHeroes()) {
      const half = h.w / 2 - 2;
      if (h.x - half >= ult.x0 && h.x + half <= ult.x1) continue;
      battle.damageHero(h, ULT_DAMAGE);
      battle.burst(h.x, h.y - h.h * 0.5, 16, { colors: SPARKS, speed: 80, up: 30, g: 80, life: [0.3, 0.6] });
    }
    for (let x = arena.x0; x < arena.x1; x += 24) {
      if (x >= ult.x0 - 8 && x <= ult.x1 + 8) continue;
      battle.burst(x, GROUND_Y, 3, { colors: SPARKS, speed: 70, up: 60, g: 160, life: [0.3, 0.7] });
    }
  }

  /** The beam: straight from his maw along the locked direction to the ground or a wall. */
  function fire() {
    const m = maw();
    const { dx, dy } = aim;
    aim = null;
    const ts = [];
    if (dy > 0) ts.push((GROUND_Y - m.y) / dy);
    if (dx < 0) ts.push((arena.x0 - m.x) / dx);
    if (dx > 0) ts.push((arena.x1 - m.x) / dx);
    const len = Math.max(20, Math.min(...ts.filter((v) => v > 0), 2000));
    beam = { t: 0, x0: m.x, y0: m.y, x1: m.x + dx * len, y1: m.y + dy * len, hit: new Set() };
    shake = Math.max(shake, FIRE_TIME);
    sfx.beam(FIRE_TIME);
    battle.burst(beam.x1, beam.y1, 30, { colors: SPARKS, speed: 110, up: 50, g: 160, life: [0.3, 0.7], size: [1, 2] });
  }

  function updateBeam(dt) {
    beam.t += dt;
    // it pierces: everyone along it burns, once each
    for (const h of battle.targetableHeroes()) {
      if (beam.hit.has(h)) continue;
      if (distToBeam(h.x, h.y - h.h * 0.5) <= BEAM_HALF + h.w / 2 || distToBeam(h.x, h.y - h.h + 3) <= BEAM_HALF + 2 || distToBeam(h.x, h.y - 2) <= BEAM_HALF + 2) {
        beam.hit.add(h);
        battle.damageHero(h, BEAM_DAMAGE);
        battle.burst(h.x, h.y - h.h * 0.5, 12, { colors: SPARKS, speed: 60, up: 20, g: 60, life: [0.2, 0.5] });
      }
    }
    if (Math.random() < 0.9) {
      const u = Math.random();
      battle.particle({ x: beam.x0 + (beam.x1 - beam.x0) * u, y: beam.y0 + (beam.y1 - beam.y0) * u, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, life: 0.35, colors: SPARKS });
    }
    if (Math.random() < 0.5) battle.burst(beam.x1, beam.y1, 3, { colors: SPARKS, speed: 60, up: 40, g: 200, life: [0.2, 0.4] });
    if (beam.t >= FIRE_TIME) beam = null;
  }

  /** Distance from (x, y) to the beam's segment. */
  function distToBeam(x, y) {
    const { x0, y0, x1, y1 } = beam;
    const vx = x1 - x0;
    const vy = y1 - y0;
    const u = Math.max(0, Math.min(1, ((x - x0) * vx + (y - y0) * vy) / (vx * vx + vy * vy)));
    return Math.hypot(x - (x0 + vx * u), y - (y0 + vy * u));
  }

  /** The next of his seven Shadows swoops in from a random side (none left: nothing). */
  function sendMinion() {
    if (!pending.length) return;
    const variant = pending.shift();
    const side = ['top', 'left', 'right'][Math.floor(Math.random() * 3)];
    const bounds = { x0: arena.x0 + 20, x1: arena.x1 - 20, airMin: 50, airMax: GROUND_Y - flyY - 30 };
    shades.push(battle.spawnMonster({ kind: 'shade', side, bounds, variant }));
  }

  // ---- getting hurt

  function hurt(n, x, y) {
    if (!fighting() || n <= 0) return;
    hp = Math.max(0, hp - n);
    hurtT = 0.15;
    battle.number(x, y - 6, `-${n}`, n > 1 ? '#ff9ae8' : '#ffd27a');
    battle.burst(x, y, 6 + n * 2, { colors: SPARKS, speed: 50, up: 10, g: 40, life: [0.2, 0.45] });
    if (hp <= 0) {
      die();
      return;
    }
    if (t - lastText > 4 && Math.random() < 0.35) {
      lastText = t;
      texts.push({ x: pos.x, y: pos.y - 34, text: HIT_TEXTS[Math.floor(Math.random() * HIT_TEXTS.length)], t: 0 });
    }
  }

  const blessed = () => (battle.blessT > 0 ? 2 : 1);

  function hitTest(x, y) {
    if (!fighting()) return false;
    const dx = x - pos.x;
    const dy = y - pos.y;
    if ((dx / 14) ** 2 + (dy / 16) ** 2 <= 1) return true; // body
    if (Math.abs(dx) <= 8 && dy >= -26 && dy < -8) return true; // head + horns
    return Math.abs(dx) <= 38 && dy >= -20 && dy <= 6; // wings
  }

  function die() {
    aim = null;
    beam = null;
    if (ult) battle.setRally(null);
    ult = null;
    next('dying');
    texts.length = 0;
  }

  function updateDying(dt) {
    if (st < BURST_AT) {
      // writhing: violet light cracks out of him, shadow boils off
      if (Math.random() < 0.8) spark(pos.x + (Math.random() - 0.5) * 30, pos.y + (Math.random() - 0.5) * 30, 2);
      if (Math.random() < 0.8) smoke(pos.x, pos.y, 2);
      shake = Math.max(shake, 0.1);
    } else if (st - dt < BURST_AT) {
      flash = 0.5;
      shake = 1;
      sfx.bossDeath();
      battle.burst(pos.x, pos.y, 70, { colors: SMOKE, speed: 140, up: 30, g: -10, life: [0.6, 1.4], size: [1, 2], drag: 1.2 });
      battle.burst(pos.x, pos.y, 50, { colors: SPARKS, speed: 180, up: 20, g: 80, life: [0.4, 1], drag: 0.8 });
      for (const e of shades) battle.slay(e);
      shades.length = 0;
    }
    if (st >= DIE_TIME) {
      next('dead');
      onDefeated(pos.x, pos.y);
    }
  }

  // ---- particles

  function spark(x, y, n) {
    for (let i = 0; i < n; i++) {
      battle.particle({ x: x + (Math.random() - 0.5) * 3, y: y + (Math.random() - 0.5) * 3, vx: (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 20, life: 0.4 + Math.random() * 0.4, colors: SPARKS });
    }
  }

  function smoke(x, y, n) {
    for (let i = 0; i < n; i++) {
      battle.particle({ x: x + (Math.random() - 0.5) * 16, y: y + (Math.random() - 0.5) * 12, vx: (Math.random() - 0.5) * 12, vy: 6 + Math.random() * 10, life: 0.7 + Math.random() * 0.5, colors: SMOKE, size: 2, drag: 1 });
    }
  }

  /** Shadows spiralling in to him as he transforms. */
  function gather() {
    const cx = standX;
    const cy = balcony.y - 16;
    gatherAt(cx, cy, 34, 3);
    if (Math.random() < 0.5) spark(orb.orbX, orb.orbY, 2);
  }

  function gatherAt(cx, cy, r0, n = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = r0 * (0.7 + Math.random() * 0.5);
      battle.particle({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: -Math.cos(a) * r * 2.2 - Math.sin(a) * 30, vy: -Math.sin(a) * r * 2.2 + Math.cos(a) * 30, life: 0.45, colors: n > 1 ? SMOKE : SPARKS, size: n > 1 ? 2 : 1 });
    }
  }

  // ---------------------------------------------------------------- render

  /** WORLD, behind the party: him on the balcony, or his shadow form in the sky. */
  function render(ctx) {
    if (state === 'walk' || state === 'stand' || state === 'raise') {
      const raise = state === 'raise' ? Math.min(1, st / 0.4) : state === 'stand' ? 0.25 + 0.15 * Math.sin(t * 2) : 0;
      const rise = state === 'raise' ? Math.round((st / RAISE_TIME) * 5) : 0;
      // engulfed in shadow as the transformation takes him
      const veil = state === 'raise' ? st / RAISE_TIME : 0;
      orb = drawDarkLord(ctx, hx, balcony.y - rise, -1, { walkT: state === 'walk' ? st : 0, cast: raise, t });
      if (veil > 0) withAlpha(ctx, veil * 0.85, () => drawShadowForm(ctx, hx, balcony.y - 16 - rise, { t, scale: 0.25 + veil * 0.15 }));
      return;
    }
    if (state === 'grow') {
      const p = Math.min(1, st / GROW_TIME);
      drawShadowForm(ctx, pos.x, pos.y, { t, scale: 0.4 + 0.6 * (1 - (1 - p) * (1 - p)) });
      return;
    }
    if (state === 'fight') {
      const charge = ult ? (ult.blast === null ? ult.t / ULT_WARN : 1) : aim ? aim.t / AIM_TIME : beam ? 1 : 0;
      drawShadowForm(ctx, pos.x, pos.y, { t, charge, hurt: hurtT > 0 });
      return;
    }
    if (state === 'dying' && st < BURST_AT) {
      const implode = Math.max(0, (st - 1.6) / (BURST_AT - 1.6));
      const jx = Math.round(Math.sin(t * 57) * 2);
      const jy = Math.round(Math.cos(t * 43) * 1);
      const flick = Math.floor(t * 20) % 2 === 0;
      drawShadowForm(ctx, pos.x + jx, pos.y + jy, { t: t * 2, charge: 1, hurt: flick, scale: 1 + 0.08 * Math.sin(t * 30) - implode * 0.8 });
    }
  }

  /** WORLD: the ultimate — the doomed area glowing, the safe slice lit; then the blast itself. */
  function renderUlt(ctx) {
    const L = arena.x0 - 60; // the whole view, past the plaza's edges
    const R = arena.x1 + 120;
    const top = arena.top;
    const bot = GROUND_Y + 40;
    const { x0, x1 } = ult;
    const doomed = (alpha, color) =>
      withAlpha(ctx, alpha, () => {
        rect(ctx, L, top, x0 - L, bot - top, color);
        rect(ctx, x1, top, R - x1, bot - top, color);
      });
    if (ult.blast === null) {
      const p = ult.t / ULT_WARN;
      const pulse = 0.5 + 0.5 * Math.sin(t * (6 + p * 14));
      doomed(0.1 + 0.22 * p + 0.08 * pulse, '#8a1ad8');
      // drifting dark bands across the doomed area
      withAlpha(ctx, 0.12 + 0.12 * p, () => {
        for (let y = top + ((t * 30) % 24) - 24; y < bot; y += 24) {
          rect(ctx, L, Math.round(y), x0 - L, 6, '#2a0640');
          rect(ctx, x1, Math.round(y), R - x1, 6, '#2a0640');
        }
      });
      // the safe slice: a soft gold column with bright edges
      withAlpha(ctx, 0.14 + 0.08 * pulse, () => rect(ctx, x0, top, x1 - x0, bot - top, '#ffe27a'));
      const dash = Math.floor(t * 40) % 8;
      for (let y = top - 8 + dash; y < bot; y += 8) {
        rect(ctx, x0, y, 2, 5, '#fff2a8');
        rect(ctx, x1 - 2, y, 2, 5, '#fff2a8');
      }
      // a bobbing arrow down at it from above, and "SAFE" on the floor
      const cx = (x0 + x1) / 2;
      const ay = GROUND_Y - 70 + Math.round(Math.sin(t * 5) * 4);
      for (let i = 0; i < 6; i++) rect(ctx, cx - 6 + i, ay + i, 12 - i * 2, 1, '#fff6c8');
      rect(ctx, cx - 2, ay - 10, 4, 10, '#fff6c8');
      const label = 'SAFE';
      drawText(ctx, label, Math.round(cx - measureText(label) / 2), GROUND_Y - 50, { color: '#fff6c8', outline: '#3a2410' });
      return;
    }
    // the blast: a searing violet-white flood, fading out
    const a = Math.min(1, (ULT_BLAST_TIME - ult.blast) / 0.5);
    doomed(0.75 * a, '#c070ff');
    doomed(0.45 * a * (0.6 + 0.4 * Math.random()), '#ffffff');
    withAlpha(ctx, a, () => {
      rect(ctx, x0 - 2, top, 2, bot - top, '#ffffff');
      rect(ctx, x1, top, 2, bot - top, '#ffffff');
    });
  }

  /** WORLD, over the party: the aiming glint, the beam, his taunts. */
  function renderFront(ctx) {
    if (ult) renderUlt(ctx);
    if (aim) {
      const m = maw();
      drawAimGlint(ctx, m.x, m.y, aim.dx, aim.dy, aim.t / AIM_TIME, t);
    }
    if (beam) {
      const a = Math.min(1, (FIRE_TIME - beam.t) / 0.25);
      drawBeam(ctx, beam.x0, beam.y0, beam.x1, beam.y1, a, t);
    }
    for (const tx of texts) {
      withAlpha(ctx, Math.min(1, (1.2 - tx.t) / 0.3), () => drawText(ctx, tx.text, tx.x - measureText(tx.text) / 2, tx.y - tx.t * 8, { color: '#e8c0ff', outline: '#14101c' }));
    }
  }

  /** SCREEN: the boss health bar; the flashes as he transforms and as he bursts. */
  function renderScreen(ctx) {
    if (flash > 0) withAlpha(ctx, Math.min(1, flash / 0.35) * 0.6, () => rect(ctx, 0, 0, VIEW_W, VIEW_H, '#f0d8ff'));
    if (state !== 'fight' && !(state === 'dying' && st < BURST_AT)) return;
    if (ult && ult.blast === null) {
      // the countdown, big, under the health bar
      const n = String(Math.max(1, Math.ceil(ULT_WARN - ult.t)));
      drawText(ctx, n, Math.round(VIEW_W / 2 - measureText(n, 3) / 2), 22, { color: '#ffe27a', outline: '#14101c', scale: 3 });
      const line = 'Get into the light!';
      drawText(ctx, line, Math.round(VIEW_W / 2 - measureText(line) / 2), 46, { color: '#fff6c8', outline: '#14101c' });
    }
    const w = 120;
    const x = Math.round((VIEW_W - w) / 2);
    const y = 12;
    const label = 'Dark Lord';
    drawText(ctx, label, Math.round(VIEW_W / 2 - measureText(label) / 2), 3, { color: '#e0b0ff', outline: '#14101c' });
    rect(ctx, x - 1, y - 1, w + 2, 6, '#14101c');
    rect(ctx, x, y, w, 4, '#2a1438');
    const fill = Math.round((w * hp) / DARK_LORD_HITS);
    rect(ctx, x, y, fill, 4, hurtT > 0 ? '#ffffff' : '#a050f0');
    rect(ctx, x, y, fill, 1, '#e0b0ff');
    for (let i = 5; i < DARK_LORD_HITS; i += 5) rect(ctx, x + Math.round((w * i) / DARK_LORD_HITS), y, 1, 4, '#14101c');
  }

  const collider = {
    sticks: false,
    hit: (x, y) => hitTest(x, y),
    // the Brave Knight's own arrow: one hit, doubled by Blessed Touch and by a Potion of Rage
    onHit: (x, y) => hurt(blessed() * (world.knight.rageT > 0 ? 2 : 1), x, y),
  };

  const boss = {
    get alive() {
      return state !== 'dead';
    },
    // the Archer shoots at his chest once he's flying
    aimPoint: () => (fighting() ? { x: pos.x, y: pos.y } : null),
    hit: (x, y) => hitTest(x, y),
    onArrow: (x, y) => hurt(blessed(), x, y),
    // a Lightning Strike comes down from the top of the sky, straight through him
    onArea(x0, x1) {
      if (!fighting() || x1 < pos.x - 20 || x0 > pos.x + 20) return false;
      battle.burst(pos.x, pos.y, 24, { colors: ['#ffffff', '#c8e8ff', '#7ab8ff', '#e0a0ff'], speed: 90, up: 20, g: 40, life: [0.2, 0.5] });
      hurt(LIGHTNING_HITS * blessed(), pos.x, pos.y);
      return true;
    },
  };

  return {
    appear,
    transform,
    boss,
    collider,
    update,
    render,
    renderFront,
    renderScreen,
    get state() {
      return state;
    },
    get hp() {
      return hp;
    },
    get shake() {
      return shake;
    },
    /** 0..1: how far the balcony doors are open (they stay open once he's out). */
    get doorOpen() {
      if (state === 'away') return 0;
      return state === 'door' ? Math.min(1, st / DOOR_TIME) : 1;
    },
    /** Where he is: on the balcony (feet) before he transforms, else his shadow form's chest. */
    get pos() {
      return state === 'walk' || state === 'stand' || state === 'raise' || state === 'door' ? { x: hx, y: balcony.y } : { ...pos };
    },
    get aiming() {
      return aim ? { t: aim.t, dx: aim.dx, dy: aim.dy } : null;
    },
    get firing() {
      return !!beam;
    },
    /** Shadows out on the field now, and how many are still to come. */
    get minions() {
      return shades.length;
    },
    get minionsLeft() {
      return pending.length;
    },
    /** Debug / tools: aim a beam now. */
    forceBeam() {
      if (fighting() && !aim && !beam) startAim();
    },
    /** Debug / tools: send a Shadow in now. */
    forceMinion() {
      if (fighting()) sendMinion();
    },
    /** The ultimate now: {t, x0, x1, blast} (blast: null while warning, else s since it landed), or null. */
    get ultimate() {
      return ult ? { ...ult } : null;
    },
    /** Debug / tools: start the ultimate's warning now. */
    forceUlt() {
      if (fighting() && !ult) {
        aim = null;
        beam = null;
        ultCd = ULT_WARN;
        startUlt();
      }
    },
    /** Hack (key 9): he dies now, his Shadows (out and still to come) with him; victory follows. */
    forceKill() {
      if (!fighting()) return;
      pending.length = 0;
      for (const e of shades) battle.slay(e);
      shades.length = 0;
      hurt(hp, pos.x, pos.y);
    },
    /** Debug / tools: take `n` hits. */
    forceHurt(n = 1) {
      hurt(n, pos.x, pos.y);
    },
  };
}
