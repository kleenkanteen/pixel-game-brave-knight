// The three fellow adventurers, drawn in code (16 px wide, feet on footY, facing right in local
// coords): the Archer, the Mage and the Holy Knight. Internal to the battle slice.
import { disc, withAlpha } from '../core/draw.js';
import { painter } from './paint.js';

const DARK = '#14101c';

// ---------------------------------------------------------------- Archer

const A = {
  hat: '#3e8a3a',
  hatD: '#2a6228',
  hatL: '#62b452',
  feather: '#c8323c',
  skin: '#e8b890',
  skinD: '#c08a64',
  hair: '#7a4a24',
  tunic: '#4a9a3e',
  tunicD: '#2e6e2a',
  tunicL: '#74c858',
  belt: '#6b4428',
  gold: '#e8c547',
  hose: '#2e4a24',
  boot: '#4a3020',
  quiver: '#7a5230',
  fletch: '#f0ebe0',
  bow: '#8a5a2e',
  bowL: '#b88444',
  string: '#e8e2d0',
  shaft: '#a07a4a',
  head: '#c9d0dc',
};

/**
 * @param {{bob?:number, pull?:number}} pose  pull 0..1 = how far the string is drawn
 */
export function drawArcher(ctx, cx, footY, f, { bob = 0, pull = 0 } = {}) {
  const ox = Math.round(cx - 8);
  const oy = footY - 24;
  const { P, D, L } = painter(ctx, ox, oy, 16, f);
  const b = bob;

  // quiver on his back, fletchings poking out
  P(2, 8 + b, 2, 9, A.quiver);
  P(2, 8 + b, 1, 9, A.belt);
  P(2, 6 + b, 1, 2, A.fletch);
  P(3, 5 + b, 1, 3, A.fletch);
  D(3, 5 + b, A.feather);
  D(1, 6 + b, A.fletch);

  // back arm hanging (when not drawing)
  if (pull <= 0) {
    P(5, 11 + b, 2, 5, A.tunicD);
    P(5, 16 + b, 2, 1, A.skinD);
  }

  // legs + boots
  P(5, 19, 2, 3, A.hose);
  P(9, 19, 2, 3, A.hose);
  P(4, 22, 3, 2, A.boot);
  P(9, 22, 3, 2, A.boot);

  // tunic with a jagged hem, belt, quiver strap
  P(4, 10 + b, 8, 9, A.tunic);
  P(4, 10 + b, 8, 1, A.tunicL);
  P(4, 11 + b, 1, 8, A.tunicD);
  P(4, 18 + b, 8, 1, A.tunicD);
  D(5, 19 + b, A.tunicD);
  D(8, 19 + b, A.tunic);
  D(10, 19 + b, A.tunicD);
  P(4, 15 + b, 8, 1, A.belt);
  D(8, 15 + b, A.gold);
  L(5, 10 + b, 10, 14 + b, A.belt);

  // head
  P(5, 5 + b, 6, 5, A.skin);
  P(5, 9 + b, 6, 1, A.skinD);
  P(4, 5 + b, 2, 4, A.hair);
  D(9, 6 + b, DARK);
  D(10, 8 + b, A.skinD);
  D(11, 7 + b, A.skin); // nose

  // pointed green hat, tip trailing back, red feather
  P(4, 4 + b, 9, 1, A.hatD);
  P(5, 3 + b, 7, 1, A.hat);
  P(4, 2 + b, 6, 1, A.hat);
  P(3, 1 + b, 4, 1, A.hat);
  P(2, 0 + b, 2, 1, A.hatD);
  P(5, 2 + b, 3, 1, A.hatL);
  D(8, 1 + b, A.feather);
  D(9, 0 + b, A.feather);
  D(10, -1 + b, A.feather);
  D(9, 1 + b, '#8e1f2b');

  // bow: an arc in front, grip in the front hand
  const gx = 13; // grip column
  const gy = 13 + b;
  for (let y = -8; y <= 8; y++) {
    const x = gx + Math.round(2 * (1 - (y / 8) ** 2));
    D(x, gy + y, Math.abs(y) < 3 ? A.bowL : A.bow);
  }
  const hand = Math.round(gx - 1 - pull * 6);
  if (pull > 0) {
    L(gx, gy - 8, hand, gy, A.string);
    L(gx, gy + 8, hand, gy, A.string);
    // nocked arrow
    L(hand, gy, gx + 4, gy, A.shaft);
    D(gx + 4, gy, A.head);
    D(gx + 5, gy, A.head);
    D(hand, gy - 1, A.fletch);
  } else {
    P(gx, gy - 7, 1, 15, A.string);
  }

  // front arm out to the grip
  L(10, 11 + b, gx, gy, A.tunic, 2);
  P(gx, gy - 1, 1, 2, A.skin);
  // back arm drawing the string (over the body)
  if (pull > 0) {
    L(7, 11 + b, hand, gy, A.tunicD, 2);
    P(hand, gy - 1, 1, 2, A.skinD);
  }
}

