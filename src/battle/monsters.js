// The monsters. Each goes for the CLOSEST hero (the Brave Knight counts, once he's in the fight):
//   Zombie    — shambles up; in reach it lunges: 1 damage, and the blow bounces it back a little,
//               then it comes on again
//   Werewolf  — runs up, rears its claw back and slashes (WEREWOLF_DAMAGE), then leaps back
//               3 Knight Widths and comes again
//   Dark Mage — stays at the back; every CAST_EVERY s it picks a random hero and drops a fireball
//               on where they stand (battle/fireballs.js: 3 s warning vortex first)
// Any hit knocks a monster back. A roster (Stages 4–5) mixes the cave monsters (cave-monsters.js),
// the castle's (castle-monsters.js: Skeleton Archers, Reptilians, Shadows) and Werewolves; roster
// monsters sleep until a hero comes near. Internal to the battle slice.
import { GROUND_Y, KNIGHT_W } from '../core/constants.js';
import { withAlpha } from '../core/draw.js';
import { drawZombie, drawWerewolf, drawDarkMage, darkOrb } from './art-monsters.js';
import { burst } from './particles.js';
import { createCaveMonsters } from './cave-monsters.js';
import { createCastleMonsters } from './castle-monsters.js';

const ZOMBIE_DAMAGE = 1;
const WEREWOLF_DAMAGE = 2;
const LUNGE_TIME = 0.35;
const RECOIL = 75; // px/s a zombie bounces back off its own blow
const WIND_TIME = 0.3;
const SWING_TIME = 0.18;
const LEAP_DIST = 3 * KNIGHT_W;
const LEAP_TIME = 0.5;
const LEAP_H = 14;
const CAST_EVERY = 5;
const CAST_ANIM = 0.7;
const DIE_TIME = 0.6;
const KNOCK_DECAY = 7; // knockback velocity falls off as e^(−k·t)
const AGGRO = 150; // px: a hero this close wakes a sleeping roster Werewolf

const ROT_BITS = ['#a0bc84', '#7e9c66', '#5a7646', '#6e1a18'];
const FUR_BITS = ['#84747e', '#5e5058', '#3e343c'];
const SHADOW_BITS = ['#ffd27a', '#b0302c', '#58346a', '#24142c'];
const EMBERS = ['#ffe07a', '#ff8a2a', '#c83c1c'];

/**
 * @param {object} combat  shared battle state + helpers (see battle/index.js)
 * @param {{zombies:number[], werewolf:number, darkMage:number} | {kind:string, x:number}[]} xs
 *   Stage 3's pack (starting centre x of each), or a roster: cave monsters (cave-monsters.js),
 *   castle monsters (castle-monsters.js) and 'werewolf'
 */
