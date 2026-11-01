// The Lord's Lair monsters, drawn in code (facing right in local coords, mirrored for facing −1):
// the Cave Crawler, the Rock Golem, the Pterodactyl and its dropping. Internal to the battle slice.
import { rect, px, disc } from '../core/draw.js';
import { painter } from './paint.js';

const DARK = '#14101c';

// ---------------------------------------------------------------- Cave Crawler

const CR = {
  body: '#4a3460',
  bodyD: '#2e2040',
  bodyL: '#6a4e84',
  mark: '#8a2a3a',
  leg: '#2a1c38',
  eye: '#ff3a3a',
  fang: '#e8e0d0',
};

/** 16 × 10, feet on footY. pose: walkT, crouch 0/1, air (px off the ground, mid-pounce), asleep. */
export function drawCrawler(ctx, cx, footY, f, { walkT = 0, crouch = 0, air = 0, asleep = false, t = 0 } = {}) {
  const ox = Math.round(cx - 8);
  const oy = Math.round(footY - 10);
  const { P, D, L } = painter(ctx, ox, oy, 16, f);
  const fr = Math.floor(walkT * 12) % 2;
  const low = crouch ? 2 : asleep ? 2 : 0;
  const tuck = air > 2;
  // shadow on the floor while it pounces
  if (air > 0) rect(ctx, Math.round(cx - 5), Math.round(footY + air), 10, 1, 'rgba(10,6,14,0.35)');

  // legs: four pairs, alternating (tucked in mid-air)
  for (let i = 0; i < 4; i++) {
    const hx = 5 + i * 2;
    const step = (i + fr) % 2 ? -1 : 1;
    const footX = tuck ? hx + (i < 2 ? -1 : 1) : hx + (i < 2 ? -3 : 3) + step;
    const footY2 = tuck ? 8 : 10;
    L(hx, 6 + low, i < 2 ? hx - 2 : hx + 2, 4 + low, CR.leg);
    L(i < 2 ? hx - 2 : hx + 2, 4 + low, footX, footY2 - 1, CR.leg);
  }
  // abdomen (big, at the back) + head (front)
  P(2, 4 + low, 7, 5, CR.body);
  P(3, 3 + low, 5, 1, CR.body);
  P(2, 8 + low, 7, 1, CR.bodyD);
  P(3, 4 + low, 3, 1, CR.bodyL);
  D(5, 6 + low, CR.mark);
  D(6, 5 + low, CR.mark);
  P(9, 5 + low, 4, 3, CR.body);
  P(9, 7 + low, 4, 1, CR.bodyD);
  // eyes: a cluster of red dots (shut when asleep)
  if (asleep) {
    P(11, 5 + low, 2, 1, CR.bodyD);
  } else {
    const blink = Math.sin(t * 1.3 + cx) > 0.97;
    if (!blink) {
      D(11, 5 + low, CR.eye);
      D(12, 5 + low, CR.eye);
      D(12, 6 + low, CR.eye);
    }
  }
  // fangs
  D(13, 7 + low, CR.fang);
  D(13, 8 + low, crouch ? CR.fang : CR.bodyD);
}

// ---------------------------------------------------------------- Rock Golem

const GO = {
  rock: '#7a7486',
  rockL: '#9a94a6',
  rockD: '#55505e',
  rockDD: '#3a3642',
  moss: '#5a6a3a',
  mossL: '#7a8a4a',
  core: '#ff9a3a',
  coreL: '#ffe07a',
};

/** 24 × 28, feet on footY. pose: walkT, raise 0..1 (fists going up), slam 0/1 (fists down), asleep. */
export function drawGolem(ctx, cx, footY, f, { walkT = 0, raise = 0, slam = 0, asleep = false, t = 0 } = {}) {
  const ox = Math.round(cx - 12);
  const oy = Math.round(footY - 28);
  const { P, D } = painter(ctx, ox, oy, 24, f);
  const fr = Math.floor(walkT * 3) % 2;
  const sag = asleep ? 2 : 0;

  // legs: two stubby pillars
  P(6 + fr, 21, 5, 7, GO.rockD);
  P(13 - fr, 21, 5, 7, GO.rock);
  P(5 + fr, 27, 7, 1, GO.rockDD);
  P(12 - fr, 27, 7, 1, GO.rockDD);
  // torso: a big boulder
  P(4, 8 + sag, 16, 14 - sag, GO.rock);
  P(5, 7 + sag, 14, 1, GO.rock);
  P(4, 8 + sag, 16, 1, GO.rockL);
  P(4, 8 + sag, 1, 13 - sag, GO.rockD);
  P(19, 9 + sag, 1, 12 - sag, GO.rockD);
  P(4, 21, 16, 1, GO.rockDD);
  // cracks glowing with a molten core
  const glow = asleep ? GO.rockDD : Math.sin(t * 4) > 0 ? GO.coreL : GO.core;
  D(11, 12 + sag, glow);
  D(12, 13 + sag, glow);
  D(12, 14 + sag, glow);
  D(11, 15 + sag, glow);
  D(15, 17, GO.rockDD);
  D(16, 18, GO.rockDD);
  // moss on the shoulders
  P(6, 7 + sag, 4, 1, GO.moss);
  P(14, 7 + sag, 3, 1, GO.mossL);
  D(5, 8 + sag, GO.moss);
  // head: a small block sunk between the shoulders
  P(10, 3 + sag * 2, 8, 6, GO.rock);
  P(10, 3 + sag * 2, 8, 1, GO.rockL);
  P(10, 8 + sag * 2, 8, 1, GO.rockD);
  if (asleep) P(14, 5 + sag * 2, 3, 1, GO.rockDD);
  else {
    P(14, 5, 2, 1, GO.coreL);
    D(17, 5, GO.core);
  }
  // arms: fists hang low, rise overhead on the wind-up, smash down in front on the slam
  const fist = (x, y, c) => {
    P(x, y, 5, 5, c);
    P(x, y, 5, 1, GO.rockL);
    P(x, y + 4, 5, 1, GO.rockDD);
  };
  if (slam) {
    P(18, 12, 3, 8, GO.rockD);
    fist(19, 22, GO.rock);
    P(1, 12, 3, 6, GO.rockD);
    fist(0, 17, GO.rockD);
  } else if (raise > 0) {
    const up = Math.round(raise * 14);
    P(17, 10 - up, 3, 6 + up, GO.rockD);
    fist(16, 4 - up, GO.rock);
    P(3, 10 - up, 3, 5 + up, GO.rockDD);
    fist(2, 5 - up, GO.rockD);
  } else {
    const sw = fr;
    P(19, 10 + sag, 3, 7, GO.rockD);
    fist(19, 16 + sag + sw, GO.rock);
    P(2, 10 + sag, 3, 6, GO.rockDD);
    fist(0, 15 + sag - sw, GO.rockD);
  }
}

