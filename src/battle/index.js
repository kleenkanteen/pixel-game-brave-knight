import { GROUND_Y, STRIKE_TIME, VIEW_W, VIEW_H } from '../core/constants.js';
import { drawText, measureText } from '../core/font.js';
import { rect, px, withAlpha } from '../core/draw.js';
import { createParticles, burst } from './particles.js';
import { createDamageNumbers, drawHealthBar } from './hud.js';
import { createFireballs } from './fireballs.js';
import { createAllies } from './allies.js';
import { createMonsters } from './monsters.js';
import { HURT_TIME } from '../player/index.js';

const MAX_HP = 100;
const PLAYER_DAMAGE = 10; // a zombie (30 HP) takes 3 sword hits or 3 arrows
const FIREBALL_DAMAGE = 8;
const SWORD_REACH = 22; // px in front of the knight's centre that a Strike reaches
const SWORD_BEHIND = 4; // …and this far behind it (point-blank)
const SWORD_REACH_MOUNTED = 30; // on horseback: out past the horse's head
const SWORD_BEHIND_MOUNTED = 12; // …and down over the horse's shoulder
const RAGE_MULT = 5; // Potion of Rage: the Brave Knight's own hits do 5× damage
const WIN_DELAY = 1.2; // s after the last monster falls before onWon()
const BAR_GAP = 3; // px between a head and the bottom of its health bar
const FALLEN_LINES = ['You have fallen'];
const FALLEN_IN = 0.5; // s the fallen screen takes to fade in (the button works once it's up)
const AUTO_RESTART = 4; // s after he falls: the Stage restarts by itself (or click Restart sooner)
const BTN = { w: 64, h: 18, label: 'Restart' };
BTN.x = Math.round((VIEW_W - BTN.w) / 2);
BTN.y = 100;

/**
 * Battle slice: three fellow adventurers (Archer, Mage, Holy Knight) fighting five monsters
 * (three Zombies, a Werewolf, a Dark Mage at the back) — already under way when the Stage begins.
 *   - Every hero (the three + the Brave Knight) has 100 HP and a health bar above the head.
 *     The allies never drop below 1 HP (they hold the line); at 0 the Brave Knight falls: "You have
 *     fallen" and a Restart button → onRestart() when clicked,
 *     or by itself AUTO_RESTART s after he falls (a countdown under the button).
 *   - Monsters go for the closest hero. The Brave Knight can only be targeted (and hurt) once he
 *     has walked in and while no Dialogue is open.
 *   - His Strike hits EVERY monster in front of him within reach; an arrow (bow slice, via
 *     `collider`, which doesn't keep the arrow) hits the one monster it strikes. Either does
 *     PLAYER_DAMAGE: 3 hits fell a zombie (allies need 10).
 *   - When every monster is down: onWon() once, WIN_DELAY s later and with no Dialogue open
 *     (not if he has fallen).
 *   - Allies call out now and then, floating above their heads for 4 s: the Archer "Wind!" when an
 *     arrow misses, the Mage "Ow, my cloak!" when hit, the Holy Knight "Come back here, you
 *     overgrown puppy!" when the Werewolf leaps back.
 *   - Emits 'monster:hit' {monster, damage}, 'monster:defeated' {monster}, 'hero:hurt' {hero, damage},
 *     'battle:won'.
 * Listens for 'sword:strike', so it must be updated AFTER the sword slice.
 *
 * @param {import('../core/stage.js').World} world
 * @param {{
 *   allies:{archer:number, mage:number, holy:number},            // centre x of each ally
 *   monsters:{zombies:number[], werewolf:number, darkMage:number}  // Stage 3's pack (starting centre x)
 *           | {kind:string, x:number}[],  // or a roster: cave-monsters.js, castle-monsters.js, 'werewolf'
 *   dialogue:{isOpen():boolean},
 *   following?:boolean,  // the allies start out following him (a Stage after the battle)
 *   floorAt?:(x:number, y:number)=>number,  // floor under world x (a ledge); default GROUND_Y
 *   ledge?:{x0:number, x1:number, y:number, ladderX:number},  // allies climb its ladder after him
 *   onWon:()=>void,
 *   onRestart:()=>void,  // the Restart button on the fallen screen
 * }} opts
 * @returns {{
 *   collider:{hit(x:number, y:number):boolean, onHit(x:number, y:number, vx?:number):void, sticks:false},
 *   readonly heroes:object[], readonly monsters:object[], readonly won:boolean, readonly fallen:boolean,
 *   update(dt:number):void,
 *   render(ctx:CanvasRenderingContext2D):void,        // WORLD: vortexes on the ground, monsters, allies (before the player)
 *   renderFront(ctx:CanvasRenderingContext2D):void,   // WORLD: projectiles, fireballs, particles, health bars, numbers
 *   renderScreen(ctx:CanvasRenderingContext2D):void,  // SCREEN: the fallen screen + Restart button
 * }}
 */
