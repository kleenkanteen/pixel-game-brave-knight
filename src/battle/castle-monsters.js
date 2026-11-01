// The monsters of the Dark Lord's castle (Stage 5):
//   Skeleton Archer — stands on top of the gatehouse (spec.air px up) and, once a hero comes within
//                     SKEL_RANGE, draws and looses an arrow at one every few seconds: a lobbed shot
//                     at where they stood (step aside). One hit of anything fells it: it topples
//                     off the battlements and lands as a heap of bones.
//   Reptilian       — a big, hunched, spiked purple beast drooling green goo: prowls up, crouches
//                     with its jaws gaping, then lunges and snaps them shut — a bite
//                     (REPTILE_DAMAGE) — and backs off to come again. Its goo drips into puddles.
//   Shadow          — the Dark Lord's flying minion (spawned mid-fight: battle.spawnMonster). It
//                     swoops in from a side (spec.side: 'left' | 'right' | 'top') and flies
//                     around inside spec.bounds, and every PULSE_EVERY s (random) it spits a
//                     purple pulse at a hero (PULSE_DAMAGE, like any fireball).
// Internal to the battle slice.
import { GROUND_Y } from '../core/constants.js';
import { burst } from './particles.js';
import { drawSkeletonArcher, drawBonePile, drawBoneArrow, drawReptile, REPTILE_CHIN, drawGooPuddle, drawShade, drawPulse, drawPulseScorch } from './art-castle.js';
import { sfx } from '../sfx/index.js';

const AGGRO = 150; // px: a hero this close wakes a Reptilian

const SKEL_RANGE = 260; // px: a hero this close (across) wakes a Skeleton Archer and gets shot at
const SKEL_DRAW = 0.75; // s drawing the bow
const SKEL_EVERY = [2.6, 4]; // s between shots (random)
const SKEL_ARROW_G = 300;
const SKEL_ARROW_DAMAGE = 4;
const SKEL_ARROW_STUCK = 1.2; // s a spent arrow stays in the ground

const REPTILE_DAMAGE = 6;
const COIL_TIME = 0.55;
const LUNGE_TIME = 0.28;
const BITE_AT = 0.75; // of the lunge: when the jaws snap shut
const REPTILE_REST = 0.9;
const GOO = ['#b8ff8a', '#5ae04a', '#2a8a3a'];
const GOO_DRIP = 1.6; // drops per s from each awake Reptilian

const PULSE_EVERY = [5, 10]; // s between a Shadow's shots (random)
const PULSE_CHARGE = 0.5; // s its jaws glow first
const PULSE_SPEED = 96;
const PULSE_DAMAGE = 8; // like the Dark Mage's fireballs
const PULSE_R = 6; // px around the pulse that it hurts
const SWOOP_TIME = 1.7; // s for a Shadow to swoop in
const SHADE_SPEED = 52;

const DIE_TIME = 0.6;
const BONES = ['#e4dcc6', '#a89e86', '#6e6656'];
const SCALES = ['#8a6ab2', '#4a2f68', '#311e48', '#5ae04a'];
const SMOKE = ['#6a3a9a', '#33194a', '#1c0e2a', '#0c0614'];
const PULSE = ['#ffffff', '#e8c0ff', '#c070ff', '#7a3ab0', '#2a1438'];

