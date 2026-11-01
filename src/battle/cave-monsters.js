// The monsters of the Lord's Lair (Stage 4). Each sleeps until a hero comes within AGGRO (or it
// gets hit), then goes for the closest hero:
//   Cave Crawler — a fist-sized cave spider: scuttles up, crouches, pounces (CRAWLER_DAMAGE),
//                  then skitters back and comes again
//   Rock Golem   — slow, heavy (barely knocked back): raises both stone fists and slams them
//                  down (GOLEM_DAMAGE) with a puff of grit, then catches its breath
//   Pterodactyl  — flies high over a hero (out of sword reach: arrows, allies and abilities bring it
//                  down). Every DROP_EVERY s it stops and strains for STRAIN_TIME s (a mark blinks
//                  on the floor below it), then lets a dropping fall: DROPPING_DAMAGE to whoever is
//                  still under it. Shot down, it tumbles to the floor.
// Ground monsters only go for heroes on the floor (not up on a ledge). Internal to the battle slice.
import { GROUND_Y } from '../core/constants.js';
import { px, withAlpha } from '../core/draw.js';
import { ellipse } from './paint.js';
import { burst } from './particles.js';
import { drawCrawler, drawGolem, drawPtero, drawDropping } from './art-cave.js';

const AGGRO = 150; // px: a hero this close wakes a monster up

const CRAWLER_DAMAGE = 1;
const CROUCH_TIME = 0.3;
const POUNCE_TIME = 0.38;
const POUNCE_H = 10;

const GOLEM_DAMAGE = 2;
const RAISE_TIME = 0.6;
const SLAM_TIME = 0.22;
const GOLEM_REST = 1.1;

const DROPPING_DAMAGE = 6;
const DROP_EVERY = 5; // s per cycle: flying, then straining
const STRAIN_TIME = 2; // s it takes to let one out (dodge!)
const DROPPING_G = 260;
const SPLAT_R = 9; // px either side that a splat reaches
const SPLAT_TIME = 3;
const FLY_SPEED = 42;

const DIE_TIME = 0.6;
const BITS = {
  crawler: ['#5a3e6e', '#3a2848', '#c8323c'],
  golem: ['#8a8496', '#6a6474', '#4a4654', '#5a6a3a'],
  ptero: ['#b8763e', '#8a5430', '#e0c08a'],
};
const MUCK = ['#e8e0b8', '#8a7a4a', '#5e5030'];