export function createBattle(world, { allies: allyXs, monsters: monsterXs, dialogue, onWon, onRestart, following = false, floorAt = () => GROUND_Y, ledge = null }) {
  const k = world.knight;
  const particles = createParticles();
  const numbers = createDamageNumbers();
  /** The Brave Knight as a combatant (position mirrored from world.knight every tick). y = feet. */
  const player = { kind: 'player', name: 'Brave Knight', x: k.x + k.width / 2, y: k.y, w: 12, h: k.height, hp: MAX_HP, maxHp: MAX_HP, hurtT: 0 };
  /** A boss fought alongside the roster (setBoss): keeps the fight going while alive. */
  let boss = null;
  let t = 0;
  let won = false;
  let wonT = 0;
  let fallen = false;
  let fallenT = 0;
  let strikePending = false;
  let btnHover = false;
  let restarting = false;
  let blessT = 0; // s of double damage left (Blessed Touch)

  const combat = {
    player,
    particles,
    worldWidth: world.worldWidth,
    floorAt,
    ledge,
    /** World x range the allies keep to while following (setAllyBounds: a gate shut behind them). */
    allyBounds: { lo: -Infinity, hi: Infinity },
    rallyX: null, // a spot the following allies run to (a boss's safe zone), or null
    fireballs: null,
    aliveEnemies: () => monsters.list.filter((e) => !e.dead),
    targetableHeroes,
    /** Closest targetable hero; floorOnly → only those standing on the floor (not up a ledge). */
    closestHero(x, floorOnly = false) {
      let best = null;
      for (const h of targetableHeroes()) {
        if (floorOnly && h.y < GROUND_Y - 4) continue;
        if (!best || Math.abs(h.x - x) < Math.abs(best.x - x)) best = h;
      }
      return best;
    },
    /** The boss's weak spot while it's exposed ({x, y}), else null — the Archer shoots at it. */
    bossTarget: () => (boss && boss.alive ? boss.aimPoint() : null),
    /** An ally's arrow at (x, y): true (and the boss takes it) if it struck the boss. */
    bossArrow(x, y, vx) {
      if (!boss || !boss.alive || !boss.hit(x, y)) return false;
      boss.onArrow(x, y, vx);
      return true;
    },
    enemyAt,
    damageEnemy,
    damageHero,
    say: (kind, text) => allies.say(kind, text),
  };
  combat.fireballs = createFireballs({
    particles,
    onExplode(x, r) {
      for (const h of targetableHeroes()) if (Math.abs(h.x - x) <= r + h.w / 2 - 2) damageHero(h, FIREBALL_DAMAGE);
    },
  });
  const allies = createAllies(combat, allyXs);
  const monsters = createMonsters(combat, monsterXs);
  if (following) allies.setFollow(true);

  world.events.on('sword:strike', () => {
    strikePending = true;
  });

  function playerTargetable() {
    return !fallen && k.visible && k.x > 0 && !dialogue.isOpen();
  }

  function targetableHeroes() {
    return playerTargetable() ? [player, ...allies.list] : allies.list;
  }

  function footY(e) {
    return GROUND_Y - (e.air || 0);
  }

  /** The living monster whose body contains (x, y), if any. */
  function enemyAt(x, y) {
    for (const e of monsters.list) {
      if (e.dead) continue;
      const fy = footY(e);
      if (Math.abs(x - e.x) <= e.w / 2 && y <= fy && y >= fy - e.h) return e;
    }
    return null;
  }

  function damageEnemy(e, dmg, dir, knock, fromPlayer = false) {
    if (e.dead) return;
    if (blessT > 0) dmg *= 2;
    const raging = fromPlayer && k.rageT > 0;
    if (raging) dmg *= RAGE_MULT;
    e.hp = Math.max(0, e.hp - dmg);
    e.hurtT = 0.25;
    e.awake = true;
    if (!e.leap) e.kvx = dir * knock * (e.knockMul ?? (e.kind === 'werewolf' ? 0.6 : e.kind === 'darkMage' ? 0.7 : 1));
    numbers.add(e.x, footY(e) - e.h - 10, `-${dmg}`, raging ? '#ff5a3a' : blessT > 0 ? '#fff27a' : '#ffd27a');
    world.events.emit('monster:hit', { monster: e, damage: dmg });
    if (e.hp <= 0) {
      e.dead = true;
      e.dieT = 0;
      monsters.onDefeated(e);
      world.events.emit('monster:defeated', { monster: e });
    }
  }

  const ARCHER_HIT_GAP = 20; // s without being attacked before he complains again
  let lastArcherHit = -Infinity;

  function damageHero(h, dmg) {
    if (h === player) {
      if (fallen) return;
      h.hp = Math.max(0, h.hp - dmg);
    } else h.hp = Math.max(1, h.hp - dmg); // allies hold the line
    h.hurtT = 0.3;
    if (h === player) k.hurtT = HURT_TIME; // the red hurt flash
    if (h.kind === 'mage') allies.say('mage', 'Ow, my cloak!');
    if (h.kind === 'archer') {
      // first hit after 20 s without one
      if (world.time - lastArcherHit >= ARCHER_HIT_GAP) allies.say('archer', 'Leave the cap alone!');
      lastArcherHit = world.time;
    }
    numbers.add(h.x, h.y - h.h - 12, `-${dmg}`, '#ff6a5a');
    world.events.emit('hero:hurt', { hero: h, damage: dmg });
    if (h === player && h.hp <= 0) {
      fallen = true;
      k.controlsEnabled = false;
      k.strikeT = 0;
    }
  }

  /** A Strike connects partway through the swing: every monster in reach in front of him. */
  function resolveStrike() {
    if (!strikePending) return;
    if (k.strikeT > STRIKE_TIME * 0.55 && k.strikeT > 0) return;
    strikePending = false;
    const cx = k.x + k.width / 2;
    const f = k.facing;
    // mounted, the blade sweeps from high in the saddle all the way down to the ground and
    // past the horse's head, so anything under (or in front of) his sword is hit
    const reach = k.mounted ? SWORD_REACH_MOUNTED : SWORD_REACH;
    const behind = k.mounted ? SWORD_BEHIND_MOUNTED : SWORD_BEHIND;
    const lo = f === 1 ? cx - behind : cx - reach;
    const hi = f === 1 ? cx + reach : cx + behind;
    // on foot the blade sweeps from a little above his head down to his knees (jump clean over them and it misses)
    const top = k.y - k.lift - 30;
    const bottom = k.mounted ? k.y : k.y - k.lift - 4;
    for (const e of combat.aliveEnemies()) {
      const fy = footY(e);
      if (fy < top || fy - e.h > bottom) continue;
      if (e.x + e.w / 2 >= lo && e.x - e.w / 2 <= hi) damageEnemy(e, PLAYER_DAMAGE, f, 110, true);
    }
  }

  const collider = {
    sticks: false,
    hit: (x, y) => enemyAt(x, y) !== null,
    onHit(x, y, vx) {
      const e = enemyAt(x, y);
      if (e) damageEnemy(e, PLAYER_DAMAGE, Math.sign(vx ?? e.x - player.x) || 1, 70, true);
    },
  };

  function update(dt) {
    t += dt;
    blessT = Math.max(0, blessT - dt);
    player.x = k.x + k.width / 2;
    player.y = k.y;
    player.h = k.height;
    player.hurtT = Math.max(0, player.hurtT - dt);
    resolveStrike();
    const fighting = combat.aliveEnemies().length > 0 || !!boss?.alive;
    allies.update(dt, fighting);
    monsters.update(dt);
    combat.fireballs.update(dt);
    particles.update(dt);
    numbers.update(dt);
    if (fallen) updateFallen(dt);

    if (!won && !fighting && !fallen) {
      wonT += dt;
      if (wonT >= WIN_DELAY && !dialogue.isOpen()) {
        won = true;
        world.events.emit('battle:won');
        onWon();
      }
    }
  }

  function updateFallen(dt) {
    fallenT += dt;
    if (!restarting && fallenT >= AUTO_RESTART) {
      restarting = true;
      onRestart();
      return;
    }
    const { mouse } = world.input;
    btnHover = mouse.x >= BTN.x && mouse.x < BTN.x + BTN.w && mouse.y >= BTN.y && mouse.y < BTN.y + BTN.h;
    if (fallenT < FALLEN_IN || restarting || !world.input.wasClicked()) return;
    world.input.consumeClick();
    if (!btnHover) return;
    restarting = true;
    onRestart();
  }

  function render(ctx) {
    combat.fireballs.renderGround(ctx, t);
    monsters.renderGround(ctx);
    monsters.render(ctx);
    allies.render(ctx);
  }

  function renderFront(ctx) {
    allies.renderFx(ctx);
    combat.fireballs.renderAir(ctx, t);
    monsters.renderFx(ctx);
    particles.render(ctx);
    for (const a of allies.list) drawHealthBar(ctx, a.x, a.y - a.h - BAR_GAP - 1, a.hp, a.maxHp);
    // centred on the sprite's own rounded x (+8), so bar and knight move as one (height includes the saddle)
    if (k.visible) drawHealthBar(ctx, Math.round(k.x) + k.width / 2, Math.round(k.y) - k.height - BAR_GAP, player.hp, player.maxHp);
    for (const e of monsters.list) {
      if (!e.dead && e.hp < e.maxHp) drawHealthBar(ctx, e.x, footY(e) - e.h - BAR_GAP - 2, e.hp, e.maxHp, { enemy: true });
    }
    numbers.render(ctx);
    allies.renderBarks(ctx, world.camera.x, world.camera.viewW ?? VIEW_W);
  }

  function renderScreen(ctx) {
    if (!fallen) return;
    withAlpha(ctx, Math.min(1, fallenT / FALLEN_IN), () => {
      withAlpha(ctx, 0.6, () => rect(ctx, 0, 0, VIEW_W, VIEW_H, '#14101c'));
      FALLEN_LINES.forEach((line, i) => {
        drawText(ctx, line, Math.round((VIEW_W - measureText(line)) / 2), 66 + i * 12, { color: i === 0 ? '#e0533e' : '#f4efe2', outline: '#14101c' });
      });
      drawButton(ctx);
      if (!restarting) {
        const msg = `Restarting in ${Math.max(1, Math.ceil(AUTO_RESTART - fallenT))}...`;
        drawText(ctx, msg, Math.round((VIEW_W - measureText(msg)) / 2), BTN.y + BTN.h + 8, { color: '#8a8098', outline: '#14101c' });
      }
    });
  }

  /** Bevelled Restart button (gold face, brighter on hover, pressed once clicked). */
  function drawButton(ctx) {
    const down = restarting ? 1 : 0;
    const { w, h, label } = BTN;
    const x = BTN.x;
    const y = BTN.y + down;
    const face = restarting ? '#b8923c' : btnHover ? '#f2d466' : '#e0b53a';
    rect(ctx, x + 1, BTN.y + 2, w, h - down, 'rgba(0,0,0,0.5)'); // drop shadow
    rect(ctx, x + 1, y, w - 2, h, '#14101c');
    rect(ctx, x, y + 1, w, h - 2, '#14101c');
    rect(ctx, x + 1, y + 1, w - 2, h - 2, face);
    rect(ctx, x + 1, y + 1, w - 2, 1, '#fff0a0');
    rect(ctx, x + 1, y + h - 2, w - 2, 1, '#8a6418');
    px(ctx, x + 1, y + 1, face);
    drawText(ctx, label, x + Math.round((w - measureText(label)) / 2), y + Math.round((h - 7) / 2), { color: '#2a1c12' });
  }

  /**
   * Every living monster overlapping world x range [x0, x1] takes `dmg` (knocked away from `fromX`);
   * a boss with onArea(x0, x1) gets a say too (the Hydra takes a Lightning Strike down its open mouth).
   */
  function damageArea(x0, x1, dmg, fromX) {
    let n = 0;
    if (boss?.alive && boss.onArea?.(x0, x1, dmg)) n++;
    for (const e of combat.aliveEnemies()) {
      if (e.x + e.w / 2 < x0 || e.x - e.w / 2 > x1) continue;
      damageEnemy(e, dmg, Math.sign(e.x - fromX) || 1, 60);
      n++;
    }
    return n;
  }

  /** Every hero gains `frac` of their max HP (a "+20" floats up). Returns the heroes healed. */
  function heal(frac) {
    const healed = [];
    for (const h of [player, ...allies.list]) {
      if (h === player && (fallen || !k.visible)) continue;
      const amt = Math.round(h.maxHp * frac);
      h.hp = Math.min(h.maxHp, h.hp + amt);
      numbers.add(h.x, h.y - h.h - 12, `+${amt}`, '#7ef07a');
      healed.push(h);
    }
    return healed;
  }

  return {
    collider,
    /** Abilities (abilities/ slice): the allies' poses + shots, area damage, healing, the double-damage boon. */
    perform: (kind, faceX) => allies.perform(kind, faceX),
    shootAt: (tx, opts) => allies.shootAt(tx, opts),
    ally: (kind) => allies.list.find((a) => a.kind === kind),
    damageArea,
    heal,
    /** Double damage (every hero) for `seconds`. */
    bless(seconds) {
      blessT = Math.max(blessT, seconds);
    },
    get blessT() {
      return blessT;
    },
    /**
     * Fight a boss alongside the roster: {alive, aimPoint():{x,y}|null, hit(x,y):boolean,
     * onArrow(x,y,vx):void, onArea?(x0,x1,dmg):boolean}. The battle isn't won while it lives; the Archer shoots at its
     * aimPoint (when it shows one) and her arrows that hit() it go to onArrow().
     */
    setBoss(b) {
      boss = b;
    },
    /** Any hero (incl. the Brave Knight) takes `dmg` — for a boss's attacks. */
    damageHero: (h, dmg) => damageHero(h, dmg),
    /** Targetable heroes right now (he isn't while a Dialogue is open or once fallen). */
    targetableHeroes: () => targetableHeroes(),
    /** Floating damage text at world (x, y). */
    number: (x, y, text, color) => numbers.add(x, y, text, color),
    /** true → the three allies follow the Brave Knight in a line, spaced apart. */
    setFollow: (on) => allies.setFollow(on),
    /** Keep the following allies inside world x [lo, hi] (e.g. a gate has shut behind them). */
    setAllyBounds(lo, hi = Infinity) {
      combat.allyBounds = { lo, hi };
    },
    /** The following allies run to world x and huddle there (e.g. a boss attack's safe zone); null: follow again. */
    setRally(x) {
      combat.rallyX = x;
    },
    /** A monster joins the fight now (awake): a roster entry, e.g. {kind:'shade', side:'left', …}. */
    spawnMonster: (spec) => monsters.spawn(spec),
    /** A monster drops dead on the spot, no damage number (e.g. minions when their master falls). */
    slay(e) {
      if (e.dead) return;
      e.hp = 0;
      e.dead = true;
      e.dieT = 0;
      monsters.onDefeated(e);
      world.events.emit('monster:defeated', { monster: e });
    },
    burst: (x, y, n, opts) => burst(particles, x, y, n, opts),
    particle: (p) => particles.add(p),
    get player() {
      return player;
    },
    get heroes() {
      return [player, ...allies.list];
    },
    get monsters() {
      return monsters.list;
    },
    get won() {
      return won;
    },
    get fallen() {
      return fallen;
    },
    update,
    render,
    renderFront,
    renderScreen,
  };
}
