import { GROUND_Y, STEP, KNIGHT_W, WALK_SPEED, MOUNTED_SPEED_MULT } from '../core/constants.js';
import { isNear } from '../core/proximity.js';
import { rect, px, line } from '../core/draw.js';

const W = 48; // sprite width (tail tip → muzzle)
const H = 39; // ear tips (local y 0) → hoof soles (local y 38)
const BODY_W = 34; // barrel width, for the proximity rule
const SADDLE_C = 24; // saddle centre, local x (symmetric: same when mirrored)
const KNIGHT_HALF = 8;
const TOSS_TIME = 0.45; // happy head toss right after the knight lands in the saddle
const HINT_TIME = 5; // s "Press space to dismount horse" stays up after mounting
const DISMOUNT_BACK = 28; // px behind the saddle he lands when hopping off
const FOLLOW_START = 56; // centre-to-centre px: horse starts walking after him beyond this
const FOLLOW_STOP = 40; // …and stops once this close
const FOLLOW_FAR = 120; // beyond this it canters to catch up
const SPAWN_GAP = 4; // carried into a new Stage: px between his right side and the horse
const BLINK_EVERY = 4.3;
const BLINK_TIME = 0.14;

const C = {
  coat: '#6b4226',
  coatL: '#835433',
  coatD: '#4e2f1a',
  coatDD: '#3a2213',
  muzzle: '#573620',
  mane: '#1c1310',
  maneL: '#33241c',
  hoof: '#1e1712',
  eye: '#0e0a08',
  blaze: '#efe4cf',
  // black tack
  leather: '#18181c',
  leatherL: '#36363e',
  blanket: '#24242a',
  blanketD: '#141418',
  trim: '#4a4a54',
  steel: '#b4bac6',
  shadow: 'rgba(20,14,10,0.3)',
  dust: '#b59a72',
};

/**
 * Horse slice: the farmer's horse. Owns its own position; modes:
 *   'standing'    by the farmer (Stage 1, not borrowed yet)
 *   'mounting'    the knight is hopping into the saddle
 *   'ridden'      drawn under the knight wherever he goes (gallop while moving, legs tucked in a
 *                 jump, dust); the player slice owns movement (1.5× speed) and Strike.
 *                 "Press space to dismount horse" above him for 5 s after mounting; Space → hop
 *                 off, unless a "Press space to …" Prompt offers something else (a sign, a ladder).
 *   'dismounting' he is hopping down behind the horse
 *   'following'   walks after him (canters when far behind), stops a little short of him
 * Standing or following + knight near (proximity rule) + NOT near the farmer (talking takes
 * precedence) + no Dialogue → Prompt "Press space to mount horse"; Interact → mount.
 * carryState() is what the next Stage needs: null | 'mounted' | 'following'.
 * Update AFTER the farmer (reads farmer.near) and the player.
 *
 * @param {import('../core/stage.js').World} world
 * @param {{
 *   x?:number,  // centre x while standing (Stage 1); unused when carried
 *   carried?:null|'mounted'|'following',  // from game.carry.horse: arrive ridden / spawn right of him
 *   prompts:{show(text:string, worldX:number, topY:number):void},
 *   dialogue:{isOpen():boolean},
 *   farmer?:{readonly near:boolean},
 *   yieldTo?:{readonly near:boolean}[],  // more things whose Interact wins over mounting (e.g. a sign)
 *   player:{startMount(toX:number, facing:number, onDone:()=>void):void, startDismount(toX:number, onDone:()=>void):void, seat():void},
 *   maxX?:()=>number,  // furthest right (sprite left edge) it follows him to (default: the world's edge)
 * }} opts
 * @returns {{update(dt:number):void, render(ctx:CanvasRenderingContext2D):void, carryState():null|'mounted'|'following'}}
 *   render: WORLD coords, before the player
 */