// ---------------------------------------------------------------- Mage

const M = {
  cloak: '#c8a8e8',
  cloakL: '#e4d2f6',
  cloakD: '#9e80c8',
  cloakDD: '#7a5ca6',
  trim: '#f6eeff',
  skin: '#f2c8a4',
  skinD: '#cc9a7c',
  blush: '#ec9c90',
  hair: '#f0d47c',
  hairD: '#c8a450',
  lips: '#d0707a',
  boot: '#5a3a5e',
  staff: '#7a5232',
  staffL: '#a0743e',
  staffD: '#4e321c',
  gold: '#e8c547',
  orbD: '#2a6cc8',
  orb: '#4aa2f0',
  orbL: '#a6dcff',
  glow: '#5ab4ff',
};

/** World position of the mage's orb for a pose (kept in sync with drawMage). */
export function mageOrb(cx, footY, f, { bob = 0, cast = 0 } = {}) {
  const ox = Math.round(cx - 8);
  const sx = 13 + Math.round(cast * 2);
  return { x: f === 1 ? ox + sx : ox + 15 - sx, y: footY - 24 - 1 + bob - Math.round(cast * 2) };
}

/**
 * @param {{bob?:number, cast?:number, t?:number}} pose  cast 0..1 = staff thrust forward, orb flaring
 */
export function drawMage(ctx, cx, footY, f, { bob = 0, cast = 0, t = 0 } = {}) {
  const ox = Math.round(cx - 8);
  const oy = footY - 24;
  const { P, D, L } = painter(ctx, ox, oy, 16, f);
  const b = bob;
  const push = Math.round(cast * 2);
  const lift = Math.round(cast * 2);

  // cloak: widens toward the hem, hem sways
  const sway = Math.round(Math.sin(t * 2.2));
  for (let y = 10; y <= 22; y++) {
    const l = 4 - Math.floor((y - 10) / 5) + (y > 19 ? sway : 0);
    const r = 11 + Math.floor((y - 10) / 6) + (y > 19 ? sway : 0);
    const yy = y + (y < 20 ? b : 0);
    P(l, yy, r - l + 1, 1, M.cloak);
    P(l, yy, 2, 1, M.cloakD);
    D(r, yy, M.trim);
    D(8, yy, M.cloakD); // fold
  }
  P(2 + sway, 22, 12, 1, M.cloakDD);
  P(6, 23, 2, 1, M.boot);
  P(9, 23, 2, 1, M.boot);
  // golden sash
  P(5, 16 + b, 7, 1, M.gold);
  D(6, 17 + b, M.gold);
  D(6, 18 + b, M.hairD);

  // hood + face + hair
  P(5, 1 + b, 6, 1, M.cloakL);
  P(4, 2 + b, 8, 1, M.cloak);
  P(3, 3 + b, 9, 7, M.cloak);
  P(3, 3 + b, 2, 7, M.cloakD);
  P(5, 2 + b, 3, 1, M.cloakL);
  P(7, 4 + b, 4, 5, M.skin); // face
  P(8, 9 + b, 2, 1, M.skin); // chin
  P(11, 3 + b, 1, 6, M.cloakD); // hood rim
  D(11, 6 + b, M.skin); // nose tip
  P(7, 3 + b, 4, 1, M.hair); // fringe
  D(7, 4 + b, M.hair);
  D(8, 4 + b, M.hairD);
  P(6, 4 + b, 1, 7, M.hair); // long hair down out of the hood
  P(7, 5 + b, 1, 4, M.hair);
  D(6, 11 + b, M.hairD);
  D(9, 5 + b, DARK); // eye (2 px tall)
  D(9, 6 + b, DARK);
  D(8, 7 + b, M.blush);
  D(10, 8 + b, M.lips); // mouth
  D(9, 10 + b, M.gold); // brooch

  // staff (in front of her), forked head cradling the orb
  const sx = 13 + push;
  const top = 2 + b - lift;
  P(sx, top + 1, 1, 23 - top - 1, M.staff);
  for (let y = top + 3; y < 23; y += 4) D(sx, y, M.staffD);
  D(sx, top + 2, M.staffL);
  D(sx - 1, top, M.staff);
  D(sx + 1, top, M.staff);
  D(sx - 2, top - 1, M.staffL);
  D(sx + 2, top - 1, M.staffL);
  D(sx - 2, top - 2, M.gold);
  D(sx + 2, top - 2, M.gold);

  // sleeve to the staff
  L(9, 11 + b, sx - 1, 13 + b - lift, M.cloakL, 2);
  P(sx - 1, 12 + b - lift, 2, 2, M.skin);

  // the orb: soft glow, rim, bright core
  const o = mageOrb(cx, footY, f, { bob, cast });
  const pulse = 0.5 + 0.5 * Math.sin(t * 5);
  withAlpha(ctx, 0.12 + 0.08 * pulse + cast * 0.25, () => disc(ctx, o.x, o.y, 5 + Math.round(cast * 3), M.glow));
  withAlpha(ctx, 0.25 + 0.15 * pulse + cast * 0.3, () => disc(ctx, o.x, o.y, 3 + Math.round(cast * 2), M.glow));
  disc(ctx, o.x, o.y, 2, M.orbD);
  disc(ctx, o.x, o.y, 1, M.orb);
  ctx.fillStyle = M.orbL;
  ctx.fillRect(o.x - 1, o.y - 1, 1, 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(o.x, o.y - 1, 1, 1);
  // twinkle
  if ((t * 1.7) % 1 < 0.18 || cast > 0.3) {
    withAlpha(ctx, 0.9, () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(o.x + 2, o.y - 3, 1, 1);
      ctx.fillRect(o.x + 1, o.y - 3, 3, 1);
      ctx.fillRect(o.x + 2, o.y - 4, 1, 3);
    });
  }
}

