// Stage 5 scenery: night over the Dark Lord's castle. A starry sky with a full moon and drifting
// clouds (screen space), distant mountains (parallax), the pre-rendered world (scenery/world.js),
// the moving parts (the moat's shimmer, both portcullises, the balcony doors, torch + brazier
// fire, the ritual circle), and the moonlight: a cool tint over everything, with lit windows,
// runes and fires drawn after it so they glow. Works at any view size (320×180 … 960×540).
import { GROUND_Y } from '../core/constants.js';
import { rect, px, disc, withAlpha } from '../core/draw.js';
import { ellipse } from '../battle/paint.js';
import { hash2 } from '../stage-1/scenery/util.js';
import { TOP_Y, MOAT_X0, MOAT_X1, GATEHOUSE, GATE2, BALCONY, TORCHES, BRAZIERS, RUNE_X, ROSE } from './layout.js';
import { buildWorld, buildFar, FAR_PARALLAX } from './scenery/world.js';
import { DARK_STONE, IRON, WOOD, archShape } from './scenery/paint.js';

const G = GROUND_Y;
const SKY = ['#04030c', '#070818', '#0a0e24', '#0e1430', '#131a3c', '#182046', '#1e2850'];
const MOONLIGHT = '#aab4e6'; // the multiply tint: everything goes cool and dim
const N_STARS = 170;

let layers = null;
let partyLayers = null; // the plaza without its platforms, built when the party starts
function getLayers(party = false) {
  if (!layers) layers = { ...buildWorld(), far: buildFar() };
  if (!party) return layers;
  if (!partyLayers) partyLayers = { ...layers, ...buildWorld({ platforms: false }) };
  return partyLayers;
}

/** Pre-render the heavy layers now (call when the Stage starts, not on the first frame). */
export function prepareScenery({ party = false } = {}) {
  getLayers(party);
}

// ------------------------------------------------------------------ sky (SCREEN coords)

/**
 * The night sky over the whole view (w × h px): banded deep blues, twinkling stars, the full moon
 * with its halo (top right), long clouds drifting across it. Fixed sizes in px, so zooming out
 * shows more sky with a smaller moon.
 */
export function renderSky(ctx, v, t) {
  const { w, h } = v;
  const band = Math.ceil(h / SKY.length);
  SKY.forEach((c, i) => rect(ctx, 0, i * band, w, band, c));
  // dithered seams between the bands
  for (let i = 1; i < SKY.length; i++) {
    for (let x = (i % 2) * 2; x < w; x += 4) px(ctx, x, i * band - 1, SKY[i]);
  }
  // stars: fixed in the sky, twinkling
  for (let i = 0; i < N_STARS; i++) {
    const u = hash2(i, 1);
    const vy = hash2(i, 2) * 0.8;
    const x = Math.round(((u * w - v.x * 0.02) % w + w) % w);
    const y = Math.round(vy * h);
    const tw = Math.sin(t * (1 + hash2(i, 3) * 3) + i);
    if (tw < -0.6) continue;
    const big = hash2(i, 4) > 0.94;
    const c = hash2(i, 5) > 0.7 ? '#c8d0ff' : tw > 0.5 ? '#ffffff' : '#8890c0';
    px(ctx, x, y, c);
    if (big && tw > 0) {
      withAlpha(ctx, 0.6, () => {
        px(ctx, x - 1, y, c);
        px(ctx, x + 1, y, c);
        px(ctx, x, y - 1, c);
        px(ctx, x, y + 1, c);
      });
    }
  }
  // the full moon + its halo
  const mx = Math.round(w * 0.8);
  const my = Math.round(Math.min(h * 0.2, 46 + (h - 180) * 0.1));
  withAlpha(ctx, 0.05, () => disc(ctx, mx, my, 34, '#c8d4ff'));
  withAlpha(ctx, 0.07, () => disc(ctx, mx, my, 25, '#c8d4ff'));
  withAlpha(ctx, 0.1, () => disc(ctx, mx, my, 18, '#dce4ff'));
  disc(ctx, mx, my, 13, '#e8e4d0');
  for (let dy = -13; dy <= 13; dy++) {
    // the shaded rim on the left
    const half = Math.floor(Math.sqrt(169 - dy * dy));
    rect(ctx, mx - half, my + dy, Math.max(1, Math.round(half * 0.3)), 1, '#c8c4b0');
  }
  for (const [dx, dy, r] of [[-4, -3, 3], [3, 4, 2], [5, -5, 1], [-1, 6, 1], [-6, 3, 1]]) disc(ctx, mx + dx, my + dy, r, '#b8b4a0');
  px(ctx, mx + 6, my - 7, '#fffcf0');
  // clouds: long, ragged, moonlit along the top
  for (let i = 0; i < 6; i++) {
    const cw = 50 + hash2(i, 7) * 70;
    const speed = 2 + hash2(i, 8) * 3;
    const span = w + cw * 2;
    const x = ((hash2(i, 6) * span + t * speed - v.x * 0.05) % span + span) % span - cw;
    const y = Math.round(10 + hash2(i, 9) * h * 0.45);
    drawCloud(ctx, Math.round(x), y, Math.round(cw), i);
  }
}

