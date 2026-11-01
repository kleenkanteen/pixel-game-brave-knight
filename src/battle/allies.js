// The three fellow adventurers in the fight. They hold their ground and attack the monsters:
//   Archer      — draws and looses arrows in an arc at one of the nearest monsters
//   Mage        — her orb sparkles; she thrusts her staff and sends a blue bolt at a monster
//   Holy Knight — at the front, chops at the nearest monster in reach of his sword
// Each hit does ALLY_DAMAGE and knocks the monster back. Internal to the battle slice.
import { GROUND_Y, KNIGHT_W, WALK_SPEED } from '../core/constants.js';
import { px, disc, withAlpha } from '../core/draw.js';
import { drawText, measureText } from '../core/font.js';
import { createRobin } from './robin.js';
import { drawArcher, drawMage, drawHolyKnight, mageOrb, holyShieldRimPoint } from './art-heroes.js';
import { burst } from './particles.js';

export const ALLY_DAMAGE = 3; // a zombie (30 HP) takes 10 ally hits
const ARROW_G = 300;
const DRAW_TIME = 0.5; // archer: s from drawing to loosing
const CAST_TIME = 0.55; // mage
const SWING_TIME = 0.42; // holy knight
const BOLT_SPEED = 150;
const HOLY_REACH = 16; // px past the monster's half-width that his sword reaches
const FOLLOW_GAP = 1.5 * KNIGHT_W; // px kept between each follower and the one ahead
const FOLLOW_SLACK = 6; // px past the gap before a follower sets off (no jitter)
const FOLLOW_SPEED = WALK_SPEED * 1.6; // fast enough to keep up with the horse
const CLIMB_SPEED = 46; // px/s up or down a ladder (same as the knight)
const RALLY_SPEED = FOLLOW_SPEED * 1.3; // px/s: running for a safe zone
const RALLY_SPOTS = [-12, 0, 12]; // px either side of a rally point (archer, mage, holy): they huddle
const ENGAGE_RANGE = 220; // px: while following, they only take on monsters this close
const BOSS_RANGE = 300; // px: the Archer shoots at a boss's weak spot this close

const BARK_TIME = 4; // s a floating line stays above someone's head
const BARK_FADE = 0.5; // …fading out over its last half second
const BARK_COOLDOWN = 6; // s after a line disappears before that ally speaks again
const BARK_COLOR = '#fff6d8';

const SHIELD_GLINT = ['#ffffff', '#fff0a0', '#ffd84a', '#d9a62c'];
const ORB_SPARKS = ['#ffffff', '#c8ecff', '#7ccaff', '#3a8ce8'];
const BOLT = ['#ffffff', '#a6dcff', '#4aa2f0', '#2a6cc8'];

/**
 * @param {object} combat  shared battle state + helpers (see battle/index.js)
 * @param {{archer:number, mage:number, holy:number}} xs  centre x of each ally
 */