/** @param {object} combat  shared battle state + helpers (see battle/index.js) */
export function createCaveMonsters(combat) {
  const KINDS = new Set(['crawler', 'golem', 'ptero']);
  const drops = []; // {x, y, vy, landY}
  const splats = []; // {x, y, t}
  let t = 0;

  /** Keeps a monster in the world, and inside its own [minX, maxX] when the roster gives one. */
  const clampE = (e, x) => Math.max(e.minX ?? 8, Math.min(e.maxX ?? combat.worldWidth - 8, x));

  /** A new monster from a roster entry {kind, x, x0?, x1?}; i = its index (staggers the timers). */
  function make(base, spec, i) {
    const e = makeKind(base, spec, i);
    if (spec.x0 !== undefined) e.minX = spec.x0;
    if (spec.x1 !== undefined) e.maxX = spec.x1;
    return e;
  }

  function makeKind(base, { kind, x }, i) {
    if (kind === 'crawler') {
      return { ...base, kind, name: 'Cave Crawler', x, w: 12, h: 8, hp: 20, maxHp: 20, speed: 30 + (i % 3) * 3, state: 'chase', st: 0, leap: null, gap: (i % 3) * 3, knockMul: 1.1 };
    }
    if (kind === 'golem') {
      return { ...base, kind, name: 'Rock Golem', x, w: 16, h: 26, hp: 60, maxHp: 60, speed: 10, state: 'chase', st: 0, gap: 0, knockMul: 0.3 };
    }
    if (kind === 'ptero') {
      const alt = 66 + (i % 2) * 12;
      return { ...base, kind, name: 'Pterodactyl', x, w: 18, h: 10, hp: 20, maxHp: 20, air: alt, alt, state: 'fly', st: 0, dropCd: 1.5 + (i % 2) * 2, flapT: i * 0.4, target: null, fallV: 0, knockMul: 0.8 };
    }
    throw new Error(`Unknown cave monster ${kind}`);
  }

  /** Closest hero (floor-only for ground monsters) + the gap at which it's "in reach". */
  function engage(e, floorOnly = true) {
    const h = combat.closestHero(e.x, floorOnly);
    if (!h) return null;
    const dir = Math.sign(h.x - e.x) || e.facing;
    return { h, dir, dist: Math.abs(h.x - e.x), reach: h.w / 2 + e.w / 2 + e.gap };
  }

  function wake(e) {
    if (e.awake) return true;
    const h = combat.closestHero(e.x);
    if (h && Math.abs(h.x - e.x) <= AGGRO) e.awake = true;
    return e.awake;
  }

  function update(e, dt) {
    if (!wake(e)) {
      if (e.kind === 'ptero') e.flapT += dt * 0.5; // dozing on the wing
      return;
    }
    if (e.kind === 'crawler') updateCrawler(e, dt);
    else if (e.kind === 'golem') updateGolem(e, dt);
    else updatePtero(e, dt);
  }

  function walk(e, g, dt) {
    e.x = clampE(e, e.x + g.dir * Math.min(e.speed * dt, g.dist - g.reach));
    e.walkT += dt;
  }

  function updateCrawler(e, dt) {
    const g = engage(e);
    switch (e.state) {
      case 'chase':
        if (!g) return;
        e.facing = g.dir;
        if (Math.abs(e.kvx) > 15) return;
        if (g.dist > g.reach + 16) walk(e, { ...g, reach: g.reach + 16 }, dt);
        else {
          e.state = 'crouch';
          e.st = CROUCH_TIME;
        }
        break;
      case 'crouch':
        if ((e.st -= dt) > 0) return;
        if (!g) {
          e.state = 'chase';
          return;
        }
        e.state = 'pounce';
        e.leap = { from: e.x, to: clampE(e, g.h.x - g.dir * (g.reach - 3)), t: 0 };
        break;
      case 'pounce': {
        const L = e.leap;
        L.t += dt;
        const p = Math.min(1, L.t / POUNCE_TIME);
        e.x = L.from + (L.to - L.from) * p;
        e.air = Math.sin(p * Math.PI) * POUNCE_H;
        if (p < 1) return;
        e.leap = null;
        e.air = 0;
        if (g && g.dist <= g.reach + 4) combat.damageHero(g.h, CRAWLER_DAMAGE);
        e.kvx = -e.facing * 85; // skitters back
        e.state = 'rest';
        e.st = 0.7;
        break;
      }
      case 'rest':
        if (g) e.facing = g.dir;
        if ((e.st -= dt) <= 0) e.state = 'chase';
        break;
    }
  }

  function updateGolem(e, dt) {
    const g = engage(e);
    switch (e.state) {
      case 'chase':
        if (!g) return;
        e.facing = g.dir;
        if (Math.abs(e.kvx) > 8) return;
        if (g.dist > g.reach) walk(e, g, dt);
        else {
          e.state = 'raise';
          e.st = RAISE_TIME;
        }
        break;
      case 'raise':
        if ((e.st -= dt) > 0) return;
        e.state = 'slam';
        e.st = SLAM_TIME;
        if (g && g.dist <= g.reach + 7) combat.damageHero(g.h, GOLEM_DAMAGE);
        burst(combat.particles, e.x + e.facing * 10, GROUND_Y - 1, 10, { colors: ['#8a8496', '#5e5868', '#3a3442'], speed: 55, up: 30, g: 260, life: [0.25, 0.5] });
        break;
      case 'slam':
        if ((e.st -= dt) <= 0) {
          e.state = 'rest';
          e.st = GOLEM_REST;
        }
        break;
      case 'rest':
        if (g) e.facing = g.dir;
        if ((e.st -= dt) <= 0) e.state = 'chase';
        break;
    }
  }

  function pickTarget() {
    const heroes = combat.targetableHeroes();
    if (!heroes.length) return null;
    const knight = heroes.find((h) => h.kind === 'player');
    return knight && Math.random() < 0.6 ? knight : heroes[Math.floor(Math.random() * heroes.length)];
  }

  function updatePtero(e, dt) {
    e.flapT += dt;
    if (!e.target || !combat.targetableHeroes().includes(e.target)) e.target = pickTarget();
    const tg = e.target;
    if (e.state === 'fly') {
      e.air = e.alt + Math.sin(e.flapT * 3) * 2;
      if (tg) {
        // circles a little around the spot above its hero
        const hx = tg.x + Math.sin(e.flapT * 0.9) * 14;
        const dx = hx - e.x;
        if (Math.abs(dx) > 1 && Math.abs(e.kvx) < 15) e.x = clampE(e, e.x + Math.sign(dx) * Math.min(FLY_SPEED * dt, Math.abs(dx)));
        e.facing = Math.sign(dx) || e.facing;
      }
      e.dropCd -= dt;
      if (e.dropCd <= 0 && tg && Math.abs(tg.x - e.x) < 22) {
        e.state = 'strain';
        e.st = STRAIN_TIME;
        e.markY = combat.floorAt(e.x, GROUND_Y - e.air + 4);
      }
    } else if (e.state === 'strain') {
      e.air = e.alt + Math.sin(e.flapT * 9) * 1;
      e.markY = combat.floorAt(e.x, GROUND_Y - e.air + 4);
      if ((e.st -= dt) <= 0) {
        const y = GROUND_Y - e.air + 3;
        drops.push({ x: e.x - e.facing * 3, y, vy: 0, landY: combat.floorAt(e.x - e.facing * 3, y) });
        e.state = 'fly';
        e.dropCd = DROP_EVERY - STRAIN_TIME;
        e.target = pickTarget();
      }
    }
  }

  function updateFx(dt) {
    t += dt;
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.vy += DROPPING_G * dt;
      d.y += d.vy * dt;
      if (d.y < d.landY) continue;
      drops.splice(i, 1);
      splats.push({ x: d.x, y: d.landY, t: 0 });
      burst(combat.particles, d.x, d.landY - 1, 10, { colors: MUCK, speed: 45, up: 25, g: 240, life: [0.25, 0.5] });
      for (const h of combat.targetableHeroes()) {
        if (Math.abs(h.x - d.x) > SPLAT_R + h.w / 2 - 2 || Math.abs(h.y - d.landY) > 6) continue;
        combat.damageHero(h, DROPPING_DAMAGE);
        if (h.kind === 'archer') combat.say('archer', 'Ugh! Not the hat!');
        if (h.kind === 'player') combat.say('holy', "They say that's good luck.");
      }
    }
    for (let i = splats.length - 1; i >= 0; i--) if ((splats[i].t += dt) >= SPLAT_TIME) splats.splice(i, 1);
  }

  /** Dead: a Pterodactyl tumbles to the floor first; then every body fades out. */
  function updateDead(e, dt) {
    if (e.kind === 'ptero' && e.air > 0) {
      e.fallV += 320 * dt;
      e.air = Math.max(0, e.air - e.fallV * dt);
      e.flapT += dt * 4;
      if (e.air === 0) burst(combat.particles, e.x, GROUND_Y - 1, 8, { colors: ['#5e5868', '#3a3442'], speed: 40, up: 20, g: 220, life: [0.2, 0.4] });
      return;
    }
    e.dieT += dt;
  }

  function onDefeated(e) {
    const y = GROUND_Y - e.air - e.h / 2;
    burst(combat.particles, e.x, y, e.kind === 'golem' ? 24 : 14, { colors: BITS[e.kind], speed: 70, up: 40, g: 220, life: [0.4, 0.8], size: [1, 2] });
    burst(combat.particles, e.x, y, 6, { colors: ['#6a5e6e', '#4e4454'], speed: 20, up: 20, g: -15, life: [0.6, 1.1], size: 2, drag: 1.5 });
    e.leap = null;
    if (e.kind !== 'ptero') e.air = 0;
  }

  function render(ctx, e) {
    const fy = GROUND_Y - (e.kind === 'ptero' ? 0 : e.air) + (e.dead && e.kind !== 'ptero' ? Math.round((e.dieT / DIE_TIME) * 3) : 0);
    if (e.kind === 'crawler') {
      drawCrawler(ctx, e.x, fy, e.facing, { walkT: e.walkT, crouch: e.state === 'crouch' ? 1 : 0, air: e.air, asleep: !e.awake, t });
    } else if (e.kind === 'golem') {
      const raise = e.state === 'raise' ? 1 - e.st / RAISE_TIME : 0;
      drawGolem(ctx, e.x, fy, e.facing, { walkT: e.walkT, raise, slam: e.state === 'slam' ? 1 : 0, asleep: !e.awake, t });
    } else {
      drawPtero(ctx, e.x, GROUND_Y - e.air, e.facing, { flapT: e.flapT, strain: e.state === 'strain' ? 1 - e.st / STRAIN_TIME : 0, dead: e.dead, asleep: !e.awake });
    }
  }

  function renderGround(ctx) {
    for (const s of splats) {
      withAlpha(ctx, 1 - s.t / SPLAT_TIME, () => {
        ellipse(ctx, s.x, s.y, 5, 1, '#8a7a4a');
        px(ctx, s.x - 6, s.y - 1, '#e8e0b8');
        px(ctx, s.x + 5, s.y, '#e8e0b8');
      });
    }
  }

  function renderFx(ctx) {
    for (const d of drops) drawDropping(ctx, d.x, d.y);
  }

  /** Over the actors: the blinking drop mark under each straining Pterodactyl (must read). */
  function renderMarks(ctx, list) {
    for (const e of list) {
      if (e.dead || e.kind !== 'ptero' || e.state !== 'strain') continue;
      const p = 1 - e.st / STRAIN_TIME;
      const on = Math.floor(t * (6 + p * 10)) % 2 === 0;
      const r = Math.round(SPLAT_R - 2 + (1 - p) * 4);
      withAlpha(ctx, 0.35, () => ellipse(ctx, e.x, e.markY + 1, r, 1, '#3a2a10'));
      if (on) {
        for (let i = -r; i <= r; i += 2) px(ctx, e.x + i, e.markY + 1, '#e8c547');
        px(ctx, e.x - r - 1, e.markY, '#e8c547');
        px(ctx, e.x + r + 1, e.markY, '#e8c547');
      }
    }
  }

  return {
    owns: (e) => KINDS.has(e.kind),
    make,
    update,
    updateFx,
    updateDead,
    onDefeated,
    render,
    renderGround: (ctx) => renderGround(ctx),
    renderFx(ctx, _t, list) {
      renderFx(ctx);
      if (list) renderMarks(ctx, list);
    },
  };
}