function drawCloud(ctx, x, y, w, seed) {
  withAlpha(ctx, 0.85, () => {
    for (let k = 0; k < 5; k++) {
      const cx = x + (w * (k + 0.5)) / 5;
      const rx = Math.round(w * 0.16 + hash2(seed, k) * w * 0.08);
      const ry = Math.max(2, Math.round(rx * 0.3));
      const cy = y + Math.round((hash2(seed, k + 9) - 0.5) * 4);
      ellipse(ctx, cx, cy, rx, ry, '#1e2444');
      for (let dx = -rx + 2; dx < rx - 2; dx++) if (hash2(dx + seed, k) < 0.7) px(ctx, cx + dx, cy - ry, '#4a5484');
    }
  });
}

/** The far mountains and the castle's crag, behind the world (SCREEN coords). */
export function renderFar(ctx, v) {
  const L = getLayers();
  ctx.drawImage(L.far, -Math.round(v.x * FAR_PARALLAX), TOP_Y - v.y);
}

// ------------------------------------------------------------------ the world (WORLD coords)

/**
 * The static world for the view, then what moves: the moat's shimmer, the portcullises
 * (gate1: 0 shut … 1 open; gate2: 0 open … 1 shut) and the balcony doors (0 shut … 1 open).
 * party: the plaza with its platforms cleared away.
 */
export function renderWorld(ctx, v, t, { gate1 = 0, gate2 = 0, doors = 0, party = false } = {}) {
  const L = getLayers(party);
  ctx.drawImage(L.base, v.x, v.y - TOP_Y, v.w, v.h, v.x, v.y, v.w, v.h);
  if (v.x < MOAT_X1 && v.x + v.w > MOAT_X0) renderWater(ctx, v, t);
  if (v.x < GATEHOUSE.x1 && v.x + v.w > GATEHOUSE.x0) {
    portcullis(ctx, GATEHOUSE.gateX0, GATEHOUSE.gateX1, GATEHOUSE.archTop, G, gate1);
  }
  if (v.x < GATE2.x1 && v.x + v.w > GATE2.x0) portcullis(ctx, GATE2.gateX0, GATE2.gateX1, GATE2.archTop, G, 1 - gate2);
  if (v.y < BALCONY.y) balconyDoors(ctx, doors);
}

/** The moon's reflection and glints on the moat under the bridge. */
function renderWater(ctx, v, t) {
  const mx = Math.round(v.x + v.w * 0.8); // under the moon (it's in screen space)
  for (let i = 0; i < 6; i++) {
    const y = G + 12 + i * 3;
    if (y >= v.y + v.h) break;
    const half = 6 - i + Math.round(Math.sin(t * 2 + i) * 2);
    const x = mx + Math.round(Math.sin(t * 1.3 + i * 1.7) * 2);
    if (x - half < MOAT_X0 || x + half > MOAT_X1) continue;
    withAlpha(ctx, 0.7 - i * 0.08, () => rect(ctx, x - half, y, half * 2, 1, '#c8d4ff'));
  }
  for (let i = 0; i < 14; i++) {
    const x = MOAT_X0 + Math.floor(hash2(i, Math.floor(t * 2 + i * 0.37)) * (MOAT_X1 - MOAT_X0));
    const y = G + 12 + Math.floor(hash2(i, 33) * 16);
    if ((Math.floor(t * 3) + i) % 4 === 0) rect(ctx, x, y, 2, 1, '#5a6a9a');
  }
}

