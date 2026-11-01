import { GROUND_Y, VIEW_W } from '../core/constants.js';
import { drawText, measureText } from '../core/font.js';
import { rect, px, line, withAlpha } from '../core/draw.js';
import { drawBody, drawHead, drawNeck, drawHydraFireball, drawFloorFire, drawFireStream, drawScaled, drawForeleg, NECK_JOIN, BODY } from './art.js';
import { createGore } from './gore.js';

export const HYDRA_HITS = 30; // arrows into its chin to kill it
const WAKE_TIME = 1.8; // s of rising and roaring
const FIRST_CHARGE = 5; // s after it wakes
const CHARGE_EVERY = 15; // s from one fire blast charge-up to the next
const CHARGE_TIME = 6; // s to put CHIN_HITS arrows into its chin
const CHIN_HITS = 5;
const STAGGER_TIME = 1.8; // stopped blast: it reels, smoke pouring out of its mouth
const BLAST_SWEEP = 0.8; // s for the wall of fire to sweep the whole floor
const BLAST_TIME = 1.7;
const BLAST_DAMAGE = 20; // everyone on the floor (the ledge is safe)
const SPIT = [5, 10]; // s between spat fireballs (random)
const SPIT_WIND = 0.45; // s the spitting head rears back first
const FIREBALL_SPEED = 92; // px/s: slow enough to see coming and step aside
const FIREBALL_DAMAGE = 8; // as much as the Dark Mage's
const FIREBALL_R = 11;
// death: the head last hit swells with fire → the whole beast bloats, reddening → it bursts
const SWELL_TIME = 1.5; // s of the head swelling
const POP_AT = 3.4; // s into dying: it explodes
const DIE_TIME = 5.4; // s into dying: 'dead' (the gore has settled; the victory talk can start)
// up close: the front head lunges out and bites
const BITE_REACH = 64; // px in front of its claws that the head lunges out to
const BITE_CD = [1.8, 3]; // s between bites (random)
const BITE_WIND = 0.4; // s rearing back (his chance to back off)
const BITE_LUNGE = 0.16; // s the head shoots out
const BITE_HOLD = 0.14; // s jaws shut on the spot
const BITE_BACK = 0.5; // s pulling the head back
const BITE_DAMAGE = 12;
const BITE_PUSH = 200; // px/s he's shoved back (left)
const SWORD_REACH = 22; // matches the battle's Strike reach
const LIGHTNING_HITS = 3; // a Lightning Strike into the open mouth counts as this many arrows
const CHIN_HALF = { w: 10, h: 7 }; // the weak spot's hit box (half sizes)
const BANNER_TIME = 1.8;
const TOUGH_EVERY = 3; // s between "Too tough!" when arrows glance off its scales
const SMOKE = ['#8a8098', '#5e5868', '#3a3442'];
const FIRE = ['#fff6d8', '#ffe07a', '#ff8a2a', '#d0342c', '#5a2420'];
const BLOOD = ['#e0303a', '#b8141a', '#8a0a0e'];
/** Fiery cracks that split the swelling head (head-local px, before scaling). */
const CRACKS = [
  [[-6, -3], [-3, -1], [-4, 2]],
  [[2, -5], [4, -2], [7, -3]],
  [[-1, 1], [2, 3], [1, 6]],
  [[6, 0], [9, 2], [8, 5]],
  [[-9, 0], [-11, 3]],
  [[3, -1], [5, 1]],
];

/**
 * Hydra slice: the boss at the back of the Lord's Lair. Asleep (snoring) until the knight comes
 * past `wakeX`; then it rises (onWake) and fights:
 *   - Every SPIT s (random) a side head rears back and spits a fireball at the Brave Knight (now
 *     and then at an ally): it flies straight at where he was, slowly enough to dodge. FIREBALL_DAMAGE.
 *   - Every CHARGE_EVERY s the middle head rears up and opens wide, fire welling in its mouth and the
 *     pale underside of its chin exposed: "Attack its mouth to prevent a fire blast!" — CHIN_HITS
 *     arrows into the chin within CHARGE_TIME s stop it (it reels); otherwise a wall of fire sweeps
 *     the whole floor (from the Hydra to `blastX0`): BLAST_DAMAGE to everyone on it. The ledge is safe.
 *   - The chin is the ONLY place it can be hurt, and only while exposed: each arrow there is one
 *     hit; HYDRA_HITS kill it. Anywhere else, arrows glance off its scales.
 *   - He gets close (within BITE_REACH of its claws, on the floor): the front head rears back, then
 *     lunges its neck out at him and snaps — BITE_DAMAGE and a shove back (knockback) if he's
 *     still there. A sword Strike on any part of it glances off: "Too tough!".
 *   - A Lightning Strike landing on it while the mouth is open (boss.onArea) counts as
 *     LIGHTNING_HITS arrows into the chin.
 *   - Dying: the head that took the last hit swells up with fire, then the whole beast bloats,
 *     reddening, and bursts: blood and guts everywhere (gore.js), sticking to the heroes it hits.
 *     onDefeated(x, y) as it bursts (the potion appears where it stood); 'dead' once it settles.
 * Paused while a Dialogue is open. `boss` is what battle.setBoss() takes; `collider` goes to the bow.
 *
 * @param {import('../core/stage.js').World} world
 * @param {{x:number, wakeX:number, blastX0:number, battle:object, dialogue:{isOpen():boolean},
 *          floorAt:(x:number, y:number)=>number, knockback?:(vx:number, vy:number)=>void,
 *          onWake:()=>void, onDefeated:(x:number, y:number)=>void}} opts
 *   x = body centre
 */