/** @param {object} combat  shared battle state + helpers (see battle/index.js) */
export function createCastleMonsters(combat) {
  const kinds = new Set(['skeleton', 'reptile', 'shade']);
  const arrows = []; // {x, y, vx, vy, stuck?:number}
  const pulses = []; // {x, y, vx, vy, t}
  const scorches = []; // {x, y, t}
  const puddles = []; // {x, size, t} — t < 0 while its drop is still falling
  let t = 0;

  const clampE = (e, x) => Math.max(e.minX ?? 8, Math.min(e.maxX ?? combat.worldWidth - 8, x));
  const rand = ([a, b]) => a + Math.random() * (b - a);

  function make(base, spec, i) {
    let e;
    if (spec.kind === 'skeleton') {
      e = { ...base, kind: 'skeleton', name: 'Skeleton Archer', x: spec.x, w: 10, h: 22, hp: 1, maxHp: 1, air: spec.air, perch: spec.air, state: 'idle', st: 0, cd: 1 + i * 0.6, knockMul: 0, fallV: 0, target: null };
    } else if (spec.kind === 'reptile') {
      e = { ...base, kind: 'reptile', name: 'Reptilian', x: spec.x, w: 34, h: 22, hp: 60, maxHp: 60, speed: 28 + (i % 3) * 4, state: 'chase', st: 0, leap: null, bit: false, gap: (i % 3) * 4, knockMul: 0.5 };
    } else if (spec.kind === 'shade') {
      e = makeShade(base, spec, i);
    } else throw new Error(`Unknown castle monster ${spec.kind}`);
    if (spec.x0 !== undefined) e.minX = spec.x0;
    if (spec.x1 !== undefined) e.maxX = spec.x1;
    return e;
  }

  /**
   * A Shadow swooping in from `side` towards a first spot inside `bounds` {x0, x1, airMin, airMax}.
   * spec.variant 0–6 picks its look.
   */
  function makeShade(base, { side = 'left', bounds, variant = 0 }, i) {
    const b = bounds;
    const startAir = side === 'top' ? b.airMax + 70 : rand([b.airMin + (b.airMax - b.airMin) * 0.4, b.airMax]);
    const startX = side === 'left' ? b.x0 - 40 : side === 'right' ? b.x1 + 40 : rand([b.x0 + 60, b.x1 - 60]);
    const to = { x: rand([b.x0 + 80, b.x1 - 80]), air: rand([b.airMin + 40, b.airMax - 40]) };
    // the swoop dips low through the middle of its path, then climbs to its first spot
    const via = { x: (startX + to.x) / 2, air: Math.max(b.airMin, Math.min(startAir, to.air) - 90) };
    return {
      ...base,
      kind: 'shade',
      name: 'Shadow',
      x: startX,
      w: 14,
      h: 12,
      hp: 20,
      maxHp: 20, // a Pterodactyl's worth
      air: startAir,
      state: 'swoop',
      st: 0,
      swoop: { from: { x: startX, air: startAir }, via, to },
      way: to,
      bounds: b,
      variant,
      flapT: i * 0.37,
      shotCd: rand(PULSE_EVERY) * 0.6,
      charge: 0,
      target: null,
      knockMul: 0.5,
      fallV: 0,
      facing: side === 'right' ? -1 : 1,
    };
  }

  function update(e, dt) {
    if (e.kind === 'skeleton') updateSkeleton(e, dt);
    else if (e.kind === 'reptile') updateReptile(e, dt);
    else updateShade(e, dt);
  }

  // ---------------------------------------------------------------- Skeleton Archer

  function heroesNear(x, range) {
    return combat.targetableHeroes().filter((h) => Math.abs(h.x - x) <= range);
  }

  function updateSkeleton(e, dt) {
    const near = heroesNear(e.x, SKEL_RANGE);
    if (!e.awake) {
      if (!near.length) return;
      e.awake = true;
    }
    const closest = combat.closestHero(e.x);
    if (closest) e.facing = Math.sign(closest.x - e.x) || e.facing;
    if (e.state === 'draw') {
      if (e.target) e.facing = Math.sign(e.target.x - e.x) || e.facing;
      if ((e.st -= dt) <= 0) {
        e.state = 'idle';
        loose(e);
      }
      return;
    }
    e.cd -= dt;
    if (e.cd <= 0 && near.length) {
      const knight = near.find((h) => h.kind === 'player');
      e.target = knight && Math.random() < 0.6 ? knight : near[Math.floor(Math.random() * near.length)];
      e.state = 'draw';
      e.st = SKEL_DRAW;
      e.cd = rand(SKEL_EVERY);
    }
  }

  /** A lobbed arrow at where the target stands now (a little off: it's an old skeleton). */
  function loose(e) {
    const h = e.target;
    if (!h || !combat.targetableHeroes().includes(h)) return;
    const ox = e.x + e.facing * 8;
    const oy = GROUND_Y - e.air - 15;
    const tx = h.x + (Math.random() - 0.5) * 10;
    const ty = h.y - h.h * 0.5;
    const dx = tx - ox;
    const T = Math.max(0.55, Math.min(1.3, Math.abs(dx) / 150));
    arrows.push({ x: ox, y: oy, vx: dx / T, vy: (ty - oy - 0.5 * SKEL_ARROW_G * T * T) / T });
    sfx.bowString();
  }

  // ---------------------------------------------------------------- Reptilian

  function engage(e) {
    const h = combat.closestHero(e.x, true);
    if (!h) return null;
    const dir = Math.sign(h.x - e.x) || e.facing;
    return { h, dir, dist: Math.abs(h.x - e.x), reach: h.w / 2 + e.w / 2 + e.gap };
  }

  /** World point under a Reptilian's chin. */
  const chin = (e) => ({ x: e.x + e.facing * REPTILE_CHIN.dx, y: GROUND_Y + REPTILE_CHIN.dy });

  function drip(e, dt) {
    if (Math.random() > GOO_DRIP * dt) return;
    const c = chin(e);
    const x = c.x + (Math.random() - 0.5) * 6;
    combat.particles.add({ x, y: c.y + 4, vx: e.facing * 4, vy: 10, g: 300, life: 0.28, colors: GOO, size: 1 });
    puddles.push({ x, size: 1 + Math.floor(Math.random() * 2), t: -0.28 });
    if (puddles.length > 40) puddles.shift();
  }

  function snap(e) {
    const c = chin(e);
    sfx.bite();
    for (let k = 0; k < 8; k++) {
      combat.particles.add({ x: c.x + e.facing * 2, y: c.y - 3, vx: e.facing * (20 + Math.random() * 40), vy: -20 - Math.random() * 40, g: 260, life: 0.4 + Math.random() * 0.2, colors: GOO, size: 1 });
    }
  }

  function updateReptile(e, dt) {
    if (e.awake) drip(e, dt);
    if (!e.awake) {
      const h = combat.closestHero(e.x);
      if (!h || Math.abs(h.x - e.x) > AGGRO) return;
      e.awake = true;
    }
    const g = engage(e);
    switch (e.state) {
      case 'chase':
        if (!g) return;
        e.facing = g.dir;
        if (Math.abs(e.kvx) > 15) return;
        if (g.dist > g.reach + 22) {
          e.x = clampE(e, e.x + g.dir * Math.min(e.speed * dt, g.dist - g.reach - 22));
          e.walkT += dt;
        } else {
          e.state = 'coil';
          e.st = COIL_TIME;
          sfx.growl();
        }
        break;
      case 'coil':
        if (g) e.facing = g.dir;
        if ((e.st -= dt) > 0) return;
        if (!g) {
          e.state = 'chase';
          return;
        }
        e.state = 'lunge';
        e.st = LUNGE_TIME;
        e.leap = { from: e.x, to: clampE(e, g.h.x - g.dir * (g.reach - 4)), t: 0 };
        e.bit = false;
        break;
      case 'lunge': {
        const L = e.leap;
        L.t += dt;
        const p = Math.min(1, L.t / LUNGE_TIME);
        e.x = L.from + (L.to - L.from) * (1 - (1 - p) * (1 - p));
        e.walkT += dt * 2;
        if (p >= BITE_AT && !e.bit) {
          e.bit = true;
          snap(e);
          if (g && g.dist <= g.reach + 8) combat.damageHero(g.h, REPTILE_DAMAGE);
        }
        if (p < 1) return;
        e.leap = null;
        e.kvx = -e.facing * 70; // backs off
        e.state = 'rest';
        e.st = REPTILE_REST;
        break;
      }
      case 'rest':
        if (g) e.facing = g.dir;
        if ((e.st -= dt) <= 0) e.state = 'chase';
        break;
    }
  }

  // ---------------------------------------------------------------- Shadow

  /** Quadratic Bézier through three {x, air} points. */
  function bez(a, b, c, u) {
    const v = 1 - u;
    return { x: v * v * a.x + 2 * v * u * b.x + u * u * c.x, air: v * v * a.air + 2 * v * u * b.air + u * u * c.air };
  }

  function pickWay(e) {
    const b = e.bounds;
    // mostly somewhere over the party, now and then anywhere
    const h = Math.random() < 0.6 ? pickHero() : null;
    const x = h ? h.x + (Math.random() - 0.5) * 260 : rand([b.x0 + 20, b.x1 - 20]);
    e.way = { x: Math.max(b.x0 + 10, Math.min(b.x1 - 10, x)), air: rand([b.airMin, b.airMax]) };
  }

  function pickHero() {
    const heroes = combat.targetableHeroes();
    if (!heroes.length) return null;
    const knight = heroes.find((h) => h.kind === 'player');
    return knight && Math.random() < 0.65 ? knight : heroes[Math.floor(Math.random() * heroes.length)];
  }

  function updateShade(e, dt) {
    e.flapT += dt;
    if (e.state === 'swoop') {
      e.st += dt;
      const u = Math.min(1, e.st / SWOOP_TIME);
      const ease = u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) ** 2;
      const p = bez(e.swoop.from, e.swoop.via, e.swoop.to, ease);
      if (Math.abs(p.x - e.x) > 0.2) e.facing = Math.sign(p.x - e.x);
      e.x = p.x;
      e.air = p.air;
      e.flapT += dt * 0.5;
      if (u >= 1) {
        e.state = 'fly';
        e.swoop = null;
        pickWay(e);
      }
      return;
    }
    // fly about: towards its current spot, weaving, a new spot once there
    const dx = e.way.x - e.x;
    const da = e.way.air - e.air;
    const d = Math.hypot(dx, da);
    if (d < 6) pickWay(e);
    else if (Math.abs(e.kvx) < 15) {
      const sp = SHADE_SPEED * (e.charge > 0 ? 0.35 : 1);
      e.x = clampE(e, e.x + (dx / d) * sp * dt);
      e.air += (da / d) * sp * dt + Math.sin(e.flapT * 3) * 6 * dt;
      e.air = Math.max(e.bounds.airMin - 10, Math.min(e.bounds.airMax + 10, e.air));
    }
    // shooting: it gathers a pulse in its jaws, then spits it at a hero
    if (e.charge > 0) {
      e.charge += dt / PULSE_CHARGE;
      if (e.target) e.facing = Math.sign(e.target.x - e.x) || e.facing;
      if (e.charge >= 1) {
        e.charge = 0;
        spit(e);
      }
    } else {
      if (Math.abs(dx) > 1) e.facing = Math.sign(dx);
      if ((e.shotCd -= dt) <= 0) {
        e.target = pickHero();
        e.shotCd = rand(PULSE_EVERY);
        if (e.target) e.charge = 0.001;
      }
    }
  }

  function spit(e) {
    const h = e.target;
    if (!h || !combat.targetableHeroes().includes(h)) return;
    const ox = e.x + e.facing * 6;
    const oy = GROUND_Y - e.air - 9;
    const dx = h.x - ox;
    const dy = h.y - h.h * 0.5 - oy;
    const len = Math.hypot(dx, dy) || 1;
    pulses.push({ x: ox, y: oy, vx: (dx / len) * PULSE_SPEED, vy: (dy / len) * PULSE_SPEED, t: 0 });
    burst(combat.particles, ox, oy, 6, { colors: PULSE, speed: 30, up: 0, g: 0, life: [0.2, 0.4] });
    sfx.pulse();
  }

  // ---------------------------------------------------------------- projectiles

  function heroAt(x, y, pad = 1) {
    return combat.targetableHeroes().find((h) => Math.abs(x - h.x) <= h.w / 2 + pad && y >= h.y - h.h && y <= h.y);
  }

  function updateFx(dt) {
    t += dt;
    for (let i = puddles.length - 1; i >= 0; i--) if ((puddles[i].t += dt) > 5) puddles.splice(i, 1);
    for (let i = arrows.length - 1; i >= 0; i--) {
      const a = arrows[i];
      if (a.stuck !== undefined) {
        if ((a.stuck -= dt) <= 0) arrows.splice(i, 1);
        continue;
      }
      for (let s = 0; s < 2; s++) {
        a.vy += SKEL_ARROW_G * (dt / 2);
        a.x += a.vx * (dt / 2);
        a.y += a.vy * (dt / 2);
        const h = heroAt(a.x, a.y);
        if (h) {
          combat.damageHero(h, SKEL_ARROW_DAMAGE);
          burst(combat.particles, a.x, a.y, 4, { colors: ['#e4dcc6', '#a89e86'], speed: 30, life: [0.15, 0.3] });
          arrows.splice(i, 1);
          break;
        }
        const floor = combat.floorAt(a.x, a.y - a.vy * (dt / 2));
        if (a.y >= floor + 1) {
          a.y = floor + 1;
          a.stuck = SKEL_ARROW_STUCK;
          break;
        }
        if (a.x < -40 || a.x > combat.worldWidth + 40) {
          arrows.splice(i, 1);
          break;
        }
      }
    }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (Math.random() < 0.8) combat.particles.add({ x: p.x + (Math.random() - 0.5) * 3, y: p.y + (Math.random() - 0.5) * 3, vx: -p.vx * 0.1, vy: (Math.random() - 0.5) * 6, life: 0.35, colors: PULSE.slice(1) });
      const hit = heroAt(p.x, p.y, 3);
      const floor = combat.floorAt(p.x, p.y - p.vy * dt);
      if (hit || p.y >= floor || p.x < -20 || p.x > combat.worldWidth + 20 || p.t > 8) {
        pulses.splice(i, 1);
        popPulse(p.x, Math.min(p.y, floor - 1), p.y >= floor - 1);
      }
    }
    for (let i = scorches.length - 1; i >= 0; i--) if ((scorches[i].t += dt) >= 3) scorches.splice(i, 1);
  }

  function popPulse(x, y, onFloor) {
    burst(combat.particles, x, y, 18, { colors: PULSE, speed: 70, up: 30, g: 90, life: [0.25, 0.55] });
    if (onFloor) scorches.push({ x, y: y + 1, t: 0 });
    for (const h of combat.targetableHeroes()) {
      if (Math.abs(h.x - x) <= PULSE_R + h.w / 2 - 1 && y >= h.y - h.h - PULSE_R && y <= h.y + PULSE_R) combat.damageHero(h, PULSE_DAMAGE);
    }
  }

  // ---------------------------------------------------------------- dying

  /** Dead: a skeleton topples off the battlements; a Shadow sinks as it dissolves; then they fade. */
  function updateDead(e, dt) {
    if (e.kind === 'skeleton' && e.air > 0) {
      e.fallV += 340 * dt;
      e.air = Math.max(0, e.air - e.fallV * dt);
      e.x += e.facing * 14 * dt;
      if (e.air === 0) burst(combat.particles, e.x, GROUND_Y - 2, 12, { colors: BONES, speed: 50, up: 30, g: 240, life: [0.3, 0.6] });
      return;
    }
    if (e.kind === 'shade') {
      e.air = Math.max(0, e.air - 20 * dt);
      if (Math.random() < 0.6) combat.particles.add({ x: e.x + (Math.random() - 0.5) * 12, y: GROUND_Y - e.air - Math.random() * 12, vx: (Math.random() - 0.5) * 10, vy: -10 - Math.random() * 10, life: 0.6, colors: SMOKE, size: 2, drag: 1.5 });
    }
    // bones stay a while longer before they fade
    e.dieT += e.kind === 'skeleton' ? dt * 0.15 : dt;
  }

  function onDefeated(e) {
    const y = GROUND_Y - e.air - e.h / 2;
    const colors = e.kind === 'skeleton' ? BONES : e.kind === 'reptile' ? SCALES : SMOKE;
    burst(combat.particles, e.x, y, e.kind === 'shade' ? 20 : 16, { colors, speed: 70, up: 40, g: e.kind === 'shade' ? -20 : 220, life: [0.4, 0.8], size: [1, 2], drag: e.kind === 'shade' ? 1.5 : 0 });
    e.leap = null;
    e.charge = 0;
    if (e.kind === 'reptile') e.air = 0;
  }

  // ---------------------------------------------------------------- render

  function render(ctx, e) {
    const fy = GROUND_Y - e.air;
    if (e.kind === 'skeleton') {
      if (e.dead && e.air === 0) drawBonePile(ctx, e.x, GROUND_Y, e.facing);
      else drawSkeletonArcher(ctx, e.x, fy, e.facing, { pull: e.state === 'draw' ? Math.min(1, (1 - e.st / SKEL_DRAW) * 1.4) : 0, t, asleep: !e.awake });
    } else if (e.kind === 'reptile') {
      const sink = e.dead ? Math.round((e.dieT / DIE_TIME) * 3) : 0;
      const coil = !e.dead && e.state === 'coil' ? 1 - e.st / COIL_TIME : 0;
      const p = !e.dead && e.state === 'lunge' && e.leap ? Math.min(1, e.leap.t / LUNGE_TIME) : -1;
      drawReptile(ctx, e.x, GROUND_Y + sink, e.facing, {
        walkT: e.walkT,
        coil,
        lunge: p >= 0 ? Math.sin(p * Math.PI) : 0,
        jaw: e.dead ? 0.5 : p >= 0 ? (p < BITE_AT ? 1 : 0) : coil > 0 ? 0.3 + 0.7 * coil : e.state === 'rest' ? 0.1 : 0.3,
        asleep: !e.awake,
        t,
      });
    } else {
      drawShade(ctx, e.x, fy, e.facing, { flapT: e.flapT, charge: e.charge, variant: e.variant, t });
    }
  }

  function renderGround(ctx) {
    for (const g of puddles) if (g.t > 0) drawGooPuddle(ctx, g.x, GROUND_Y - 1, g.size, 0.85 * Math.min(1, (5 - g.t) / 1.5));
    for (const s of scorches) drawPulseScorch(ctx, s.x, s.y, 0.6 * (1 - s.t / 3));
  }

  function renderFx(ctx) {
    for (const a of arrows) {
      const ang = Math.atan2(a.vy, a.vx);
      if (a.stuck === undefined) drawBoneArrow(ctx, a.x, a.y, ang);
      else {
        const prev = ctx.globalAlpha;
        ctx.globalAlpha = prev * Math.min(1, a.stuck / 0.3);
        drawBoneArrow(ctx, a.x, a.y, ang, { buried: true });
        ctx.globalAlpha = prev;
      }
    }
    for (const p of pulses) drawPulse(ctx, p.x, p.y, t + p.t);
  }

  return {
    kinds,
    owns: (e) => kinds.has(e.kind),
    make,
    update,
    updateFx,
    updateDead,
    onDefeated,
    render,
    renderGround,
    renderFx,
    /** Debug / tools: shots in the air. */
    get shots() {
      return arrows.filter((a) => a.stuck === undefined).length + pulses.length;
    },
  };
}
