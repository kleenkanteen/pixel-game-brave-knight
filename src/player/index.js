import {
  GROUND_Y,
  KNIGHT_W,
  KNIGHT_H,
  WALK_SPEED,
  MOUNTED_SPEED_MULT,
  JUMP_VY,
  GRAVITY,
  STRIKE_TIME,
} from '../core/constants.js';
import { rect } from '../core/draw.js';
import { drawKnight, SHOULDER } from './art.js';

const CLIMB_TIME = 1.6;
const HOLD_ARM = 0.6; // arm angle (rad, 0 = forward, + = down) while holding the sword
const HOLD_SWORD = -1.0; // sword angle while held (pointing up-forward)
const MOUNT_CROUCH = 0.12; // s: crouch before the hop onto the horse
const MOUNT_HOP = 0.38; // s: the hop arc itself
const MOUNT_ARC = 16; // px the hop rises above the saddle line
/** Seated: the knight is drawn this many px higher than his feet (= the horse's hooves). */
export const SEAT_LIFT = 19;
/** Mounted: horse reach either side of the knight's body, for the world bounds. */
const MOUNTED_MARGIN = 20;
/** Bow carried at rest: arm angle (pointing forward-down, the bow upright in his hand). */
const BOW_REST = 0.7;
const LADDER_SPEED = 46; // px/s up or down a ladder
const LADDER_SNAP = 0.12; // s to step across onto the ladder
export const HURT_TIME = 0.35; // s the red hurt flash lasts (knight.hurtT, set by whoever hurts him)
const HURT_RED = '#ff2a1a';
const RAGE_RED = '#ff3a12';

/**
 * Player slice: the Brave Knight — movement, climb-out, poses, drawing.
 *
 * Public state object `knight` (shared as `world.knight`):
 *   x, y            x = LEFT edge of the body, y = feet (GROUND_Y when standing)
 *   facing          1 (right) | −1 (left)
 *   width, height   KNIGHT_W × KNIGHT_H
 *   hasSword        set by the sword slice
 *   hasBow          set by the bow slice
 *   weapon          the weapon in hand: null | 'sword' | 'bow' (set by the sword / bow slices)
 *   aimAngle        bow angle in radians, facing-relative (0 = forward, − = up), set by the bow slice
 *   drawPull        0..1 how far the bowstring is drawn (0 = not drawing)
 *   aimFacing       0, or 1 / −1 while drawing the bow: he faces his aim even when running the other way
 *   autoWalk        0, or 1 / −1: walks that way on his own, ignoring the world bounds (leaving /
 *                   entering a Stage)
 *   boundR          right clamp for knight.x this tick (differs on foot / mounted)
 *   blockedRight    true while he pushes right against boundR
 *   controlsEnabled set by the intro once he is out of the grave
 *   strikeT         seconds left in the current Strike (sword slice sets it to STRIKE_TIME)
 *   handX, handY    world pixel of the front hand this frame (sword slice draws the held sword here)
 *   swordAngle      held-sword angle in radians, facing-relative (0 = forward, − = up)
 *   visible         false until the climb starts
 *   mounted         true once he is in the saddle (horse slice draws the horse under him);
 *                   y stays on the hooves' ground line, he is drawn SEAT_LIFT higher
 *   lift            px he is drawn above y this frame (0 on foot, SEAT_LIFT seated, arcs while mounting)
 *   onLadder        true while climbing a ladder (startLadder)
 *   hurtT           s left of the red hurt flash (battle sets it via hurt())
 *   rageT           s left of a Potion of Rage (rage slice): a red fiery outline radiates off him
 *
 * @param {import('../core/stage.js').World} world
 * @param {{spawnX:number, maxX:number, emergeY?:number, floorAt?:(x:number, y:number)=>number}} opts
 *   spawnX = grave centre; maxX = right clamp for knight.x (on foot AND mounted);
 *   floorAt(x, y) = the y of the floor under world x for feet at y (a one-way ledge returns its top
 *   when y is at or above it; default GROUND_Y everywhere) — he walks off edges and lands on ledges;
 *   emergeY = top of the grave mound: during the climb he is hidden below this line (so he
 *   rises OUT of the mound), and the line drops to the ground as he steps off it in the pull-up.
 */