export function createHydra(world, { x: HX, wakeX, blastX0, battle, dialogue, floorAt, knockback = () => {}, onWake, onDefeated }) {
  let state = 'sleep'; // 'sleep' | 'wake' | 'fight' | 'dying' | 'dead'
  let st = 0; // s in the current state
  let t = 0;
  let hp = HYDRA_HITS;
  let chargeCd = FIRST_CHARGE;
  let spitCd = 3;
  let charge = null; // {t, hits}
  let blast = null; // {t, hit:Set, from}
  let stagger = 0;
  let spit = null; // {head, t, target}
  let hurtT = 0;
  let toughT = 0;
  let shake = 0;
  let banner = null; // {text, color, t}
  let bite = null; // {t, tx, ty} the front head's lunge at him
  let biteCd = 1;
  let strikePending = false;
  let swordToughT = 0;
  world.events.on('sword:strike', () => {
    strikePending = true;
  });
  let lastHead = 1; // the head the last hit landed on (it's the one that swells up when it dies)
  let popped = false;
  let flash = 0; // white flash as it bursts
  const gore = createGore({ floorAt, heroes: () => battle.heroes, knight: world.knight });
  const fireballs = []; // {x, y, vx, vy}
  const texts = []; // floating text {x, y, text, t}
  const ROOTS = [
    { x: HX - 38, y: GROUND_Y - 30 },
    { x: HX - 32, y: GROUND_Y - 40 },
    { x: HX - 20, y: GROUND_Y - 46 },
  ];
  const heads = [
    { x: HX - 66, y: GROUND_Y - 8 },
    { x: HX - 52, y: GROUND_Y - 14 },
    { x: HX - 22, y: GROUND_Y - 46 },
  ];
  let pts = heads.map(() => null); // last drawn mouth / chin points
  let lastChin = { x: HX - 70, y: GROUND_Y - 70 };

  const alive = () => state !== 'dying' && state !== 'dead';

  /** Where each head wants to be this tick. */
  function targetOf(i) {
    const sway = (a, b) => ({ x: Math.sin(t * 1.3 + i * 2.1) * a, y: Math.sin(t * 1.7 + i * 1.3) * b });
    if (state === 'sleep') {
      const breath = Math.sin(t * 1.2 + i) * 1;
      return [{ x: HX - 66, y: GROUND_Y - 8 + breath }, { x: HX - 50, y: GROUND_Y - 12 + breath }, { x: HX - 22, y: GROUND_Y - 46 + breath }][i];
    }
    let p = [{ x: HX - 76, y: GROUND_Y - 46 }, { x: HX - 66, y: GROUND_Y - 76 }, { x: HX - 34, y: GROUND_Y - 102 }][i];
    if (state === 'dying' || state === 'dead') {
      // the swelling head lifts and shudders; the others thrash and wail
      if (i === lastHead) return { x: p.x + Math.sin(t * 40) * 1.5 - 6, y: p.y - 8 + Math.sin(t * 33) * 1.5 };
      const a = 4 + Math.min(1, st / POP_AT) * 5;
      return { x: p.x + Math.sin(t * 17 + i * 2) * a, y: p.y + Math.sin(t * 13 + i) * a };
    }
    const s = sway(3, 3);
    if (state === 'wake') {
      const rise = Math.min(1, st / (WAKE_TIME * 0.6));
      const rest = [{ x: HX - 66, y: GROUND_Y - 8 }, { x: HX - 50, y: GROUND_Y - 12 }, { x: HX - 22, y: GROUND_Y - 46 }][i];
      p = { x: rest.x + (p.x - rest.x) * rise, y: rest.y + (p.y - rest.y) * rise - Math.sin(rise * Math.PI) * 10 };
    }
    if (i === 1 && charge) {
      const tremble = charge.t > CHARGE_TIME - 1.5 ? Math.sin(t * 50) * 1 : 0;
      return { x: HX - 80 + tremble, y: GROUND_Y - 92 };
    }
    if (i === 2 && charge) return { x: HX - 26 + s.x, y: GROUND_Y - 106 + s.y }; // gives it room
    if (i === 1 && blast) return blast.t < BLAST_TIME - 0.3 ? { x: HX - 84, y: GROUND_Y - 44 } : p;
    if (i === 1 && stagger > 0) return { x: HX - 74 + Math.sin(t * 9) * 3, y: GROUND_Y - 34 };
    if (bite && i === 0) {
      const b = bite.t;
      if (b < BITE_WIND) return { x: p.x + 10, y: p.y - 10 }; // rears back
      if (b < BITE_WIND + BITE_LUNGE + BITE_HOLD) return { x: bite.tx + 5, y: bite.ty }; // out at him
    }
    if (spit && spit.head === i) {
      // rears back, then snaps forward as it spits
      return spit.t < SPIT_WIND ? { x: p.x + 7, y: p.y - 5 } : { x: p.x - 6, y: p.y + 3 };
    }
    return { x: p.x + s.x, y: p.y + s.y };
  }

  function update(dt) {
    t += dt;
    st += dt;
    hurtT = Math.max(0, hurtT - dt);
    toughT = Math.max(0, toughT - dt);
    shake = Math.max(0, shake - dt);
    if (banner && (banner.t += dt) >= BANNER_TIME) banner = null;
    for (let i = texts.length - 1; i >= 0; i--) if ((texts[i].t += dt) >= 1) texts.splice(i, 1);

    // heads ease towards their poses (snappier when lunging)
    heads.forEach((h, i) => {
      const g = targetOf(i);
      const lunging = bite && i === 0 && bite.t >= BITE_WIND && bite.t < BITE_WIND + BITE_LUNGE + BITE_HOLD;
      const k = Math.min(1, dt * (lunging ? 26 : blast && i === 1 ? 12 : spit?.head === i ? 14 : 5));
      h.x += (g.x - h.x) * k;
      h.y += (g.y - h.y) * k;
    });

    updateFireballs(dt);
    gore.update(dt);
    swordToughT = Math.max(0, swordToughT - dt);
    checkSword();
    flash = Math.max(0, flash - dt);
    if (state === 'sleep') {
      if (Math.random() < dt * 0.8) texts.push({ x: heads[1].x - 4, y: heads[1].y - 10, text: 'z', t: 0, snore: true });
      const k = world.knight;
      if (k.x + k.width / 2 >= wakeX) {
        state = 'wake';
        st = 0;
        shake = 0.8;
        onWake();
      }
      return;
    }
    if (state === 'wake') {
      if (st >= WAKE_TIME) {
        state = 'fight';
        st = 0;
      }
      return;
    }
    if (state === 'dying') {
      updateDying(dt);
      return;
    }
    if (state !== 'fight' || dialogue.isOpen()) return;

    // ---- fire blast: charge-up → blast or stagger
    chargeCd -= dt;
    if (!charge && !blast && stagger <= 0 && chargeCd <= 0) {
      charge = { t: 0, hits: 0 };
      chargeCd = CHARGE_EVERY;
    }
    if (charge) {
      charge.t += dt;
      // fire sucked into the mouth
      const m = pts[1];
      if (m && Math.random() < 0.8) {
        const a = Math.random() * Math.PI * 2;
        const r = 14 + Math.random() * 10;
        battle.particle({ x: m.mouthX + Math.cos(a) * r, y: m.mouthY + Math.sin(a) * r, vx: -Math.cos(a) * r * 2.4, vy: -Math.sin(a) * r * 2.4, life: 0.4, colors: FIRE.slice(0, 4) });
      }
      if (charge.t >= CHARGE_TIME) {
        charge = null;
        blast = { t: 0, hit: new Set(), from: HX - 84 };
        shake = BLAST_TIME;
        banner = { text: 'FIRE BLAST!', color: '#ff5a3a', t: 0 };
      }
    }
    if (blast) updateBlast(dt);
    if (stagger > 0) {
      stagger -= dt;
      const m = pts[1];
      if (m && Math.random() < 0.6) battle.particle({ x: m.mouthX, y: m.mouthY, vx: (Math.random() - 0.5) * 10, vy: -14 - Math.random() * 10, life: 0.8, colors: SMOKE, size: 2, drag: 1 });
    }

    updateBite(dt);

    // ---- spitting fireballs
    if (spit) {
      const before = spit.t;
      spit.t += dt;
      if (before < SPIT_WIND && spit.t >= SPIT_WIND) launch(spit.head, spit.target);
      if (spit.t >= SPIT_WIND + 0.35) spit = null;
    } else if (!bite && (spitCd -= dt) <= 0) {
      const heroes = battle.targetableHeroes();
      if (heroes.length) {
        const knight = heroes.find((h) => h.kind === 'player');
        const target = knight && Math.random() < 0.75 ? knight : heroes[Math.floor(Math.random() * heroes.length)];
        spit = { head: Math.random() < 0.5 ? 0 : 2, t: 0, target };
      }
      spitCd = SPIT[0] + Math.random() * (SPIT[1] - SPIT[0]);
    }
  }

  /** The knight's centre x, feet y, and whether the Hydra can go for him. */
  function prey() {
    const k = world.knight;
    const p = battle.player;
    const ok = battle.targetableHeroes().includes(p);
    return { x: k.x + k.width / 2, y: k.y - k.lift, ok };
  }

  /** The front head bites at him when he comes close. */
  function updateBite(dt) {
    const me = prey();
    if (!bite) {
      biteCd -= dt;
      const close = me.ok && me.x >= HX - 60 - BITE_REACH && me.y > GROUND_Y - 30;
      if (close && biteCd <= 0 && !charge && !blast && stagger <= 0 && spit?.head !== 0) {
        bite = { t: 0, tx: me.x, ty: me.y - 13, hit: false };
        biteCd = BITE_CD[0] + Math.random() * (BITE_CD[1] - BITE_CD[0]);
      }
      return;
    }
    const before = bite.t;
    bite.t += dt;
    if (before < BITE_WIND && bite.t >= BITE_WIND) {
      // locks on to where he is now, within reach
      bite.tx = Math.max(HX - 60 - BITE_REACH, Math.min(HX - 66, me.x));
      bite.ty = Math.max(GROUND_Y - 30, me.y - 13);
    }
    const snapAt = BITE_WIND + BITE_LUNGE;
    if (before < snapAt && bite.t >= snapAt) {
      const m = pts[0];
      const mx = m ? m.mouthX : bite.tx;
      battle.burst(mx, bite.ty, 6, { colors: ['#f4f0e4', '#c8c0a8'], speed: 40, up: 10, g: 200, life: [0.1, 0.25] });
      if (me.ok && Math.abs(me.x - bite.tx) <= 14 && Math.abs(me.y - 13 - bite.ty) <= 16) {
        bite.hit = true;
        battle.damageHero(battle.player, BITE_DAMAGE);
        knockback(-BITE_PUSH, -130);
        shake = Math.max(shake, 0.25);
        battle.burst(me.x, bite.ty, 10, { colors: ['#e0303a', '#b8141a', '#8a0a0e'], speed: 60, up: 30, g: 260, life: [0.2, 0.45] });
        texts.push({ x: bite.tx, y: bite.ty - 16, text: 'Chomp!', t: 0 });
      }
    }
    if (bite.t >= BITE_WIND + BITE_LUNGE + BITE_HOLD + BITE_BACK) bite = null;
  }

  /** A sword Strike this tick: anything of it along the blade → "Too tough!" and sparks. */
  function checkSword() {
    if (!strikePending) return;
    const k = world.knight;
    if (k.strikeT > 0 && k.strikeT > 0.25 * 0.55) return; // connects partway through the swing (as the battle's)
    strikePending = false;
    if (!alive()) return;
    const cx = k.x + k.width / 2;
    const f = k.facing;
    const feet = k.y - k.lift;
    for (let d = 0; d <= SWORD_REACH; d += 3) {
      for (let y = feet - 30; y <= feet - 4; y += 4) {
        const x = cx + d * f;
        if (!hitTest(x, y)) continue;
        battle.burst(x, y, 8, { colors: ['#ffffff', '#fff0a0', '#c8c0a8'], speed: 60, up: 20, g: 200, life: [0.1, 0.3] });
        if (swordToughT <= 0) {
          swordToughT = 0.5;
          texts.push({ x: x + 8, y: Math.min(y - 8, feet - 44), text: 'Too tough!', t: 0 }); // above his health bar
        }
        return;
      }
    }
  }

  /** Swollen head's scale at this point of dying. */
  function swell() {
    const q = Math.min(1, st / SWELL_TIME);
    return 1 + 0.9 * (1 - (1 - q) * (1 - q)) + Math.max(0, st - SWELL_TIME) * 0.12;
  }
  /** 0..1 through the bloating (after the head has swollen). */
  function bloat() {
    return Math.max(0, Math.min(1, (st - SWELL_TIME) / (POP_AT - SWELL_TIME)));
  }

  function updateDying(dt) {
    if (popped) {
      if (st >= DIE_TIME) state = 'dead';
      return;
    }
    // fire leaking from the swelling head's mouth and eyes
    const m = pts[lastHead];
    if (m && Math.random() < 0.9) {
      const s = swell();
      battle.particle({ x: m.mouthX + (Math.random() - 0.5) * 6 * s, y: m.mouthY, vx: -10 - Math.random() * 30, vy: -20 - Math.random() * 30, life: 0.5, colors: FIRE.slice(0, 4) });
      if (Math.random() < 0.5) battle.particle({ x: heads[lastHead].x - 2 * s, y: heads[lastHead].y - 3 * s, vx: (Math.random() - 0.5) * 20, vy: -30, life: 0.4, colors: FIRE.slice(0, 3) });
    }
    const b = bloat();
    if (b > 0) {
      shake = Math.max(shake, 0.1); // the cave trembles as it swells
      if (Math.random() < b * 0.6) battle.particle({ x: HX - 40 + (Math.random() - 0.5) * 100, y: GROUND_Y - 10 - Math.random() * 50, vx: 0, vy: -10 - Math.random() * 10, life: 0.6, colors: ['#ff8a7a', '#c83a3a', '#6a2a2a'], size: 2, drag: 1 });
      if (Math.random() < b * 0.3) battle.burst(HX - 30 + (Math.random() - 0.5) * 60, GROUND_Y - 6, 2, { colors: BLOOD, speed: 20, up: 10, g: 300, life: [0.3, 0.5] });
    }
    if (st >= POP_AT) pop();
  }

  /** It bursts: fire, smoke, blood and guts everywhere; the potion is left where it stood. */
  function pop() {
    popped = true;
    shake = 1.2;
    flash = 0.35;
    fireballs.length = 0;
    const h = heads[lastHead];
    battle.burst(h.x, h.y, 50, { colors: FIRE, speed: 160, up: 40, g: 120, life: [0.4, 0.9], size: [1, 2] });
    battle.burst(HX - 30, GROUND_Y - 34, 70, { colors: FIRE, speed: 200, up: 60, g: 140, life: [0.4, 1], size: [1, 2] });
    battle.burst(HX - 30, GROUND_Y - 34, 30, { colors: SMOKE, speed: 60, up: 40, g: -15, life: [1, 2], size: 2, drag: 1.2 });
    gore.explode(HX - 30, GROUND_Y - 36, 120, 60);
    world.events.emit('hydra:exploded');
    onDefeated(HX - 40, GROUND_Y - 6);
  }

  /** Start dying (the killing hit landed on head `i`). */
  function kill(i) {
    lastHead = i;
    charge = null;
    blast = null;
    spit = null;
    bite = null;
    stagger = 0;
    state = 'dying';
    st = 0;
    shake = 0.6;
    banner = null;
  }

  function launch(i, target) {
    const m = pts[i];
    if (!m || !target) return;
    const tx = target.x;
    const ty = target.y - target.h * 0.5;
    const dx = tx - m.mouthX;
    const dy = ty - m.mouthY;
    const len = Math.hypot(dx, dy) || 1;
    fireballs.push({ x: m.mouthX, y: m.mouthY, vx: (dx / len) * FIREBALL_SPEED, vy: (dy / len) * FIREBALL_SPEED, t: 0 });
    battle.burst(m.mouthX, m.mouthY, 8, { colors: FIRE, speed: 40, up: 10, g: 0, life: [0.2, 0.4] });
  }

  function updateFireballs(dt) {
    for (let i = fireballs.length - 1; i >= 0; i--) {
      const f = fireballs[i];
      f.t += dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (Math.random() < 0.9) battle.particle({ x: f.x + (Math.random() - 0.5) * 4, y: f.y + (Math.random() - 0.5) * 4, vx: -f.vx * 0.15, vy: -8, life: 0.35, colors: FIRE.slice(1) });
      const hero = battle.targetableHeroes().find((h) => Math.abs(f.x - h.x) <= h.w / 2 + 2 && f.y >= h.y - h.h && f.y <= h.y);
      const floor = floorAt(f.x, f.y - f.vy * dt);
      if (hero || f.y >= floor || f.x < 0 || f.t > 8) {
        fireballs.splice(i, 1);
        if (f.x >= 0 && f.t <= 8) explode(f.x, Math.min(f.y, floor - 1));
      }
    }
  }

  function explode(x, y) {
    battle.burst(x, y, 26, { colors: FIRE, speed: 100, up: 60, g: 240, life: [0.3, 0.7], size: [1, 2] });
    battle.burst(x, y - 2, 8, { colors: SMOKE, speed: 25, up: 25, g: -12, life: [0.7, 1.2], size: 2, drag: 1.5 });
    for (const h of battle.targetableHeroes()) {
      const cy = h.y - h.h / 2;
      if (Math.abs(h.x - x) <= FIREBALL_R + h.w / 2 - 2 && Math.abs(cy - y) <= h.h / 2 + FIREBALL_R) battle.damageHero(h, FIREBALL_DAMAGE);
    }
  }

  function updateBlast(dt) {
    blast.t += dt;
    const front = blastFront();
    if (Math.random() < 0.9) battle.burst(front, GROUND_Y - 4, 3, { colors: FIRE, speed: 50, up: 50, g: 100, life: [0.3, 0.6] });
    if (blast.t < BLAST_TIME - 0.4) {
      for (const h of battle.targetableHeroes()) {
        if (blast.hit.has(h) || h.y < GROUND_Y - 4 || h.x < front) continue;
        blast.hit.add(h);
        battle.damageHero(h, BLAST_DAMAGE);
      }
    }
    if (blast.t >= BLAST_TIME) {
      blast = null;
    }
  }

  /** Left edge of the fire sweeping across the floor. */
  function blastFront() {
    const p = Math.min(1, blast.t / BLAST_SWEEP);
    return blast.from - (blast.from - blastX0) * (1 - (1 - p) * (1 - p));
  }

  /** Head index whose box contains (x, y), or -1. */
  function headAt(x, y) {
    return heads.findIndex((h) => Math.abs(x - h.x) <= 12 && Math.abs(y - h.y) <= 8);
  }

  /** 'chin' while exposed, 'scales' on a head, the body or a leg, else null. */
  function hitTest(x, y) {
    if (state === 'dead') return null;
    if (charge && Math.abs(x - lastChin.x) <= CHIN_HALF.w && Math.abs(y - lastChin.y) <= CHIN_HALF.h) return 'chin';
    if (headAt(x, y) >= 0) return 'scales';
    const dx = (x - HX) / (BODY.rx + 2);
    const dy = (y - (GROUND_Y - BODY.up)) / (BODY.ry + 2);
    if (dx * dx + dy * dy <= 1) return 'scales';
    return y >= GROUND_Y - BODY.up && y <= GROUND_Y && x >= HX - 60 && x <= HX + 46 ? 'scales' : null; // the legs
  }

  function takeArrow(x, y) {
    const where = hitTest(x, y);
    if (where === 'chin' && charge && alive()) {
      battle.burst(x, y, 8, { colors: ['#fff6c0', '#ffd27a', '#c8b878'], speed: 50, up: 20, g: 120, life: [0.2, 0.4] });
      hurtChin(1, x, y);
    } else if (where) {
      const hi = headAt(x, y);
      if (hi >= 0) lastHead = hi;
      battle.burst(x, y, 4, { colors: ['#e8e4dc', '#9a9282'], speed: 40, up: 20, g: 200, life: [0.15, 0.3] });
      if (toughT <= 0) {
        toughT = TOUGH_EVERY;
        texts.push({ x, y: y - 6, text: charge ? 'The chin!' : 'Too tough!', t: 0 });
      }
    }
  }

  /** `n` hits into the open mouth (arrows or lightning): damage, maybe stop the blast, maybe die. */
  function hurtChin(n, x, y) {
    hp = Math.max(0, hp - n);
    charge.hits += n;
    hurtT = 0.15;
    lastHead = 1;
    battle.number(x, y - 8, `-${n}`, '#ffd27a');
    if (hp <= 0) {
      kill(1);
      return;
    }
    if (charge.hits >= CHIN_HITS) {
      charge = null;
      stagger = STAGGER_TIME;
      banner = { text: 'Fire blast stopped!', color: '#9ae86a', t: 0 };
      battle.burst(x, y, 16, { colors: SMOKE, speed: 30, up: 20, g: -10, life: [0.6, 1.1], size: 2 });
    }
  }

  /**
   * A Lightning Strike on world x range [x0, x1] (battle.damageArea): while the mouth is open,
   * a bolt landing anywhere from the open head back to the body goes down its throat.
   */
  function takeArea(x0, x1) {
    if (!charge || !alive()) return false;
    if (x1 < lastChin.x - 18 || x0 > HX + BODY.rx) return false;
    const { x, y } = lastChin;
    battle.burst(x, y, 20, { colors: ['#ffffff', '#c8e8ff', '#7ab8ff', '#ffe07a'], speed: 80, up: 30, g: 60, life: [0.2, 0.5] });
    hurtChin(LIGHTNING_HITS, x, y);
    return true;
  }

  const collider = {
    sticks: false,
    hit: (x, y) => alive() && hitTest(x, y) !== null,
    onHit: (x, y) => takeArrow(x, y),
  };

  const boss = {
    get alive() {
      return state !== 'dead';
    },
    aimPoint: () => (charge ? { x: lastChin.x, y: lastChin.y } : null),
    hit: (x, y) => alive() && hitTest(x, y) !== null,
    onArrow: (x, y) => takeArrow(x, y),
    onArea: (x0, x1) => takeArea(x0, x1),
  };

  // ------------------------------------------------------------------ render

  /** WORLD, behind the party: the gore on the floor, then the Hydra (bloating as it dies). */
  function render(ctx) {
    gore.renderBehind(ctx);
    if (popped) return;
    const b = state === 'dying' ? bloat() : 0;
    if (b <= 0) {
      drawHydra(ctx);
      return;
    }
    const e = b * b;
    const wob = Math.sin(st * (10 + 24 * b)) * 0.035 * (0.3 + b);
    const jx = b > 0.6 ? Math.round(Math.sin(t * 61)) : 0;
    const box = { x: HX - 175, y: 0, w: 280, h: GROUND_Y + 1 };
    const tint = { color: '#e0302a', a: (0.12 + 0.48 * e) * (0.85 + 0.15 * Math.sin(st * 14)) };
    drawScaled(ctx, 'hydra', box, HX + jx, GROUND_Y, 1 + 0.3 * e + wob, 1 + 0.22 * e - wob, drawHydra, tint);
  }

  /** The beast itself: body, necks, heads (the dying one's last-hit head swollen with fire). */
  function drawHydra(ctx) {
    const dying = state === 'dying';
    drawBody(ctx, HX, GROUND_Y, { breathe: Math.sin(t * (state === 'sleep' ? 1.2 : 2)) > 0.3 ? 1 : 0, t });
    const eye = state === 'sleep' ? 'closed' : dying ? 'daze' : 'open';
    const order = [2, 0, 1].filter((i) => !(dying && i === lastHead));
    if (dying) order.push(lastHead); // the swelling head in front
    for (const i of order) {
      const h = heads[i];
      const dim = i === 2 && !(dying && i === lastHead);
      drawNeck(ctx, ROOTS[i], { x: h.x + NECK_JOIN.dx, y: h.y + NECK_JOIN.dy }, { dim, rRoot: i === 1 ? 10 : 9 });
      if (dying && i === lastHead) {
        drawSwollenHead(ctx, i);
        continue;
      }
      let open = 0;
      let glow = 0;
      let e = eye;
      if (i === 1 && charge) {
        open = Math.min(1, charge.t / 0.8);
        glow = Math.min(1, charge.t / CHARGE_TIME) * 0.8 + 0.2;
      } else if (i === 1 && blast) {
        open = 1;
        glow = 1;
      } else if (i === 1 && stagger > 0) {
        open = 0.4;
        e = 'daze';
      } else if (bite && i === 0) {
        const b = bite.t;
        open = b < BITE_WIND ? 0.7 : b < BITE_WIND + BITE_LUNGE ? 1 : b < BITE_WIND + BITE_LUNGE + BITE_HOLD ? 0 : 0.2;
      } else if (spit?.head === i) {
        open = spit.t < SPIT_WIND ? 0.3 : 0.8;
        glow = spit.t < SPIT_WIND ? 0.6 : 0;
      } else if (state === 'wake' && st > 0.5 && st < 1.5) open = 0.8; // roar
      else if (dying) open = 0.5 + 0.3 * Math.sin(t * 9 + i); // wailing
      pts[i] = drawHead(ctx, h.x, h.y, -1, { open, glow, eye: e, chinHot: i === 1 && !!charge, dim, hurt: i === 1 && hurtT > 0, t });
      if (i === 1) lastChin = { x: pts[1].chinX, y: pts[1].chinY };
      if (i === order[order.length - 2]) drawForeleg(ctx, HX, GROUND_Y, t); // in front of the necks, behind the front head
    }
  }

  /** The last-hit head, swelling up with the fire inside it: glowing, cracking, mouth agape. */
  function drawSwollenHead(ctx, i) {
    const h = heads[i];
    const s = swell();
    const q = Math.min(1, st / SWELL_TIME);
    const fl = Math.sin(t * 30) > 0 ? 1 : 0.7;
    let inner = null;
    drawScaled(
      ctx,
      'head',
      { x: h.x - 24, y: h.y - 18, w: 48, h: 40 },
      h.x,
      h.y,
      s,
      s,
      (g) => {
        inner = drawHead(g, h.x, h.y, -1, { open: 0.5 + 0.5 * q, glow: 1, eye: 'open', t });
      },
      { color: '#ff7a1a', a: (0.15 + 0.4 * q) * fl },
    );
    const at = (lx, ly) => ({ x: h.x + lx * s, y: h.y + ly * s });
    pts[i] = { mouthX: h.x + (inner.mouthX - h.x) * s, mouthY: h.y + (inner.mouthY - h.y) * s, chinX: h.x + (inner.chinX - h.x) * s, chinY: h.y + (inner.chinY - h.y) * s };
    // cracks of fire splitting it, more of them as it swells
    const n = Math.min(CRACKS.length, Math.floor(q * CRACKS.length + Math.max(0, st - SWELL_TIME) * 3));
    for (let c = 0; c < n; c++) {
      const pl = CRACKS[c].map(([lx, ly]) => at(lx, ly));
      for (let k = 1; k < pl.length; k++) line(ctx, pl[k - 1].x, pl[k - 1].y, pl[k].x, pl[k].y, fl > 0.8 ? '#ffe07a' : '#ff8a2a');
      px(ctx, pl[0].x, pl[0].y, '#fff6d8');
    }
    // glowing eye
    const eyeP = at(-1, -2);
    withAlpha(ctx, 0.6, () => rect(ctx, eyeP.x - 2, eyeP.y - 1, 4, 3, '#fff6c0'));
  }

  function renderFront(ctx) {
    for (const f of fireballs) drawHydraFireball(ctx, f.x, f.y, t);
    if (blast && pts[1]) {
      const front = blastFront();
      const fade = Math.min(1, (BLAST_TIME - blast.t) / 0.4);
      if (blast.t < BLAST_TIME - 0.3) drawFireStream(ctx, pts[1].mouthX, pts[1].mouthY, pts[1].mouthX - 14, GROUND_Y - 2, t);
      drawFloorFire(ctx, front, blast.from + 10, GROUND_Y + 1, 22, t, fade);
    }
    // the exposed chin: a pulsing target bracket round it so it reads in the dark
    if (charge) {
      const { x, y } = lastChin;
      const on = Math.floor(t * 6) % 2 === 0;
      const c = on ? '#fff0a0' : '#ff8a2a';
      const w = CHIN_HALF.w + 2;
      const h = CHIN_HALF.h + 2;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        rect(ctx, x + sx * w - (sx > 0 ? 2 : 0), y + sy * h, 3, 1, c);
        rect(ctx, x + sx * w, y + sy * h - (sy > 0 ? 2 : 0), 1, 3, c);
      }
    }
    for (const tx of texts) {
      withAlpha(ctx, Math.min(1, (1 - tx.t) / 0.3), () => {
        if (tx.snore) drawText(ctx, tx.text, tx.x + tx.t * 6, tx.y - tx.t * 12, { color: '#c8c0e0', outline: '#14101c' });
        else drawText(ctx, tx.text, tx.x - measureText(tx.text) / 2, tx.y - tx.t * 10, { color: '#e8e4dc', outline: '#14101c' });
      });
    }
  }

  /** WORLD, after the party is drawn: the gore stuck to them and still flying. */
  function renderOver(ctx) {
    gore.renderFront(ctx);
  }

  /** SCREEN: the boss health bar + the charge-up warning; the flash as it bursts. */
  function renderScreen(ctx) {
    if (flash > 0) withAlpha(ctx, Math.min(1, flash / 0.35) * 0.7, () => rect(ctx, 0, 0, VIEW_W, 180, '#fff0e0'));
    if (state === 'sleep' || state === 'dead' || popped) return;
    const w = 120;
    const x = Math.round((VIEW_W - w) / 2);
    const y = 12;
    const label = 'Hydra';
    drawText(ctx, label, Math.round(VIEW_W / 2 - measureText(label) / 2), 3, { color: '#c8e8b0', outline: '#14101c' });
    rect(ctx, x - 1, y - 1, w + 2, 6, '#14101c');
    rect(ctx, x, y, w, 4, '#3a1418');
    const fill = Math.round((w * Math.max(0, hp)) / HYDRA_HITS);
    rect(ctx, x, y, fill, 4, hurtT > 0 ? '#ffffff' : '#5ec24a');
    rect(ctx, x, y, fill, 1, '#9ae86a');
    for (let i = 1; i < HYDRA_HITS; i++) if (i % 5 === 0) rect(ctx, x + Math.round((w * i) / HYDRA_HITS), y, 1, 4, '#14101c');

    if (charge) {
      const msg = 'Attack its mouth to prevent a fire blast!';
      const urgent = charge.t > CHARGE_TIME - 2 && Math.floor(t * 8) % 2 === 0;
      drawText(ctx, msg, Math.round(VIEW_W / 2 - measureText(msg) / 2), 22, { color: urgent ? '#ffffff' : '#ff9a4a', outline: '#14101c' });
      const left = Math.max(0, CHARGE_TIME - charge.t);
      const info = `Arrows ${charge.hits}/${CHIN_HITS}   ${Math.ceil(left)}`;
      drawText(ctx, info, Math.round(VIEW_W / 2 - measureText(info) / 2), 33, { color: '#fff6d8', outline: '#14101c' });
      const bw = 80;
      const bx = Math.round((VIEW_W - bw) / 2);
      rect(ctx, bx - 1, 43, bw + 2, 4, '#14101c');
      rect(ctx, bx, 44, Math.round((bw * left) / CHARGE_TIME), 2, left < 2 ? '#ff4a2a' : '#ffb03a');
    } else if (banner) {
      withAlpha(ctx, Math.min(1, (BANNER_TIME - banner.t) / 0.4), () =>
        drawText(ctx, banner.text, Math.round(VIEW_W / 2 - measureText(banner.text) / 2), 24, { color: banner.color, outline: '#14101c' }),
      );
    }
  }

  /** Light the Hydra casts in the dark: glowing eyes, the fire in its mouth, fireballs, the blast. */
  function lights() {
    // a dim glow off its own scales (it smoulders), so the beast reads in the dark
    if (popped) return flash > 0 || shake > 0.6 ? [{ x: HX - 30, y: GROUND_Y - 40, r: 150, warm: true }] : [];
    const out = [{ x: HX - 20, y: GROUND_Y - 40, r: state === 'sleep' ? 50 : 76 }];
    if (state !== 'sleep' && state !== 'dead') for (const h of heads) out.push({ x: h.x - 1, y: h.y - 2, r: 16 });
    if (state === 'dying') {
      const h = heads[lastHead];
      out.push({ x: h.x, y: h.y, r: Math.round(18 * swell()), warm: true });
      const b = bloat();
      if (b > 0) out.push({ x: HX - 20, y: GROUND_Y - 40, r: Math.round(76 + 30 * b), tint: '#ff3a2a' });
    }
    if (charge && pts[1]) out.push({ x: pts[1].mouthX, y: pts[1].mouthY, r: 14 + Math.round((charge.t / CHARGE_TIME) * 30), warm: true });
    for (const f of fireballs) out.push({ x: f.x, y: f.y, r: 20, warm: true });
    if (blast) {
      const front = blastFront();
      for (let x = front; x < blast.from; x += 40) out.push({ x, y: GROUND_Y - 10, r: 34, warm: true });
      if (pts[1]) out.push({ x: pts[1].mouthX, y: pts[1].mouthY, r: 30, warm: true });
    }
    return out;
  }

  return {
    collider,
    boss,
    get state() {
      return state;
    },
    get hp() {
      return hp;
    },
    get charging() {
      return charge ? { t: charge.t, hits: charge.hits } : null;
    },
    get biting() {
      return bite ? { t: bite.t, hit: bite.hit } : null;
    },
    get blasting() {
      return blast !== null;
    },
    get chin() {
      return { ...lastChin };
    },
    get shake() {
      return shake;
    },
    /** Debug / tools: kill it now (as if the last arrow hit head `i`). */
    forceDie(i = 1) {
      if (alive() && state !== 'sleep') kill(i);
    },
    get popped() {
      return popped;
    },
    gore,
    /** Debug / tools: start a charge-up now. */
    forceCharge() {
      if (state === 'fight' && !charge && !blast) {
        charge = { t: 0, hits: 0 };
        chargeCd = CHARGE_EVERY;
      }
    },
    update,
    render,
    renderFront,
    renderOver,
    renderScreen,
    lights,
  };
}