// ---------------------------------------------------------------- Holy Knight

const H = {
  steel: '#5a6274',
  steelD: '#3c4252',
  steelDD: '#272b37',
  steelL: '#8a94a8',
  gold: '#e8c547',
  goldD: '#a87f22',
  goldL: '#fff0a0',
  tabard: '#ece6d6',
  tabardD: '#bdb4a0',
  shield: '#2c3e74',
  shieldL: '#41579a',
  shieldD: '#1c2850',
  blade: '#e6ebf4',
  bladeD: '#8a92a4',
  grip: '#4a3020',
};

/**
 * @param {{bob?:number, swing?:number, sheathed?:boolean}} pose  swing 0..1 = progress of a sword
 *   swing (0 = idle); sheathed = the sword rests in its scabbard at his hip, arm at his side
 */
export function drawHolyKnight(ctx, cx, footY, f, { bob = 0, swing = 0, sheathed = false } = {}) {
  const ox = Math.round(cx - 8);
  const oy = footY - 24;
  const { P, D, L } = painter(ctx, ox, oy, 16, f);
  const b = bob;


  // legs: dark greaves, gold knee cops
  P(5, 19, 3, 4, H.steelD);
  P(9, 19, 3, 4, H.steel);
  D(6, 20, H.goldD);
  D(10, 20, H.gold);
  P(4, 23, 4, 1, DARK);
  P(9, 23, 4, 1, DARK);

  // torso: dark plate, gold-trimmed sides, white tabard with a gold cross
  P(4, 11 + b, 8, 8, H.steel);
  P(4, 11 + b, 8, 1, H.steelL);
  P(4, 11 + b, 1, 8, H.goldD);
  P(11, 11 + b, 1, 8, H.gold);
  P(5, 12 + b, 6, 7, H.tabard);
  P(5, 12 + b, 1, 7, H.tabardD);
  P(7, 13 + b, 2, 4, H.gold);
  P(6, 14 + b, 4, 1, H.gold);
  P(5, 18 + b, 6, 1, H.steelDD);
  D(8, 18 + b, H.gold);
  // pauldrons with gold rims
  P(3, 10 + b, 4, 2, H.steelD);
  P(3, 11 + b, 4, 1, H.goldD);

  // great helm: gold band + crest, cross-shaped visor
  P(5, 1 + b, 6, 1, H.steel);
  P(4, 2 + b, 8, 8, H.steel);
  P(4, 2 + b, 1, 8, H.steelD);
  P(5, 2 + b, 3, 1, H.steelL);
  P(8, 0 + b, 2, 1, H.gold);
  P(8, 1 + b, 1, 3, H.goldD);
  P(7, 5 + b, 5, 1, DARK);
  P(9, 4 + b, 1, 4, DARK);
  P(4, 9 + b, 8, 1, H.gold);
  D(11, 9 + b, H.goldL);
  P(5, 10 + b, 6, 1, H.steelDD); // gorget

  if (sheathed) {
    // scabbard at his back hip, angled down and back, hilt sticking up and forward over the belt
    L(3, 18 + b, 0, 23, H.grip, 2);
    D(0, 23, H.gold); // chape
    P(2, 17 + b, 3, 1, H.gold); // crossguard
    D(4, 16 + b, H.grip); // grip
    D(5, 15 + b, H.grip);
    D(6, 14 + b, H.goldL); // pommel
    // empty sword arm hangs at his side (behind the shield)
    P(6, 12 + b, 2, 5, H.steelD);
    P(6, 17 + b, 2, 2, H.steelDD);
  } else drawSwordArm();

  // kite shield in front: deep blue, gold rim, gold cross
  const sy = 11 + b;
  HOLY_SHIELD_ROWS.forEach(([l, r], i) => {
    P(l, sy + i, r - l + 1, 1, H.shield);
    D(l, sy + i, H.gold);
    D(r, sy + i, H.goldD);
  });
  P(10, sy, 5, 1, H.goldL);
  D(12, sy + 10, H.gold);
  P(10, sy + 1, 1, 3, H.shieldL);
  P(12, sy + 2, 1, 6, H.gold);
  P(11, sy + 4, 3, 1, H.gold);
  D(12, sy + 4, H.goldL);
  P(14, sy + 1, 1, 7, H.shieldD);

  // sword arm (behind the shield): swings from over his head down in front
  function drawSwordArm() {
  let armA = -1.25;
  let swordA = -1.45;
  if (swing > 0 && swing < 0.35) {
    const w = swing / 0.35; // wind-up: raise it further back
    armA = -1.25 - 0.6 * w;
    swordA = -1.45 - 0.8 * w;
  } else if (swing >= 0.35) {
    const s = ((swing - 0.35) / 0.65) ** 0.6; // chop down in front
    armA = -1.85 + 2.6 * s;
    swordA = -2.25 + 3.0 * s;
  }
  const shX = 7;
  const shY = 12 + b;
  const hx = shX + Math.cos(armA) * 5;
  const hy = shY + Math.sin(armA) * 5;
  L(shX, shY, hx, hy, H.steelD, 2);
  const sdx = Math.cos(swordA);
  const sdy = Math.sin(swordA);
  for (let i = 1; i <= 11; i++) {
    const c = i === 1 ? H.gold : i === 11 ? H.bladeD : H.blade;
    D(hx + sdx * i, hy + sdy * i, c);
    if (i > 1 && i < 10) D(hx + sdx * i - sdy * 0.8, hy + sdy * i + sdx * 0.8, H.bladeD);
  }
  D(hx - sdy, hy + sdx, H.gold); // crossguard
  D(hx + sdy, hy - sdx, H.gold);
  P(hx, hy, 2, 2, H.steelDD); // gauntlet
  // swoosh while the blade comes down
  if (swing > 0.45 && swing < 0.9) {
    withAlpha(ctx, 0.55, () => {
      for (let a = swordA - 1.2; a < swordA; a += 0.12) D(hx + Math.cos(a) * 12, hy + Math.sin(a) * 12, '#eaf4ff');
    });
  }

  }
}

/** Left/right local x of each row of the Holy Knight's kite shield (top row at local y 11 + bob). */
const HOLY_SHIELD_ROWS = [[10, 14], [9, 15], [9, 15], [9, 15], [9, 15], [9, 15], [9, 15], [10, 14], [10, 14], [11, 13], [12, 12]];

/** A random point on the gold rim of the Holy Knight's shield, in world px (for its shimmer). */
export function holyShieldRimPoint(cx, footY, f, bob = 0) {
  const ox = Math.round(cx - 8);
  const i = Math.floor(Math.random() * HOLY_SHIELD_ROWS.length);
  const [l, r] = HOLY_SHIELD_ROWS[i];
  const lx = i === 0 ? l + Math.floor(Math.random() * (r - l + 1)) : Math.random() < 0.5 ? l : r;
  const wx = f === 1 ? ox + lx : ox + 16 - lx - 1;
  return { x: wx + 0.5, y: footY - 24 + 11 + bob + i + 0.5, out: (lx < 12 ? -1 : 1) * f };
}