// ---------------------------------------------------------------- Pterodactyl

const PT = {
  skin: '#b8763e',
  skinD: '#8a5430',
  skinL: '#d8955a',
  wing: '#9a5c34',
  wingD: '#6e3c22',
  wingM: '#c08a5a',
  crest: '#c8423a',
  beak: '#e0c08a',
  eye: '#ffe07a',
};

/**
 * 28 wide (wingtip to wingtip), body centred on cx at height y (the bottom of its body).
 * pose: flapT, strain 0..1 (squeezing out a dropping: tail down, shaking), dead (tumbling), asleep.
 */
export function drawPtero(ctx, cx, y, f, { flapT = 0, strain = 0, dead = false, asleep = false } = {}) {
  const shake = strain > 0 ? (Math.floor(flapT * 30) % 2 ? 1 : -1) * (strain > 0.6 ? 1 : 0) : 0;
  const ox = Math.round(cx - 14) + shake;
  const oy = Math.round(y - 12);
  const { P, D, L } = painter(ctx, ox, oy, 28, f);
  // wing beat: up, level, down, level (straining: wings spread wide and stiff)
  const beat = dead ? Math.floor(flapT * 8) % 4 : asleep ? 1 : strain > 0 ? 1 : Math.floor(flapT * 9) % 4;
  const tipY = [0, 6, 11, 6][beat];

  // far wing (darker), from the shoulder out to the tip
  L(13, 7, 5, tipY, PT.wingD);
  L(13, 8, 4, tipY + 1, PT.wingD);
  L(12, 9, 6, tipY + 2, PT.wingD);
  // body: torpedo shape, tail behind, head + long beak in front
  P(10, 7, 9, 3, PT.skin);
  P(11, 6, 6, 1, PT.skin);
  P(10, 9, 9, 1, PT.skinD);
  P(7, 8 + (strain > 0 ? 1 : 0), 4, 1, PT.skinD); // tail (dips while straining)
  D(6, 8 + (strain > 0 ? 2 : 0), PT.skinD);
  D(15, 10, PT.skinD); // feet tucked
  D(13, 10, PT.skinD);
  P(18, 5, 4, 3, PT.skin); // head
  P(18, 5, 4, 1, PT.skinL);
  L(19, 4, 15, 1, PT.crest); // crest sweeping back
  D(16, 2, PT.crest);
  P(22, 6, 5, 1, PT.beak); // beak
  P(22, 7, 3, 1, PT.beak);
  D(26, 6, PT.skinD);
  D(20, 6, dead ? DARK : PT.eye);
  if (dead) {
    D(19, 5, DARK);
    D(21, 7, DARK);
  }
  // near wing (lighter membrane)
  L(15, 7, 23, tipY, PT.wing);
  L(15, 8, 24, tipY + 1, PT.wing);
  L(14, 9, 22, tipY + 2, PT.wingM);
  D(23, tipY, PT.wingD);
  // straining: little sweat drops fly off
  if (strain > 0.3 && Math.floor(flapT * 6) % 2 === 0) {
    D(17, 2, '#a6dcff');
    D(9, 4, '#a6dcff');
  }
}

/** A falling dropping: white-and-murky blob with a little tail. */
export function drawDropping(ctx, x, y) {
  disc(ctx, x, y, 2, '#8a7a4a');
  px(ctx, x - 1, y - 1, '#e8e0b8');
  px(ctx, x, y - 1, '#f4f0e0');
  px(ctx, x, y - 3, '#8a7a4a');
  px(ctx, x, y + 2, '#5e5030');
}