export function createPlayer(world, { spawnX, maxX: maxX0, emergeY = GROUND_Y, floorAt = () => GROUND_Y }) {
  let maxX = maxX0;
  const knight = {
    x: Math.round(spawnX - KNIGHT_W / 2),
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    onGround: true,
    facing: 1,
    width: KNIGHT_W,
    height: KNIGHT_H,
    hasSword: false,
    hasBow: false,
    weapon: null,
    aimAngle: 0,
    drawPull: 0,
    aimFacing: 0,
    autoWalk: 0,
    boundR: maxX,
    pushVx: 0, // px/s of knockback (decays; knockback())
    blockedRight: false,
    controlsEnabled: false,
    strikeT: 0,
    handX: 0,
    handY: 0,
    swordAngle: HOLD_SWORD,
    visible: false,
    mounted: false,
    lift: 0,
    onLadder: false,
    hurtT: 0,
    rageT: 0,
  };

  let mode = 'hidden'; // 'hidden' | 'climb' | 'free' | 'hop' (onto / off the horse) | 'ladder'
  let hop = null; // {t, fromX, toX, fromLift, toLift, onDone}
  let ladder = null; // {t, fromX, toX, toY, onDone}
  let ladderT = 0; // climbing time (arm cycle)
  let climbT = 0;
  let onClimbDone = null;
  let walkT = 0;
  let maskY = GROUND_Y; // climb mask line (nothing drawn below it)
  let t = 0;
  let pose = null;
  const dirt = []; // climb particles

  function startClimb(onDone) {
    mode = 'climb';
    climbT = 0;
    onClimbDone = onDone;
    knight.visible = true;
    knight.y = GROUND_Y + KNIGHT_H;
  }

  function startHop(toX, fromLift, toLift, onDone) {
    mode = 'hop';
    hop = { t: 0, fromX: knight.x, toX, fromLift, toLift, onDone };
    knight.controlsEnabled = false;
    knight.mounted = false;
    knight.height = KNIGHT_H;
    knight.vx = 0;
    knight.vy = 0;
    knight.y = GROUND_Y;
    knight.onGround = true;
    knight.strikeT = 0;
  }

  /** Hop onto the saddle: knight.x ends at `toX`, facing `facing`. Controls are off meanwhile. */
  function startMount(toX, facing, onDone) {
    knight.facing = facing;
    startHop(toX, 0, SEAT_LIFT, () => {
      seat();
      onDone?.();
    });
  }

  /** Hop off the saddle down to the ground at `toX`. */
  function startDismount(toX, onDone) {
    startHop(toX, SEAT_LIFT, 0, onDone);
  }

  /**
   * Climb a ladder: steps across so his body centres on world x `ladderX`, then climbs (up or
   * down) until his feet are at `toY`. Controls are off meanwhile; on arrival he stands there.
   */
  function startLadder(ladderX, toY, onDone) {
    mode = 'ladder';
    ladder = { t: 0, fromX: knight.x, toX: Math.round(ladderX - KNIGHT_W / 2), toY, onDone };
    knight.controlsEnabled = false;
    knight.onLadder = true;
    knight.vx = 0;
    knight.vy = 0;
    knight.strikeT = 0;
  }

  function updateLadder(dt) {
    ladder.t += dt;
    const p = Math.min(1, ladder.t / LADDER_SNAP);
    knight.x = ladder.fromX + (ladder.toX - ladder.fromX) * p;
    if (p < 1) return;
    const dy = ladder.toY - knight.y;
    const step = LADDER_SPEED * dt;
    ladderT += dt;
    if (Math.abs(dy) > step) {
      knight.y += Math.sign(dy) * step;
      return;
    }
    knight.y = ladder.toY;
    knight.onGround = true;
    knight.onLadder = false;
    knight.controlsEnabled = true;
    mode = 'free';
    const done = ladder.onDone;
    ladder = null;
    done?.();
  }

  /** Start already out of the grave with controls on (Stages after the first). */
  function spawn() {
    mode = 'free';
    knight.visible = true;
    knight.controlsEnabled = true;
    knight.y = GROUND_Y;
  }

  /** Put him straight in the saddle (no animation), e.g. arriving mounted in a new Stage. */
  function seat() {
    knight.mounted = true;
    knight.lift = SEAT_LIFT;
    knight.height = KNIGHT_H + SEAT_LIFT;
  }

  function updateHop(dt) {
    hop.t += dt;
    const crouch = hop.toLift > hop.fromLift ? MOUNT_CROUCH : 0.04; // no wind-up needed to hop down
    const p = Math.min(1, Math.max(0, hop.t - crouch) / MOUNT_HOP);
    const e = p * p * (3 - 2 * p); // smoothstep across
    knight.x = hop.fromX + (hop.toX - hop.fromX) * e;
    // parabola from the start line to the end line
    knight.lift = hop.fromLift + (hop.toLift - hop.fromLift) * p + MOUNT_ARC * 4 * p * (1 - p);
    if (p >= 1) {
      mode = 'free';
      knight.x = hop.toX;
      knight.lift = hop.toLift;
      knight.controlsEnabled = true;
      const done = hop.onDone;
      hop = null;
      done?.();
    }
  }

  function move(dt) {
    const { input } = world;
    let dir = 0;
    if (knight.autoWalk) dir = knight.autoWalk;
    else if (knight.controlsEnabled) {
      if (input.isDown('left')) dir -= 1;
      if (input.isDown('right')) dir += 1;
      if (knight.onGround && input.wasPressed('jump')) {
        knight.vy = JUMP_VY;
        knight.onGround = false;
      }
    }
    knight.vx = dir * WALK_SPEED * (knight.mounted ? MOUNTED_SPEED_MULT : 1);
    if (knight.aimFacing) knight.facing = knight.aimFacing;
    else if (dir) knight.facing = dir;

    const lo = knight.mounted ? MOUNTED_MARGIN : 4;
    const hi = knight.mounted ? Math.min(maxX, world.worldWidth - KNIGHT_W - MOUNTED_MARGIN) : maxX;
    knight.boundR = hi;
    const nx = knight.x + (knight.vx + knight.pushVx) * dt;
    knight.pushVx *= Math.exp(-(knight.onGround ? 9 : 2) * dt); // a shove dies out (fast once he lands)
    if (Math.abs(knight.pushVx) < 2) knight.pushVx = 0;
    knight.x = knight.autoWalk ? nx : Math.max(lo, Math.min(hi, nx));
    knight.blockedRight = !knight.autoWalk && dir > 0 && knight.x >= hi;
    const cx = knight.x + KNIGHT_W / 2;
    // walked off the edge of a ledge: drop
    if (knight.onGround && knight.y < floorAt(cx, knight.y) - 0.5) {
      knight.onGround = false;
      knight.vy = 0;
    }
    if (!knight.onGround) {
      const prevY = knight.y;
      knight.vy += GRAVITY * dt;
      knight.y += knight.vy * dt;
      const floor = floorAt(cx, Math.min(prevY, knight.y)); // a ledge only catches him from above
      if (knight.vy >= 0 && knight.y >= floor) {
        knight.y = floor;
        knight.vy = 0;
        knight.onGround = true;
      }
    }
    walkT = dir && knight.onGround ? walkT + dt : 0;
  }

  function updateClimb(dt) {
    climbT += dt;
    const p = Math.min(1, climbT / CLIMB_TIME);
    let depth;
    if (p < 0.7) {
      const q = p / 0.7;
      depth = Math.round(24 - 18 * (1 - (1 - q) * (1 - q)));
    } else {
      depth = Math.round(6 * (1 - (p - 0.7) / 0.3));
    }
    knight.y = GROUND_Y + depth;
    maskY = p < 0.7 ? emergeY : Math.round(emergeY + (GROUND_Y - emergeY) * ((p - 0.7) / 0.3));

    if (p < 0.9 && Math.random() < 0.5) {
      dirt.push({
        x: knight.x + 2 + Math.random() * 12,
        y: maskY - 1,
        vx: (Math.random() - 0.5) * 50,
        vy: -30 - Math.random() * 50,
        life: 0.4 + Math.random() * 0.3,
      });
    }
    if (p >= 1) {
      mode = 'free';
      knight.y = GROUND_Y;
      const done = onClimbDone;
      onClimbDone = null;
      done?.();
    }
  }

  /** Build this frame's pose and expose the hand position. */
  function computePose() {
    let bodyDy = 0;
    let legs = [
      { x: 5, lift: 0 },
      { x: 8, lift: 0 },
    ];
    let backArm = 'down';
    let frontArm = 'down';
    let plumeSway = 0;

    if (mode === 'ladder') {
      // hand over hand up the rungs, legs stepping
      const alt = Math.floor(ladderT * 6) % 2;
      backArm = { hx: 4, hy: 1 + alt * 3 };
      frontArm = { hx: 11, hy: 4 - alt * 3 };
      legs = [
        { x: 5, lift: alt ? 2 : 0 },
        { x: 9, lift: alt ? 0 : 2 },
      ];
    } else if (mode === 'hop') {
      if (hop.t < (hop.toLift > hop.fromLift ? MOUNT_CROUCH : 0.04)) {
        bodyDy = 1; // crouch, winding up
        legs = [
          { x: 4, lift: 1 },
          { x: 9, lift: 1 },
        ];
      } else {
        legs = [
          { x: 4, lift: 2 },
          { x: 9, lift: 3 },
        ];
        backArm = { hx: 2, hy: 6 };
        plumeSway = 1;
      }
    } else if (knight.mounted) {
      // seated: rides the gallop / bounces with the horse, legs astride
      legs = 'seated';
      if (!knight.onGround) {
        bodyDy = knight.vy < 0 ? 0 : 1;
        plumeSway = knight.vy < 0 ? 1 : 0;
      } else if (walkT > 0) {
        const f = Math.floor(walkT * 10) % 4;
        bodyDy = f === 1 || f === 2 ? -1 : 0;
        plumeSway = f % 2;
      } else {
        bodyDy = Math.sin(t * 2.4) > 0.55 ? 1 : 0;
      }
    } else if (mode === 'climb') {
      const p = climbT / CLIMB_TIME;
      if (p < 0.7) {
        // reaching up, arms alternating as he hauls himself out
        const alt = Math.floor(climbT * 7) % 2;
        backArm = { hx: 3, hy: 2 + alt * 2 };
        frontArm = { hx: 11, hy: 4 - alt * 2 };
      } else {
        // pull-up: hands planted on the ground either side, body crouched
        const depth = knight.y - GROUND_Y;
        bodyDy = 1;
        backArm = { hx: 0, hy: 23 - depth };
        frontArm = { hx: 14, hy: 23 - depth };
        legs = [
          { x: 4, lift: 1 },
          { x: 9, lift: 2 },
        ];
      }
    } else if (!knight.onGround) {
      bodyDy = 0;
      legs = knight.vy < 0 ? [{ x: 5, lift: 2 }, { x: 9, lift: 1 }] : [{ x: 4, lift: 1 }, { x: 9, lift: 2 }];
      plumeSway = knight.vy < 0 ? 1 : 0;
    } else if (walkT > 0) {
      const f = Math.floor(walkT * 8) % 4;
      legs = [
        [{ x: 4, lift: 0 }, { x: 9, lift: 0 }],
        [{ x: 6, lift: 1 }, { x: 7, lift: 0 }],
        [{ x: 9, lift: 0 }, { x: 4, lift: 0 }],
        [{ x: 7, lift: 0 }, { x: 6, lift: 1 }],
      ][f];
      bodyDy = f % 2 === 1 ? -1 : 0;
      plumeSway = f % 2;
    } else {
      bodyDy = Math.sin(t * 2.4) > 0.55 ? 1 : 0; // subtle breathing
    }

    // Bow: front arm stretched along the aim holding the grip; back hand draws the string.
    if (mode === 'free' && knight.weapon === 'bow' && knight.hasBow) {
      const a = knight.drawPull > 0 ? knight.aimAngle : BOW_REST;
      knight.aimAngle = a;
      const reach = knight.drawPull > 0 ? 5 : 4;
      const hx = Math.round(SHOULDER.x + Math.cos(a) * reach);
      const hy = Math.round(SHOULDER.y + bodyDy + Math.sin(a) * reach);
      frontArm = { hx, hy };
      if (knight.drawPull > 0) {
        const back = 2 + knight.drawPull * 5; // string hand slides back as he draws
        backArm = { hx: Math.round(hx - Math.cos(a) * back), hy: Math.round(hy - Math.sin(a) * back) };
      }
    }

    // Sword hold / Strike: front arm swings around the shoulder.
    if (mode === 'free' && knight.hasSword && knight.weapon === 'sword') {
      let armA = HOLD_ARM;
      let swordA = HOLD_SWORD;
      if (knight.strikeT > 0) {
        const p = 1 - knight.strikeT / STRIKE_TIME;
        const e = 1 - (1 - p) * (1 - p);
        armA = -1.3 + 2.4 * e;
        swordA = -2.2 + 2.7 * e;
      }
      const hx = Math.round(SHOULDER.x + Math.cos(armA) * 4);
      const hy = Math.round(SHOULDER.y + bodyDy + Math.sin(armA) * 4);
      frontArm = { hx, hy };
      knight.swordAngle = swordA;
    }

    pose = { bodyDy, legs, backArm, frontArm, plumeSway };

    const ox = Math.round(knight.x);
    const oy = Math.round(knight.y - knight.lift) - KNIGHT_H;
    if (frontArm !== 'down') {
      knight.handX = knight.facing === 1 ? ox + frontArm.hx + 1 : ox + KNIGHT_W - 2 - frontArm.hx;
      knight.handY = oy + frontArm.hy + 1;
    } else {
      knight.handX = knight.facing === 1 ? ox + 11 : ox + 4;
      knight.handY = oy + 17 + bodyDy;
    }
  }

  function update(dt) {
    t += dt;
    if (knight.strikeT > 0) knight.strikeT = Math.max(0, knight.strikeT - dt);
    knight.hurtT = Math.max(0, knight.hurtT - dt);
    if (mode === 'climb') updateClimb(dt);
    else if (mode === 'hop') updateHop(dt);
    else if (mode === 'ladder') updateLadder(dt);
    else if (mode === 'free') move(dt);

    for (let i = dirt.length - 1; i >= 0; i--) {
      const d = dirt[i];
      d.life -= dt;
      d.vy += GRAVITY * 0.6 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.life <= 0 || d.y > GROUND_Y) dirt.splice(i, 1);
    }
    computePose();
  }

  /** Draws in WORLD coordinates (stage applies the camera translate). */
  function render(ctx) {
    if (!knight.visible) return;
    if (!pose) computePose();
    const ox = Math.round(knight.x);
    const oy = Math.round(knight.y - knight.lift) - KNIGHT_H;

    if (mode === 'climb') {
      // mask: nothing below the ground line until he has risen
      ctx.save();
      ctx.beginPath();
      ctx.rect(ox - 24, oy - 48, KNIGHT_W + 48, maskY - (oy - 48));
      ctx.clip();
      drawKnight(ctx, ox, oy, knight.facing, pose);
      ctx.restore();
    } else {
      if (knight.rageT > 0) drawRageOutline(ctx, ox, oy);
      drawKnight(ctx, ox, oy, knight.facing, pose);
      if (knight.hurtT > 0) {
        // red hurt flash: the knight's own silhouette washed red, fading out
        const a = Math.min(1, knight.hurtT / HURT_TIME) * 0.75;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.drawImage(silhouette(HURT_RED), ox - SIL_PAD, oy - SIL_PAD);
        ctx.restore();
      }
    }

    for (const d of dirt) rect(ctx, d.x, d.y, 1, 1, d.life > 0.25 ? '#6b4a2e' : '#4a3220');
  }

  // ------------------------------------------------------------- silhouettes (hurt flash, rage)

  const SIL_PAD = 4; // px of room round the 16×24 sprite (the plume, a raised arm)
  const silCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;

  /** This frame's knight sprite as a flat silhouette of `color` (an offscreen canvas). */
  function silhouette(color) {
    const c = silCanvas;
    c.width = KNIGHT_W + SIL_PAD * 2;
    c.height = KNIGHT_H + SIL_PAD * 2;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    drawKnight(g, SIL_PAD, SIL_PAD, knight.facing, pose);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  /** Potion of Rage: a flickering red outline radiating off his silhouette (behind the sprite). */
  function drawRageOutline(ctx, ox, oy) {
    const sil = silhouette(RAGE_RED);
    const pulse = Math.sin(t * 18) > 0 ? 1 : 0;
    ctx.save();
    ctx.globalAlpha = 0.45;
    for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2 - pulse], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.drawImage(sil, ox - SIL_PAD + dx, oy - SIL_PAD + dy);
    }
    ctx.globalAlpha = 0.9;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(sil, ox - SIL_PAD + dx, oy - SIL_PAD + dy);
    ctx.restore();
  }

  /** Red hurt flash (call when a monster hits him). */
  function hurt() {
    knight.hurtT = HURT_TIME;
  }

  /** Knocked back: shoved at vx px/s (dies out) and, if on the ground, hopped up at vy (negative = up). */
  function knockback(vx, vy = 0) {
    knight.pushVx = vx;
    if (vy && knight.onGround && mode === 'free') {
      knight.vy = vy;
      knight.onGround = false;
    }
  }

  /** Move the right clamp for knight.x (e.g. once a boss blocking the way is gone). */
  function setMaxX(x) {
    maxX = x;
    knight.boundR = x;
  }

  return { knight, startClimb, spawn, startMount, startDismount, startLadder, seat, hurt, knockback, setMaxX, update, render };
}