export function createAllies(combat, xs) {
  const base = { y: GROUND_Y, w: 12, h: 24, hp: 100, maxHp: 100, facing: 1, act: 0, hurtT: 0, ally: true, special: false, faceX: null, moving: 0, walkT: 0, climb: null };
  const list = [
    { ...base, kind: 'archer', name: 'Archer', x: xs.archer, cd: 0.8, phase: 0.3 },
    { ...base, kind: 'mage', name: 'Mage', x: xs.mage, cd: 1.4, phase: 1.7 },
    { ...base, kind: 'holy', name: 'Holy Knight', x: xs.holy, cd: 0.3, phase: 2.9, hit: false },
  ];
  const arrows = []; // {x, y, vx, vy, stuck?:number}
  const bolts = []; // {x, y, vx, vy, t}
  const barks = []; // {ally, text, t, row}
  const robin = createRobin(); // perches on the Archer's shoulder, loops around him now and then
  let t = 0;
  let following = false;
  let fighting = false; // any monster still up (the Holy Knight's sword is out)

  /**
   * A short line floating above an ally's head for BARK_TIME s. Ignored while that ally is still
   * talking or cooling down, so a line never spams. Lines stack upward when several are up.
   */
  function say(kind, text) {
    const a = list.find((x) => x.kind === kind);
    if (!a || t < (a.quietUntil ?? 0)) return;
    a.quietUntil = t + BARK_TIME + BARK_COOLDOWN;
    const used = new Set(barks.map((b) => b.row));
    let row = 0;
    while (used.has(row)) row++;
    barks.push({ ally: a, text, t: 0, row });
  }

  const footY = (e) => GROUND_Y - (e.air || 0);
  const chestY = (e) => footY(e) - e.h * 0.55;

  function nearestEnemy(a, within = following ? ENGAGE_RANGE : Infinity) {
    let best = null;
    for (const e of combat.aliveEnemies()) {
      const d = Math.abs(e.x - a.x);
      if (d <= within && (!best || d < Math.abs(best.x - a.x))) best = e;
    }
    return best;
  }

  /** One of the two nearest monsters, at random (so arrows / bolts spread over the pack). */
  function pickTarget(a) {
    const range = following ? ENGAGE_RANGE : Infinity;
    const es = combat.aliveEnemies().filter((e) => Math.abs(e.x - a.x) <= range).sort((p, q) => Math.abs(p.x - a.x) - Math.abs(q.x - a.x));
    if (!es.length) return null;
    return es[Math.random() < 0.6 || es.length === 1 ? 0 : 1];
  }

  function update(dt, anyMonsters) {
    t += dt;
    fighting = anyMonsters;
    if (following) updateFollow(dt);
    shieldShimmer();
    for (const a of list) {
      a.hurtT = Math.max(0, a.hurtT - dt);
      a.cd -= dt;
      const near = nearestEnemy(a);
      if (a.special && a.faceX !== null) a.facing = Math.sign(a.faceX - a.x) || a.facing;
      else if (near) a.facing = Math.sign(near.x - a.x) || a.facing;
      else if (a.moving) a.facing = a.moving;
      else if (combat.player.x) a.facing = Math.sign(combat.player.x - a.x) || a.facing; // victory: face him

      if (a.special) {
        // an ability pose (battle/index.js → perform): just play it out, no attack of its own
        if ((a.act -= dt) <= 0) a.special = false;
        continue;
      }
      if (a.kind === 'archer') updateArcher(a, dt, fighting, near);
      else if (a.kind === 'mage') updateMage(a, dt, fighting, near);
      else updateHoly(a, dt, fighting);
    }
    robin.update(dt);
    updateArrows(dt);
    updateBolts(dt);
    for (let i = barks.length - 1; i >= 0; i--) if ((barks[i].t += dt) >= BARK_TIME) barks.splice(i, 1);
  }

  /**
   * After the battle they follow the Brave Knight in a line: the ally nearest him keeps
   * FOLLOW_GAP from him, the next keeps FOLLOW_GAP from that one, and so on.
   */
  function updateFollow(dt) {
    if (combat.rallyX !== null && combat.rallyX !== undefined && !combat.ledge) {
      list.forEach((a, i) => rallyStep(a, combat.rallyX + RALLY_SPOTS[i], dt));
      return;
    }
    const p = combat.player;
    const order = [...list].sort((a, b) => Math.abs(a.x - p.x) + Math.abs(a.y - p.y) - (Math.abs(b.x - p.x) + Math.abs(b.y - p.y)));
    let leader = { x: p.x, level: levelOf(p.y) };
    for (const a of order) {
      if (a.climb !== null) climbStep(a, dt);
      else if (levelOf(a.y) !== leader.level) toLadder(a, leader.level, dt);
      else followOnLevel(a, leader.x, dt);
      // the next one follows this one (mid-climb it counts as where it's headed)
      leader = { x: a.x, level: a.climb !== null ? levelOf(a.climb) : levelOf(a.y) };
    }
  }

  /** Run (faster than following) to x and stand there. */
  function rallyStep(a, x, dt) {
    const d = x - a.x;
    if (Math.abs(d) < 0.5) {
      a.moving = 0;
      return;
    }
    a.moving = Math.sign(d);
    a.x += a.moving * Math.min(RALLY_SPEED * dt, Math.abs(d));
    a.walkT = (a.walkT || 0) + dt;
  }

  /** 0 on the floor, 1 up on the ledge (when the Stage has one). */
  function levelOf(y) {
    return combat.ledge && y < GROUND_Y - 4 ? 1 : 0;
  }

  /** Keep FOLLOW_GAP behind the leader on the same level (never walking off the ledge). */
  function followOnLevel(a, lx, dt) {
    const d = Math.abs(lx - a.x);
    if (!a.moving && d > FOLLOW_GAP + FOLLOW_SLACK) a.moving = Math.sign(lx - a.x);
    if (!a.moving) return;
    a.moving = Math.sign(lx - a.x) || a.moving;
    const step = Math.min(FOLLOW_SPEED * dt, d - FOLLOW_GAP);
    if (step <= 0) {
      a.moving = 0;
      return;
    }
    let lo = Math.max(combat.allyBounds.lo, Math.min(8, a.x)); // walking in from off the left edge is fine
    let hi = Math.min(combat.allyBounds.hi, combat.worldWidth - 8);
    const L = combat.ledge;
    if (L && levelOf(a.y) === 1) {
      lo = L.x0 + 5;
      hi = L.x1 - 5;
    }
    a.x = Math.max(lo, Math.min(hi, a.x + a.moving * step));
    a.walkT = (a.walkT || 0) + dt;
  }

  /** Walk to the ladder, then climb it to `level`. */
  function toLadder(a, level, dt) {
    const L = combat.ledge;
    const dx = L.ladderX - a.x;
    if (Math.abs(dx) > 1) {
      a.moving = Math.sign(dx);
      a.x += a.moving * Math.min(FOLLOW_SPEED * dt, Math.abs(dx));
      a.walkT = (a.walkT || 0) + dt;
      return;
    }
    a.x = L.ladderX;
    a.moving = 0;
    // one at a time: wait until whoever is on the ladder is a body-length clear
    if (list.some((o) => o !== a && o.climb !== null && Math.abs(o.y - a.y) < a.h)) return;
    a.climb = level === 1 ? L.y : GROUND_Y;
  }

  function climbStep(a, dt) {
    const dy = a.climb - a.y;
    const step = CLIMB_SPEED * dt;
    a.walkT = (a.walkT || 0) + dt;
    if (Math.abs(dy) > step) a.y += Math.sign(dy) * step;
    else {
      a.y = a.climb;
      a.climb = null;
    }
  }

  /** The gold rim of the Holy Knight's shield radiates: motes lift off it and twinkle out. */
  function shieldShimmer() {
    const a = list.find((x) => x.kind === 'holy');
    if (Math.random() > 0.45) return;
    const p = holyShieldRimPoint(a.x, a.y, a.facing, bobOf(a));
    combat.particles.add({
      x: p.x,
      y: p.y,
      vx: p.out * (4 + Math.random() * 8),
      vy: -4 - Math.random() * 10,
      life: 0.4 + Math.random() * 0.4,
      colors: SHIELD_GLINT,
      drag: 1.5,
    });
  }

  /** Play an ability pose (no attack of its own), facing world x `faceX` if given. */
  function perform(kind, faceX = null) {
    const a = list.find((x) => x.kind === kind);
    if (!a) return null;
    a.special = true;
    a.faceX = faceX;
    a.act = a.kind === 'archer' ? DRAW_TIME * 0.4 : a.kind === 'mage' ? CAST_TIME : SWING_TIME;
    if (faceX !== null) a.facing = Math.sign(faceX - a.x) || a.facing;
    return a;
  }

  /** The Archer looses one high arrow that lands at world x `tx` after `T` s (Arrow Storm). */
  function shootAt(tx, { T = 1.3, damage = ALLY_DAMAGE } = {}) {
    const a = perform('archer', tx);
    const ox = a.x + a.facing * 7;
    const oy = a.y - 11;
    const dy = GROUND_Y - oy;
    arrows.push({ x: ox, y: oy, vx: (tx - ox) / T, vy: (dy - 0.5 * ARROW_G * T * T) / T, damage, storm: true });
  }

  function updateArcher(a, dt, fighting, near) {
    if (a.act > 0) {
      a.act -= dt;
      if (a.act > 0) return;
      const e = pickTarget(a);
      // no monster about: a boss's exposed weak spot (she's a fair shot, not a perfect one)
      const boss = e ? null : bossInRange(a);
      if (!e && !boss) return;
      const ox = a.x + a.facing * 7;
      const oy = a.y - 11;
      const tx = e ? e.x : boss.x + (Math.random() - 0.5) * 16;
      const ty = e ? chestY(e) : boss.y + (Math.random() - 0.5) * 12;
      const dx = tx - ox;
      const dy = ty - oy;
      const T = Math.max(0.35, Math.min(0.95, Math.abs(dx) / 170));
      arrows.push({ x: ox, y: oy, vx: dx / T, vy: (dy - 0.5 * ARROW_G * T * T) / T });
    } else if (fighting && (near || bossInRange(a)) && a.cd <= 0) {
      a.act = DRAW_TIME;
      a.cd = 1.9 + Math.random() * 0.5;
    }
  }

  /** The boss's weak spot ({x, y}) if it's exposed and within her range, else null. */
  function bossInRange(a) {
    const b = combat.bossTarget?.();
    return b && Math.abs(b.x - a.x) <= BOSS_RANGE ? b : null;
  }

  function updateMage(a, dt, fighting, near) {
    const pose = { bob: bobOf(a), cast: castOf(a) };
    const o = mageOrb(a.x, a.y, a.facing, pose);
    // the orb's shimmer: sparks drift up and twinkle out (more while casting)
    const rate = pose.cast > 0 ? 1 : 0.55;
    if (Math.random() < rate) {
      const ang = Math.random() * Math.PI * 2;
      const r = 1 + Math.random() * (pose.cast > 0 ? 5 : 3);
      combat.particles.add({
        x: o.x + Math.cos(ang) * r,
        y: o.y + Math.sin(ang) * r,
        vx: (Math.random() - 0.5) * 8,
        vy: -6 - Math.random() * 14,
        life: 0.45 + Math.random() * 0.5,
        colors: ORB_SPARKS,
      });
    }
    if (a.act > 0) {
      const before = a.act;
      a.act -= dt;
      // the bolt leaves the orb at the peak of the thrust
      if (before > CAST_TIME * 0.4 && a.act <= CAST_TIME * 0.4) {
        const e = pickTarget(a);
        if (!e) return;
        const dx = e.x - o.x;
        const dy = chestY(e) - o.y;
        const len = Math.hypot(dx, dy) || 1;
        bolts.push({ x: o.x, y: o.y, vx: (dx / len) * BOLT_SPEED, vy: (dy / len) * BOLT_SPEED, t: 0 });
        burst(combat.particles, o.x, o.y, 6, { colors: BOLT, speed: 30, up: 0, g: 0, life: [0.2, 0.4] });
      }
    } else if (fighting && near && a.cd <= 0) {
      a.act = CAST_TIME;
      a.cd = 2.4 + Math.random() * 0.6;
    }
  }

  function updateHoly(a, dt, fighting) {
    // only what he can reach with his sword: on his level, not high in the air
    const inReach = (e) => Math.abs(e.x - a.x) <= e.w / 2 + HOLY_REACH && (e.air || 0) < 16 && Math.abs(a.y - GROUND_Y) < 4;
    if (a.act > 0) {
      a.act -= dt;
      const p = 1 - a.act / SWING_TIME;
      if (p >= 0.6 && !a.hit) {
        a.hit = true;
        const e = nearestEnemy(a);
        if (e && inReach(e)) combat.damageEnemy(e, ALLY_DAMAGE, a.facing, 90);
      }
    } else if (fighting && a.cd <= 0) {
      const e = nearestEnemy(a);
      if (e && inReach(e)) {
        a.act = SWING_TIME;
        a.cd = 1.3 + Math.random() * 0.35;
        a.hit = false;
      }
    }
  }

  function updateArrows(dt) {
    for (let i = arrows.length - 1; i >= 0; i--) {
      const r = arrows[i];
      if (r.stuck !== undefined) {
        if ((r.stuck -= dt) <= 0) arrows.splice(i, 1);
        continue;
      }
      for (let s = 0; s < 2; s++) {
        r.vy += ARROW_G * (dt / 2);
        r.x += r.vx * (dt / 2);
        r.y += r.vy * (dt / 2);
        const e = combat.enemyAt(r.x, r.y);
        if (e || combat.bossArrow?.(r.x, r.y, r.vx)) {
          if (e) combat.damageEnemy(e, r.damage ?? ALLY_DAMAGE, Math.sign(r.vx) || 1, 40);
          burst(combat.particles, r.x, r.y, 4, { colors: ['#fff1c4', '#d9a62c'], speed: 30, life: [0.15, 0.3] });
          arrows.splice(i, 1);
          break;
        }
        if (r.y >= GROUND_Y + 1) {
          r.y = GROUND_Y + 1;
          r.stuck = r.storm ? 2 : 1.2;
          if (!r.storm) say('archer', 'Wind!'); // missed
          break;
        }
      }
    }
  }

  function updateBolts(dt) {
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      b.t += dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (Math.random() < 0.8) {
        combat.particles.add({ x: b.x, y: b.y + (Math.random() - 0.5) * 2, vx: -b.vx * 0.1, vy: (Math.random() - 0.5) * 8, life: 0.3, colors: BOLT.slice(1) });
      }
      const e = combat.enemyAt(b.x, b.y);
      if (e || b.y >= GROUND_Y || b.t > 2.5) {
        if (e) combat.damageEnemy(e, ALLY_DAMAGE, Math.sign(b.vx) || 1, 50);
        burst(combat.particles, b.x, Math.min(b.y, GROUND_Y - 1), 10, { colors: BOLT, speed: 50, up: 20, g: 60, life: [0.2, 0.45] });
        bolts.splice(i, 1);
      }
    }
  }

  const bobOf = (a) => (a.act > 0 ? 0 : a.moving ? Math.floor(a.walkT * 8) % 2 : Math.sin(t * 2.4 + a.phase) > 0.55 ? 1 : 0);
  const castOf = (a) => (a.kind === 'mage' && a.act > 0 ? Math.sin((1 - a.act / CAST_TIME) * Math.PI) : 0);

  function render(ctx) {
    for (const a of list) {
      const flicker = a.hurtT > 0 && Math.floor(a.hurtT * 30) % 2 === 0;
      withAlpha(ctx, flicker ? 0.45 : 1, () => {
        const bob = bobOf(a);
        const fy = Math.round(a.y);
        // on a ladder: facing alternates with each rung, nothing in hand
        const f = a.climb !== null ? (Math.floor(a.walkT * 6) % 2 ? 1 : -1) : a.facing;
        const busy = a.climb === null;
        if (a.kind === 'archer') {
          drawArcher(ctx, a.x, fy, f, { bob, pull: busy && a.act > 0 ? Math.min(1, (1 - a.act / DRAW_TIME) * 1.6) : 0 });
          robin.render(ctx, a.x, fy, f, bob);
        }
        else if (a.kind === 'mage') drawMage(ctx, a.x, fy, f, { bob, cast: busy ? castOf(a) : 0, t: t + a.phase });
        else {
          const swing = busy && a.act > 0 ? 1 - a.act / SWING_TIME : 0;
          drawHolyKnight(ctx, a.x, fy, f, { bob, swing, sheathed: !busy || (!fighting && swing <= 0) });
        }
      });
    }
  }

  /** Arrows and bolts in flight (over the actors). */
  function renderFx(ctx) {
    for (const r of arrows) {
      const ang = Math.atan2(r.vy, r.vx);
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      withAlpha(ctx, r.stuck !== undefined ? Math.min(1, r.stuck / 0.3) : 1, () => {
        for (let i = 0; i <= 7; i++) {
          const X = r.x - dx * i;
          const Y = r.y - dy * i;
          if (r.stuck !== undefined && Math.round(Y) > GROUND_Y) continue;
          px(ctx, X, Y, i < 2 ? '#c9d0dc' : i > 5 ? '#f0ebe0' : '#a07a4a');
        }
      });
    }
    for (const b of bolts) {
      withAlpha(ctx, 0.35, () => disc(ctx, b.x, b.y, 3, '#5ab4ff'));
      disc(ctx, b.x, b.y, 1, '#a6dcff');
      px(ctx, b.x, b.y, '#ffffff');
    }
  }

  /** Floating lines above the allies (WORLD coords; drawn over the health bars). */
  function renderBarks(ctx, camX, viewW) {
    for (const b of barks) {
      const w = measureText(b.text);
      const x = Math.max(camX + 2, Math.min(camX + viewW - 2 - w, Math.round(b.ally.x - w / 2)));
      const y = b.ally.y - b.ally.h - 26 - b.row * 10 - Math.round(Math.min(1, b.t / 0.2) * 2);
      withAlpha(ctx, Math.min(1, (BARK_TIME - b.t) / BARK_FADE), () => drawText(ctx, b.text, x, y, { color: BARK_COLOR, outline: '#14101c' }));
    }
  }

  return {
    list,
    say,
    perform,
    shootAt,
    /** true → follow the Brave Knight in a line (after the battle). */
    setFollow(on) {
      following = on;
      if (!on) for (const a of list) a.moving = 0;
    },
    update,
    render,
    renderFx,
    renderBarks,
  };
}