/**
 * An iron portcullis in an arch [x0, x1] × [top, bottom]: bars, cross-bars and spiked feet, raised
 * by `open` (0 down … 1 up, out of sight into the wall above).
 */
function portcullis(ctx, x0, x1, top, bottom, open) {
  const lift = Math.round((bottom - top + 4) * Math.max(0, Math.min(1, open)));
  if (lift >= bottom - top + 4) return;
  ctx.save();
  ctx.beginPath();
  archShape((x0 + x1) / 2, x1 - x0, top, bottom, (x, y, w) => ctx.rect(x, y, w, 1)); // the arch's shape
  ctx.clip();
  const y1 = bottom - lift; // its spiked foot
  for (let x = x0 + 2; x < x1 - 1; x += 6) {
    rect(ctx, x, top - 40, 2, y1 - top + 40, IRON.base);
    rect(ctx, x, top - 40, 1, y1 - top + 40, IRON.light);
    rect(ctx, x, y1, 2, 2, IRON.dark);
    px(ctx, x, y1 + 2, IRON.light); // the spike
  }
  for (let y = y1 - 6; y > top - 40; y -= 9) {
    rect(ctx, x0, y, x1 - x0, 2, IRON.dark);
    rect(ctx, x0, y, x1 - x0, 1, IRON.base);
  }
  ctx.restore();
}

/** The balcony's double doors swinging open (0 shut … 1 open): dark oak, iron studs. */
function balconyDoors(ctx, open) {
  const { y, doorX } = BALCONY;
  const top = y - 34;
  const half = 8;
  const leaf = Math.max(1, Math.round(half * (1 - open)));
  for (const side of [-1, 1]) {
    const hinge = doorX + side * half;
    const x = side < 0 ? hinge : hinge - leaf;
    for (let yy = top + 4; yy < y; yy++) rect(ctx, x, yy, leaf, 1, (yy - top) % 6 === 0 ? WOOD.dark : '#3a2418');
    if (leaf > 2) {
      for (let yy = top + 8; yy < y; yy += 8) px(ctx, x + (side < 0 ? leaf - 2 : 1), yy, IRON.light);
      rect(ctx, side < 0 ? x : x + leaf - 1, top + 4, 1, y - top - 4, WOOD.dark);
    }
  }
}

/** The balcony's balustrade, drawn in front of him (WORLD coords). */
export function renderBalustrade(ctx, v) {
  const { x0, x1, y } = BALCONY;
  if (v.y > y) return;
  const top = y - 11;
  rect(ctx, x0, top, x1 - x0, 3, DARK_STONE.base);
  rect(ctx, x0, top, x1 - x0, 1, DARK_STONE.light);
  for (let x = x0 + 2; x < x1 - 2; x += 5) {
    rect(ctx, x, top + 3, 3, 8, DARK_STONE.base);
    rect(ctx, x + 1, top + 5, 1, 4, DARK_STONE.dark);
    rect(ctx, x + 2, top + 3, 1, 8, DARK_STONE.light);
  }
  rect(ctx, x0, top + 3, 2, 8, DARK_STONE.light);
}

// ------------------------------------------------------------------ the moonlight + lights

/** The moonlight: a cool multiply over everything drawn so far (SCREEN coords). `k` 0..1 strength. */
export function renderMoonlight(ctx, v, k = 1) {
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'multiply';
  withAlpha(ctx, k, () => rect(ctx, 0, 0, v.w, v.h, MOONLIGHT));
  ctx.globalCompositeOperation = prev;
}

/**
 * After the tint (WORLD coords): lit windows + stained glass + runes, the torches and braziers
 * burning, the ritual circle. `fire` 0..1: how hot the Dark Lord's violet fires burn (they die
 * down when he falls); `rite` 0..1: how bright the circle glows.
 */