export function createMonsters(combat, xs) {
  const base = { facing: -1, kvx: 0, hurtT: 0, dead: false, dieT: 0, walkT: 0, air: 0, gap: 0, awake: true };
  const cave = createCaveMonsters(combat);
  const castle = createCastleMonsters(combat);
  /** The slice that owns a roster kind (null: one of the Stage 3 kinds, handled here). */
  const ownerOf = (e) => (cave.owns(e) ? cave : castle.owns(e) ? castle : null);
  /** A monster from a roster entry {kind, x, …}; i = its index (staggers the timers). */
  function make(spec, i, awake = false) {
    const b = { ...base, awake };
    if (spec.kind === 'werewolf') {
      return { ...b, kind: 'werewolf', name: 'Werewolf', x: spec.x, w: 14, h: 26, hp: 50, maxHp: 50, state: 'chase', st: 0, leap: null, speed: 34, gap: (i % 2) * 6 };
    }
    return castle.kinds.has(spec.kind) ? castle.make(b, spec, i) : cave.make(b, spec, i);
  }
  const list = Array.isArray(xs) ? xs.map((spec, i) => make(spec, i)) : [
    { ...base, kind: 'darkMage', name: 'Dark Mage', x: xs.darkMage, home: xs.darkMage, w: 10, h: 24, hp: 30, maxHp: 30, castCd: 2.5, castT: 0 },
    { ...base, kind: 'werewolf', name: 'Werewolf', x: xs.werewolf, w: 14, h: 26, hp: 50, maxHp: 50, state: 'chase', st: 0, leap: null, speed: 34, gap: 0 },
    ...xs.zombies.map((x, i) => ({
      ...base,
      kind: 'zombie',
      name: 'Zombie',
      x,
      w: 10,
      h: 20,
      hp: 30,
      maxHp: 30,
      atkT: 0,
      cd: Math.random() * 0.6,
      gap: i * 5, // stand a little apart so the pack doesn't stack in one spot
      speed: 11 + i * 1.5,
      walkT: i * 0.3,
    })),
  ];
  let t = 0;

  const clampX = (x) => Math.max(8, Math.min(combat.worldWidth - 8, x));

  function update(dt) {
    t += dt;
    for (const e of list) {
      if (e.dead) {
        const owner = ownerOf(e);
        if (owner) owner.updateDead(e, dt);
        else e.dieT += dt;
        continue;
      }
      e.hurtT = Math.max(0, e.hurtT - dt);
      if (!e.leap) {
        e.x = clampX(e.x + e.kvx * dt);
        e.kvx *= Math.exp(-KNOCK_DECAY * dt);
        if (Math.abs(e.kvx) < 2) e.kvx = 0;
      }
      const owner = ownerOf(e);
      if (owner) owner.update(e, dt);
      else if (!wake(e)) continue;
      else if (e.kind === 'zombie') updateZombie(e, dt);
      else if (e.kind === 'werewolf') updateWerewolf(e, dt);
      else if (e.kind === 'darkMage') updateDarkMage(e, dt);
    }
    cave.updateFx(dt);
    castle.updateFx(dt);
  }

  /** A sleeping roster monster wakes when a hero comes within AGGRO (Stage 3's pack is always up). */
  function wake(e) {
    if (e.awake) return true;
    const h = combat.closestHero(e.x);
    if (h && Math.abs(h.x - e.x) <= AGGRO) e.awake = true;
    return e.awake;
  }

  /** Closest hero + the gap at which this monster is "in reach" of them. */
  function engage(e) {
    const h = combat.closestHero(e.x);
    if (!h) return null;
    const dir = Math.sign(h.x - e.x) || e.facing;
    return { h, dir, dist: Math.abs(h.x - e.x), reach: h.w / 2 + e.w / 2 + e.gap };
  }

  function updateZombie(e, dt) {
    e.cd -= dt;
    const g = engage(e);
    if (e.atkT > 0) {
      e.atkT -= dt;
      if (e.atkT <= 0 && g) {
        if (g.dist <= g.reach + 5) combat.damageHero(g.h, ZOMBIE_DAMAGE);
        e.kvx = -e.facing * RECOIL; // bounced back by its own blow
      }
      return;
    }
    if (!g) return;
    e.facing = g.dir;
    if (Math.abs(e.kvx) > 15) return; // still reeling
    if (g.dist > g.reach) {
      e.x = clampX(e.x + g.dir * Math.min(e.speed * dt, g.dist - g.reach));
      e.walkT += dt;
    } else if (e.cd <= 0) {
      e.atkT = LUNGE_TIME;
      e.cd = 0.8;
    }
  }

  function updateWerewolf(e, dt) {
    const g = engage(e);
    switch (e.state) {
      case 'chase':
        if (!g) return;
        e.facing = g.dir;
        if (Math.abs(e.kvx) > 15) return;
        if (g.dist > g.reach) {
          e.x = clampX(e.x + g.dir * Math.min(e.speed * dt, g.dist - g.reach));
          e.walkT += dt;
        } else {
          e.state = 'wind';
          e.st = WIND_TIME;
        }
        break;
      case 'wind':
        if ((e.st -= dt) <= 0) {
          e.state = 'swing';
          e.st = SWING_TIME;
          if (g && g.dist <= g.reach + 8) combat.damageHero(g.h, WEREWOLF_DAMAGE);
        }
        break;
      case 'swing':
        if ((e.st -= dt) <= 0) {
          e.state = 'leap';
          e.kvx = 0;
          e.leap = { from: e.x, to: clampX(e.x - e.facing * LEAP_DIST), t: 0 };
          combat.say('holy', 'Come back here, you overgrown puppy!');
        }
        break;
      case 'leap': {
        const L = e.leap;
        L.t += dt;
        const p = Math.min(1, L.t / LEAP_TIME);
        e.x = L.from + (L.to - L.from) * (1 - (1 - p) * (1 - p));
        e.air = Math.sin(p * Math.PI) * LEAP_H;
        if (p >= 1) {
          e.leap = null;
          e.air = 0;
          e.state = 'rest';
          e.st = 0.45;
          burst(combat.particles, e.x, GROUND_Y - 1, 5, { colors: ['#4a4450', '#3a2a2c'], speed: 30, up: 10, g: 120, life: [0.2, 0.4] });
        }
        break;
      }
      case 'rest':
        if (g) e.facing = g.dir;
        if ((e.st -= dt) <= 0) e.state = 'chase';
        break;
    }
  }

  function updateDarkMage(e, dt) {
    const g = engage(e);
    if (g) e.facing = g.dir;
    // drifts back to its spot after being knocked away
    if (Math.abs(e.kvx) < 5 && Math.abs(e.x - e.home) > 1) e.x += Math.sign(e.home - e.x) * 12 * dt;
    e.castT = Math.max(0, e.castT - dt);
    const cast = e.castT > 0 ? Math.sin((1 - e.castT / CAST_ANIM) * Math.PI) : 0;
    const o = darkOrb(e.x, GROUND_Y, e.facing, { cast });
    if (Math.random() < 0.4) {
      combat.particles.add({ x: o.x + (Math.random() - 0.5) * 3, y: o.y - 1, vx: (Math.random() - 0.5) * 6, vy: -10 - Math.random() * 12, life: 0.4 + Math.random() * 0.3, colors: EMBERS });
    }
    e.castCd -= dt;
    if (e.castCd <= 0) {
      const heroes = combat.targetableHeroes();
      if (!heroes.length) return;
      const target = heroes[Math.floor(Math.random() * heroes.length)];
      e.castT = CAST_ANIM;
      e.castCd = CAST_EVERY;
      const top = darkOrb(e.x, GROUND_Y, e.facing, { cast: 1 });
      combat.fireballs.cast(top.x, top.y, target.x);
    }
  }

  /** Called by the battle when a monster's HP runs out. */
  function onDefeated(e) {
    const owner = ownerOf(e);
    if (owner) return owner.onDefeated(e);
    const y = GROUND_Y - e.h / 2;
    const colors = e.kind === 'zombie' ? ROT_BITS : e.kind === 'werewolf' ? FUR_BITS : SHADOW_BITS;
    burst(combat.particles, e.x, y, e.kind === 'zombie' ? 14 : 22, { colors, speed: 70, up: 40, g: 220, life: [0.4, 0.8], size: [1, 2] });
    burst(combat.particles, e.x, y, 8, { colors: ['#6a5e6e', '#4e4454'], speed: 20, up: 20, g: -15, life: [0.6, 1.1], size: 2, drag: 1.5 });
    e.leap = null;
    e.air = 0;
  }

  function render(ctx) {
    for (const e of list) {
      if (e.dead && e.dieT >= DIE_TIME) continue;
      const flicker = e.hurtT > 0 && Math.floor(e.hurtT * 30) % 2 === 0;
      const alpha = e.dead ? 1 - e.dieT / DIE_TIME : flicker ? 0.4 : 1;
      const sink = e.dead ? Math.round((e.dieT / DIE_TIME) * 3) : 0;
      withAlpha(ctx, alpha, () => {
        const fy = GROUND_Y + sink;
        const owner = ownerOf(e);
        if (owner) {
          owner.render(ctx, e, t);
        } else if (e.kind === 'zombie') {
          drawZombie(ctx, e.x, fy, e.facing, { walkT: e.walkT, lunge: e.atkT > 0 ? Math.sin((1 - e.atkT / LUNGE_TIME) * Math.PI) : 0 });
        } else if (e.kind === 'werewolf') {
          const arm = e.state === 'wind' ? 'wind' : e.state === 'swing' ? 'swing' : 'idle';
          drawWerewolf(ctx, e.x, fy, e.facing, { walkT: e.walkT, arm, p: e.state === 'swing' ? 1 - e.st / SWING_TIME : 0, air: e.air, t });
        } else {
          const cast = e.castT > 0 ? Math.sin((1 - e.castT / CAST_ANIM) * Math.PI) : 0;
          drawDarkMage(ctx, e.x, fy, e.facing, { bob: Math.sin(t * 2) > 0.5 ? 1 : 0, cast, t });
        }
      });
    }
  }

  return {
    list,
    update,
    render,
    /** WORLD, under the monsters: a straining Pterodactyl's drop marks, splats, spent arrows. */
    renderGround(ctx) {
      cave.renderGround(ctx, t);
      castle.renderGround(ctx);
    },
    /** WORLD, over the actors: droppings falling, skeleton arrows, shadow pulses. */
    renderFx(ctx) {
      cave.renderFx(ctx, t, list);
      castle.renderFx(ctx);
    },
    onDefeated,
    /** A monster joins mid-fight (awake), e.g. a Shadow swooping in: {kind, …} as in a roster. */
    spawn(spec) {
      const e = make(spec, list.length, true);
      list.push(e);
      return e;
    },
  };
}