export function createHorse(world, { x = 0, carried = null, prompts, dialogue, farmer = null, yieldTo = [], player, maxX = () => Infinity }) {
  const others = [farmer, ...yieldTo].filter(Boolean);
  const k0 = world.knight;
  let mode = 'standing';
  let hx = Math.round(x - W / 2); // sprite left edge (float while walking)
  let facing = 1;
  let moving = false; // legs cycling (ridden on the ground, or following)
  let gait = 1; // leg-cycle speed factor
  let followWalking = false;
  let t = 0;
  let gallopT = 0;
  let tossT = 0;
  let hintT = 0;
  let wasOnGround = true;
  const dust = [];

  if (carried === 'mounted') {
    mode = 'ridden';
    player.seat();
    hx = Math.round(k0.x) + KNIGHT_HALF - SADDLE_C;
  } else if (carried === 'following') {
    mode = 'following';
    hx = Math.round(k0.x + KNIGHT_W + SPAWN_GAP);
    facing = -1; // looking at him
  }

  function puff(wx, n) {
    for (let i = 0; i < n; i++) {
      dust.push({
        x: wx + (Math.random() - 0.5) * 6,
        y: GROUND_Y - 1,
        vx: (Math.random() - 0.5) * 30,
        vy: -10 - Math.random() * 18,
        life: 0.25 + Math.random() * 0.2,
      });
    }
  }

  // following, it never goes past maxX() (sprite left edge): e.g. it waits outside Stage 5's plaza
  const clampX = (v) => Math.max(0, Math.min(world.worldWidth - W, maxX(), v));

  function follow(dt, k) {
    const dx = k.x + KNIGHT_HALF - (hx + W / 2);
    const dist = Math.abs(dx);
    if (dist > FOLLOW_START) followWalking = true;
    if (dist <= FOLLOW_STOP) followWalking = false;
    if (followWalking) {
      const speed = dist > FOLLOW_FAR ? WALK_SPEED * MOUNTED_SPEED_MULT : WALK_SPEED;
      hx = clampX(hx + Math.sign(dx) * Math.min(speed * dt, dist - FOLLOW_STOP));
      facing = Math.sign(dx) || facing;
      moving = true;
      gait = speed / (WALK_SPEED * MOUNTED_SPEED_MULT);
    } else {
      moving = false;
      if (dist > 6) facing = Math.sign(dx); // keeps an eye on him
    }
  }

  function tryMount(k, input) {
    if (!k.controlsEnabled || dialogue.isOpen() || others.some((o) => o.near)) return;
    if (k.y < GROUND_Y - 1) return; // up on a ledge (or mid-jump) above it
    const cx = hx + W / 2;
    if (!isNear(k, cx, BODY_W)) return;
    prompts.show('Press space to mount horse', cx, GROUND_Y - H);
    if (!input.wasPressed('interact')) return;
    mode = 'mounting';
    moving = false;
    hx = Math.round(hx);
    player.startMount(hx + SADDLE_C - KNIGHT_HALF, facing, () => {
      mode = 'ridden';
      tossT = TOSS_TIME;
      hintT = HINT_TIME;
      puff(hx + SADDLE_C, 4);
    });
  }

  function update(dt) {
    t += dt;
    if (tossT > 0) tossT = Math.max(0, tossT - dt);
    const { knight: k, input } = world;

    for (let i = dust.length - 1; i >= 0; i--) {
      const d = dust[i];
      d.life -= dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 40 * dt;
      if (d.life <= 0) dust.splice(i, 1);
    }

    if (mode === 'ridden') {
      hx = Math.round(k.x) + KNIGHT_HALF - SADDLE_C;
      facing = k.facing;
      moving = k.vx !== 0 && k.onGround;
      gait = 1;
      if (k.onGround && !wasOnGround) puff(k.x + KNIGHT_HALF, 6); // landing
      wasOnGround = k.onGround;

      if (hintT > 0) {
        hintT -= dt;
        if (!world.exitNear) prompts.show('Press space to dismount horse', k.x + KNIGHT_HALF, k.y - k.height, { interact: false });
      }
      if (k.controlsEnabled && k.onGround && !dialogue.isOpen() && input.wasPressed('interact') && !world.interactable) {
        mode = 'dismounting';
        hintT = 0;
        moving = false;
        const toX = Math.max(4, Math.min(world.worldWidth - KNIGHT_W - 4, k.x - facing * DISMOUNT_BACK));
        player.startDismount(toX, () => {
          mode = 'following';
          puff(k.x + KNIGHT_HALF, 3);
        });
      }
    } else if (mode === 'following') {
      follow(dt, k);
      tryMount(k, input);
    } else if (mode === 'standing') {
      tryMount(k, input);
    }

    gallopT = moving ? gallopT + dt * gait : 0;
    if (moving && Math.floor(gallopT / STEP) % 9 === 0) puff(hx + W / 2 - facing * 14, 1);
  }

  function carryState() {
    if (mode === 'ridden' || mode === 'mounting') return 'mounted';
    if (mode === 'following' || mode === 'dismounting') return 'following';
    return null;
  }

  function render(ctx) {
    const k = world.knight;
    const ridden = mode === 'ridden';
    const f = facing;
    const ox = Math.round(hx);
    const groundOff = ridden ? Math.round(k.y) - GROUND_Y : 0; // < 0 while jumping
    const oy = GROUND_Y - H + groundOff;
    const inAir = ridden && !k.onGround;
    const galloping = gallopT > 0;
    const mounting = mode === 'mounting';
    const idle = mode === 'standing' || (mode === 'following' && !moving);

    const P = (lx, ly, w, h, c) => rect(ctx, f === 1 ? ox + lx : ox + W - lx - w, oy + ly, w, h, c);
    const D = (lx, ly, c) => P(lx, ly, 1, 1, c);
    const X1 = (lx) => (f === 1 ? ox + lx : ox + W - 1 - lx);
    /** `size`-px-wide line between local points (mirrored for facing −1). */
    const Ln = (size, x0, y0, x1, y1, c) => {
      const X = (lx) => (f === 1 ? ox + lx : ox + W - size - lx);
      line(ctx, X(Math.round(x0)), oy + Math.round(y0), X(Math.round(x1)), oy + Math.round(y1), c, size);
    };
    /** Rows of [x0, x1] spans starting at local y0. */
    const spans = (y0, rows, dy, c) => rows.forEach(([a, b], i) => P(a, y0 + i + dy, b - a + 1, 1, c));
    const dots = (pts, dy, c) => pts.forEach(([x, y]) => D(x, y + dy, c));

    // body bob: gallop rocks the barrel, idle breathes
    const gf = Math.floor(gallopT * 10) % 4;
    const bob = galloping ? (gf === 1 || gf === 2 ? -1 : 0) : Math.sin(t * 1.9) > 0.6 ? 1 : 0;
    const toss = tossT > 0 ? (tossT > TOSS_TIME * 0.4 ? -3 : -1) : 0;
    const graze = idle && t % 9 > 7.2 ? 2 : 0; // dips its head now and then
    const hd = (galloping ? bob : 0) + toss + graze; // head / upper-neck offset
    const blink = t % BLINK_EVERY < BLINK_TIME;

    // shadow (shrinks while airborne)
    const sw = inAir ? 24 : 38;
    rect(ctx, ox + (W - sw) / 2, GROUND_Y, sw, 1, C.shadow);

    // --- legs: [x, colour, phase, hind]; far legs darker, drawn first. Thick muscled tops
    //     (gaskin / forearm), slimmer cannons, flared hooves.
    const legs = [
      [10, C.coatDD, 0, true],
      [31, C.coatDD, Math.PI, false],
      [14, C.coatD, Math.PI * 0.5, true],
      [35, C.coat, Math.PI * 1.5, false],
    ];
    for (const [lx, c, ph, hind] of legs) {
      // Articulated leg, angles from straight down (+ = towards the head):
      //   upper (gaskin / forearm) swings from the hip / shoulder; lower (cannon) bends at the
      //   knee / hock. Front knees fold the hoof back; hind hocks flex the cannon forward.
      let up = 0;
      let bend = 0;
      let planted = true;
      if (inAir) {
        const b = Math.max(0, Math.min(1, 0.5 - k.vy / 380)); // tucked rising, unbending falling
        up = (hind ? -0.35 : 0.35) * b;
        bend = b;
        planted = false;
      } else if (galloping) {
        const ang = gallopT * 14 + ph;
        const amp = (hind ? 0.4 : 0.45) * (0.7 + 0.3 * gait);
        up = Math.sin(ang) * amp; // whole leg swings fore and aft
        const swing = Math.cos(ang); // > 0: leg travelling forward, off the ground
        bend = swing > 0 ? swing * (hind ? 0.9 : 1.2) : 0;
        planted = swing <= 0;
      } else if (!hind && toss) {
        up = 0.25; // light rear on the head toss
        bend = 0.7;
        planted = false;
      }
      const low = hind ? up + bend * 0.8 : up - bend;
      const hipX = lx + (hind ? 0.5 : 0.5);
      const hipY = 25 + bob;
      const kneeX = hipX + Math.sin(up) * 6;
      const kneeY = hipY + Math.cos(up) * 6;
      let footX = kneeX + Math.sin(low) * 6;
      let footY = kneeY + Math.cos(low) * 6;
      if (planted) footY = 36; // stance: the hoof stays on the ground
      footY = Math.min(36, footY);
      // muscle mass where the leg meets the body (moves a little with the swing)
      const sx = Math.round(Math.sin(up) * 1.5);
      if (hind) P(lx - 1 + sx, 23 + bob, 5, 4, c);
      else P(lx + sx, 23 + bob, 4, 4, c);
      Ln(4, hipX - 0.5, hipY, kneeX - 0.5, kneeY, c); // gaskin / forearm
      Ln(3, kneeX, kneeY, footX, footY, c); // cannon
      P(footX, footY, 3, 1, C.coatDD); // fetlock
      P(footX, footY + 1, 4, 2, C.hoof);
    }

    // --- tail (behind the rump), swishes
    const sw2 = Math.round(Math.sin(t * (galloping ? 9 : 1.6)) * (galloping ? 2 : 1.5));
    const up = galloping || inAir ? -3 : 0;
    P(5, 15 + bob, 3, 3, C.mane);
    P(3, 18 + bob + up, 3, 4, C.mane);
    P(2 + Math.min(0, sw2), 22 + bob + up, 3, 4, C.mane);
    P(2 + sw2, 26 + bob + up, 3, 3, C.mane);
    P(2 + sw2, 29 + bob + up, 2, 2, C.maneL);
    D(4, 19 + bob + up, C.maneL);
    if (up) P(1, 19 + bob + up, 2, 3, C.mane);

    // --- barrel: high rounded croup, dip under the saddle, chest running up into the neck,
    //     belly curving down to the girth and tucking up into the flank
    spans(14, [[10, 17], [8, 21], [7, 40], [6, 40], [6, 40], [6, 40], [6, 40], [6, 40], [7, 39]], bob, C.coat);
    spans(23, [[7, 16], [8, 15], [9, 14]], bob, C.coat); // haunch / thigh
    spans(23, [[20, 39], [23, 38], [25, 36]], bob, C.coat); // belly → chest
    P(25, 25 + bob, 12, 1, C.coatD); // underside of the belly
    P(23, 24 + bob, 2, 1, C.coatD);
    dots([[17, 22], [18, 22], [19, 22], [20, 23], [21, 23], [22, 23]], bob, C.coatD); // flank tuck
    P(11, 14 + bob, 6, 1, C.coatL); // croup / back / withers catch the light
    P(9, 15 + bob, 4, 1, C.coatL);
    P(20, 16 + bob, 11, 1, C.coatL);
    P(31, 17 + bob, 4, 1, C.coatL);
    // haunch: big rounded muscle with a stifle crease in front of it
    P(10, 17 + bob, 5, 1, C.coatL);
    P(9, 18 + bob, 6, 2, C.coatL);
    P(10, 20 + bob, 4, 1, C.coatL);
    dots([[16, 17], [17, 18], [17, 19], [17, 20], [16, 21], [16, 22], [15, 23]], bob, C.coatD);
    P(6, 18 + bob, 1, 7, C.coatD); // rump edge
    dots([[8, 24], [9, 25]], bob, C.coatD); // buttock crease
    // shoulder: muscle mass with a crease behind it, chest front
    P(32, 18 + bob, 4, 1, C.coatL);
    P(31, 19 + bob, 6, 2, C.coatL);
    P(32, 21 + bob, 4, 1, C.coatL);
    dots([[30, 17], [30, 18], [29, 19], [29, 20], [29, 21], [29, 22], [30, 23], [31, 24]], bob, C.coatD);
    P(40, 17 + bob, 1, 5, C.coatD); // chest front
    P(39, 22 + bob, 1, 2, C.coatD);
    dots([[22, 21], [24, 22], [26, 21]], bob, C.coatD); // ribs under the skin

    // --- neck: thick, arched crest (upper rows move with the head, base with the body)
    const neck = [[36, 40], [35, 41], [34, 41], [33, 41], [32, 41], [31, 41], [30, 40], [30, 40], [29, 40], [29, 40], [29, 40], [29, 40]];
    spans(4, neck, hd, C.coat);
    spans(9, neck.slice(5), bob, C.coat);
    dots([[35, 5], [34, 6], [33, 7], [32, 8]], hd, C.coatL); // crest highlight
    dots([[35, 8], [34, 9], [34, 10], [33, 11], [33, 12], [32, 13]], hd, C.coatL); // neck muscle
    P(40, 9 + hd, 1, 6, C.coatD); // throat
    dots([[41, 7], [41, 8]], hd, C.coatD);

    // --- head: broad forehead, strong jaw, muzzle angled down-forward
    spans(1, [[37, 40], [36, 41], [36, 42], [37, 43], [37, 44], [38, 45], [39, 46], [40, 47], [41, 47], [41, 47], [42, 46]], hd, C.coat);
    P(38, 4 + hd, 2, 2, C.coatL); // cheek
    dots([[37, 8], [38, 9], [39, 9], [40, 10], [41, 11]], hd, C.coatD); // jaw line
    P(42, 9 + hd, 6, 2, C.muzzle);
    P(42, 11 + hd, 5, 1, C.muzzle);
    dots([[41, 2], [41, 3], [42, 4], [43, 5], [44, 6], [45, 7], [46, 8], [42, 3], [43, 4]], hd, C.blaze); // blaze
    D(46, 9 + hd, C.eye); // nostril
    P(44, 11 + hd, 2, 1, C.coatDD); // mouth
    D(40, 4 + hd, blink ? C.coatD : C.eye);
    D(39, 3 + hd, C.coatD); // brow
    // ears (the near one flicks)
    const flick = Math.sin(t * 0.7) > 0.93 ? 1 : 0;
    P(39, 0 + hd, 1, 2, C.coatD);
    P(37, -1 + hd + flick, 2, 2, C.coat);
    D(37, -1 + hd + flick, C.coatD);

    // --- mane along the crest + forelock
    for (let y = 1; y <= 15; y++) {
      const mx = Math.round(36 - (y - 1) * 0.5);
      P(mx - 2, y + (y < 10 ? hd : bob), 3, 1, y % 3 === 0 ? C.maneL : C.mane);
    }
    P(39, 1 + hd, 2, 2, C.mane);
    if (galloping) P(27, 9 + hd + (gf % 2), 2, 2, C.mane); // flowing back

    // --- tack (black): bridle, reins, blanket, saddle, girth, stirrup
    line(ctx, X1(39), oy + 2 + hd, X1(41), oy + 9 + hd, C.leather, 1);
    P(41, 8 + hd, 4, 1, C.leather); // noseband
    D(43, 10 + hd, C.trim); // bit ring
    const rein = ridden ? 0 : 2; // slack when no one holds them
    line(ctx, X1(42), oy + 10 + hd, X1(30), oy + 15 + bob + rein, C.leather, 1);
    P(17, 16 + bob, 14, 4, C.blanket);
    P(17, 19 + bob, 14, 1, C.blanketD);
    P(17, 20 + bob, 14, 1, C.trim);
    P(18, 15 + bob, 12, 2, C.leather); // seat
    P(19, 15 + bob, 10, 1, C.leatherL);
    P(18, 13 + bob, 2, 2, C.leather); // cantle
    P(29, 13 + bob, 2, 2, C.leather); // pommel
    P(27, 21 + bob, 2, 5, C.leather); // girth
    if (!ridden && !mounting) {
      P(23, 21 + bob, 1, 5, C.leather);
      P(22, 26 + bob, 3, 1, C.steel);
    }

    for (const d of dust) px(ctx, d.x, d.y, d.life > 0.15 ? C.dust : C.coatD);
  }

  return {
    update,
    render,
    carryState,
    /** Debug / tools: the horse's centre x and mode. */
    get x() {
      return hx + W / 2;
    },
    get mode() {
      return mode;
    },
  };
}