export function renderLights(ctx, v, t, { fire = 1, rite = 0.5, party = false } = {}) {
  const L = getLayers(party);
  ctx.drawImage(L.glow, v.x, v.y - TOP_Y, v.w, v.h, v.x, v.y, v.w, v.h);
  const inView = (x, r = 30) => x > v.x - r && x < v.x + v.w + r;
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  // the rose window's soft violet glow
  for (const [r, a] of [[48, 0.03], [38, 0.04], [30, 0.05]]) withAlpha(ctx, a, () => disc(ctx, ROSE.x, ROSE.y, r, '#8a3ae0'));
  // soft pools of light: stepped rings, fading out
  const pool = (x, y, r, a, c) => {
    for (const f of [1, 0.75, 0.5]) withAlpha(ctx, a, () => disc(ctx, x, y, Math.round(r * f), c));
  };
  for (const tc of TORCHES) if (inView(tc.x)) pool(tc.x, tc.y - 6, 22 + Math.round(Math.sin(t * 9 + tc.x) * 1.5), 0.04, '#ff9a3a');
  for (const x of BRAZIERS) if (inView(x)) pool(x, G - 28, 26 + Math.round(Math.sin(t * 7 + x) * 2), 0.05 * fire, '#a050f0');
  ctx.globalCompositeOperation = prev;
  TORCHES.forEach((tc, i) => inView(tc.x) && drawTorch(ctx, tc.x, tc.y, t, i));
  BRAZIERS.forEach((x, i) => inView(x) && drawBrazierFire(ctx, x, G - 21, t, i, fire));
  if (inView(RUNE_X, 60)) drawRite(ctx, RUNE_X, G + 3, t, rite);
}

/** A wall torch: bracket, stick, flickering flame. */
function drawTorch(ctx, x, y, t, i) {
  rect(ctx, x - 2, y + 4, 5, 2, '#2a2830');
  rect(ctx, x, y - 2, 2, 8, '#6b4428');
  rect(ctx, x - 1, y - 3, 4, 2, '#3a2a1c');
  const f = Math.floor(t * 10 + i * 3) % 3;
  const h = 5 + f;
  rect(ctx, x - 1, y - 3 - h + 2, 4, h - 2, '#d0342c');
  rect(ctx, x, y - 3 - h, 2, h, '#ff8a2a');
  rect(ctx, x, y - 3 - h + 3, 2, h - 3, '#ffe07a');
  px(ctx, x + (f === 1 ? 1 : 0), y - 4 - h, '#ff8a2a');
}

/** Violet fire in a brazier's bowl (its top at y); `fire` 0 → only embers glowing. */
function drawBrazierFire(ctx, x, y, t, i, fire) {
  for (let k = -5; k <= 5; k++) {
    const flick = Math.sin(t * 11 + k * 1.7 + i) * 0.5 + 0.5;
    const h = Math.round((4 + (5 - Math.abs(k)) * 1.6 + flick * 4) * fire);
    if (h <= 0) {
      if ((k + Math.floor(t * 3)) % 3 === 0) px(ctx, x + k, y, '#a04020');
      continue;
    }
    rect(ctx, x + k, y - h, 1, h, '#6a2aa8');
    if (h > 3) rect(ctx, x + k, y - h + 2, 1, h - 2, '#a050f0');
    if (h > 6 && Math.abs(k) < 3) rect(ctx, x + k, y - h + 4, 1, h - 5, '#e0b0ff');
  }
  if (fire > 0.2 && Math.floor(t * 5 + i) % 4 === 0) px(ctx, x + ((Math.floor(t * 13) % 7) - 3), y - 14 - (Math.floor(t * 20) % 6), '#e0b0ff');
}

/** The ritual circle on the plaza floor: a ring of runes, pulsing violet. */
function drawRite(ctx, cx, cy, t, k) {
  if (k <= 0.01) return;
  const pulse = 0.6 + 0.4 * Math.sin(t * 2.2);
  withAlpha(ctx, k * pulse, () => {
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2 + t * 0.15;
      const x = cx + Math.cos(a) * 44;
      const y = cy + Math.sin(a) * 3;
      px(ctx, x, y, i % 8 === 0 ? '#ffffff' : '#a050f0');
      if (i % 8 === 4) px(ctx, x, y - 1, '#e0b0ff');
    }
    for (let i = 0; i < 5; i++) {
      // a star inside the ring
      const a0 = (i / 5) * Math.PI * 2 + t * 0.15;
      const a1 = ((i + 2) / 5) * Math.PI * 2 + t * 0.15;
      const n = 20;
      for (let s = 0; s <= n; s++) {
        const u = s / n;
        const x = cx + (Math.cos(a0) * (1 - u) + Math.cos(a1) * u) * 40;
        const y = cy + (Math.sin(a0) * (1 - u) + Math.sin(a1) * u) * 2.6;
        px(ctx, x, y, '#7a3ab0');
      }
    }
  });
}
