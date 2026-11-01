// Builds the static Stage 4 layers once: the world layer (rotted trees outside, the cave's back
// wall, the ledge on its rock column, the floor), the rock ceiling drawn in front of everything,
// and the darkness map. Reuses the Stage 1 tree painter and the Stage 2 ground.
import { VIEW_H, GROUND_Y } from '../../core/constants.js';
import { rect, px } from '../../core/draw.js';
import { makeCanvas, hash2 } from '../../stage-1/scenery/util.js';
import { drawTree } from '../../stage-1/scenery/trees.js';
import { drawGround } from '../../stage-2/scenery/ground.js';
import { WORLD_W, MOUTH_X, CHAMBER_X0, LEDGE, PLATFORMS, ceilAt, darkAt } from '../layout.js';

const ROTTED = ['violet', 'violetD', 'rotgreen', 'moss'];
const ROT_BARK = ['#3a3438', '#544a52', '#1c181e'];
const ROT_BARK_D = ['#2c2830', '#3e3842', '#141216'];

const TREES_BACK = [
  { x: 40, h: 80, r: 19, shape: 'dead', leaves: ROTTED, trunk: ROT_BARK_D, rot: 0.9, seed: 401 },
  { x: 150, h: 74, r: 18, shape: 'dead', leaves: ROTTED, trunk: ROT_BARK_D, rot: 1, seed: 402 },
];
const TREES_MID = [
  { x: 8, h: 64, r: 17, shape: 'dead', leaves: ROTTED, trunk: ROT_BARK, rot: 0.8, seed: 411 },
  { x: 96, h: 70, r: 18, shape: 'dead', leaves: ['moss', 'rotgreen', 'violetD'], trunk: ROT_BARK, rot: 0.9, seed: 412 },
];

const WALL = ['#2c2632', '#332c3a', '#3a3242', '#28222e'];
const ROCK = { base: '#4a4254', light: '#625872', dark: '#2e2836', rim: '#7a6e8a', moss: '#3e4a2e' };
const FLOOR = { top: '#5e5468', base: '#3e3646', dark: '#2a242e', pebble: '#6a6074' };

/** The back wall of the cave from the mouth on: textured stone with strata, cracks and crystals. */
function drawBackWall(ctx) {
  const x0 = MOUTH_X - 12;
  for (let x = x0; x < WORLD_W; x++) {
    const top = Math.max(0, Math.floor(ceilAt(x) ?? 0) - 2);
    for (let y = top; y < GROUND_Y; y++) {
      const n = hash2(Math.floor(x / 3), Math.floor(y / 2));
      const strata = Math.floor((y + Math.sin(x / 23) * 4) / 9) % 2;
      let c = WALL[(Math.floor(n * 3) + strata) % 4];
      if (x < MOUTH_X + 18) c = n < 0.5 ? '#1a161e' : '#201a26'; // deep shadow just inside the mouth
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // cracks
  for (let i = 0; i < 40; i++) {
    let x = x0 + 30 + Math.floor(hash2(i, 7) * (WORLD_W - x0 - 40));
    let y = 30 + Math.floor(hash2(i, 9) * 90);
    for (let k = 0; k < 10; k++) {
      px(ctx, x, y, '#1c1822');
      x += hash2(i, k) < 0.5 ? 1 : 0;
      y += 1;
    }
  }
  // crystals glinting in the chamber walls
  for (let i = 0; i < 18; i++) {
    const x = CHAMBER_X0 + 20 + Math.floor(hash2(i, 31) * (WORLD_W - CHAMBER_X0 - 40));
    const y = 30 + Math.floor(hash2(i, 33) * 80);
    rect(ctx, x, y, 1, 3, '#6a4e9a');
    px(ctx, x + 1, y + 1, '#9a7ad0');
    px(ctx, x, y, '#c8b0f0');
  }
}

/**
 * The way out at the back of the Hydra's chamber: an arched passage in the right wall, cool
 * moonlight showing at its far end (Stage 5 is out there). Hidden behind the Hydra until it's gone.
 */
function drawPassage(ctx) {
  const cx = WORLD_W - 22;
  const top = GROUND_Y - 58;
  for (let y = top; y < GROUND_Y; y++) {
    const dy = Math.max(0, top + 16 - y);
    const half = Math.round(Math.sqrt(Math.max(0, 256 - dy * dy)));
    rect(ctx, cx - half - 2, y, half * 2 + 4, 1, ROCK.dark);
    rect(ctx, cx - half, y, half * 2, 1, '#0c0a14');
    // moonlight from outside, brightest low and to the right
    const k = (y - top) / (GROUND_Y - top);
    if (k > 0.25) rect(ctx, cx + half - 6, y, 4, 1, k > 0.7 ? '#3a4a78' : '#24304e');
  }
  rect(ctx, cx - 12, GROUND_Y - 1, 28, 1, '#4a5a8a');
}

/** The rock shelf (top at LEDGE.y) on a rock column rising from the floor behind the walkway. */
function drawLedge(ctx) {
  const { x0, x1, y } = LEDGE;
  // column under it (background: he walks in front of it on the floor)
  for (let x = x0 + 22; x < x1 - 18; x++) {
    const wob = Math.round(Math.sin(x / 5) * 1.5);
    for (let yy = y + 6; yy < GROUND_Y; yy++) {
      const n = hash2(x, yy);
      ctx.fillStyle = n < 0.2 ? ROCK.dark : n < 0.85 ? '#3a3344' : '#463e52';
      ctx.fillRect(x + (yy > GROUND_Y - 10 ? -1 : 0) + (x === x0 + 22 ? wob : 0), yy, 1, 1);
    }
  }
  rect(ctx, x0 + 22, y + 6, 2, GROUND_Y - y - 6, ROCK.dark);
  rect(ctx, x1 - 20, y + 6, 2, GROUND_Y - y - 6, ROCK.dark);
  // the shelf: rough underside, lit rim on top
  for (let x = x0; x <= x1; x++) {
    const under = 7 + Math.round(hash2(x, 3) * 3) + (x - x0 < 6 || x1 - x < 6 ? -3 : 0);
    rect(ctx, x, y, 1, under, ROCK.base);
    px(ctx, x, y + under, ROCK.dark);
    if (hash2(x, 5) < 0.3) px(ctx, x, y + 3, ROCK.dark);
    if (hash2(x, 6) < 0.2) px(ctx, x, y + under - 1, ROCK.dark);
  }
  rect(ctx, x0, y, x1 - x0 + 1, 1, ROCK.rim);
  rect(ctx, x0, y + 1, x1 - x0 + 1, 1, ROCK.light);
  for (let x = x0 + 8; x < x1; x += 13) rect(ctx, x, y - 1, 3, 1, ROCK.moss);
}

/** A rock platform jutting from the back wall: flat lit top, rough underside tapering to a point. */
function drawPlatform(ctx, { x0, x1, y }, seed) {
  const w = x1 - x0;
  for (let x = x0; x <= x1; x++) {
    const u = (x - x0) / w; // 0..1 across
    const taper = Math.sin(u * Math.PI); // deepest in the middle
    const under = Math.max(3, Math.round(4 + taper * 12 + hash2(x, seed) * 3));
    for (let yy = 0; yy < under; yy++) {
      const n = hash2(x * 3 + seed, yy);
      ctx.fillStyle = yy >= under - 2 ? ROCK.dark : n < 0.15 ? ROCK.dark : n > 0.85 ? ROCK.light : ROCK.base;
      ctx.fillRect(x, y + yy, 1, 1);
    }
    px(ctx, x, y + under, '#1c1822');
  }
  rect(ctx, x0, y, w + 1, 1, ROCK.rim);
  rect(ctx, x0, y + 1, w + 1, 1, ROCK.light);
  rect(ctx, x0, y + 2, 1, 2, ROCK.dark);
  rect(ctx, x1, y + 2, 1, 2, ROCK.dark);
  for (let x = x0 + 5; x < x1 - 2; x += 11) rect(ctx, x, y - 1, 3, 1, ROCK.moss);
}

/** Cave floor from the mouth on (the rotted ground stays outside). */
function drawFloor(ctx) {
  for (let x = MOUTH_X - 6; x < WORLD_W; x++) {
    const blend = x < MOUTH_X + 10 ? hash2(x, 1) < (x - MOUTH_X + 6) / 16 : true;
    if (!blend) continue;
    for (let y = GROUND_Y; y < VIEW_H; y++) {
      const n = hash2(x, y);
      let c = y === GROUND_Y ? FLOOR.top : y === GROUND_Y + 1 ? (n < 0.5 ? FLOOR.top : FLOOR.base) : n < 0.12 ? FLOOR.dark : FLOOR.base;
      if (y > GROUND_Y + 3 && n > 0.96) c = FLOOR.pebble;
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // rubble along the foot of the wall
  for (let i = 0; i < 90; i++) {
    const x = MOUTH_X + 10 + Math.floor(hash2(i, 51) * (WORLD_W - MOUTH_X - 20));
    const w = 2 + Math.floor(hash2(i, 52) * 4);
    rect(ctx, x, GROUND_Y - 1, w, 1, hash2(i, 53) < 0.5 ? '#4a4254' : '#3a3344');
    px(ctx, x, GROUND_Y - 2, '#5a5266');
  }
}

export function buildWorld() {
  const { canvas, ctx } = makeCanvas(WORLD_W, VIEW_H);
  const back = makeCanvas(WORLD_W, VIEW_H);
  TREES_BACK.forEach((t) => drawTree(back.ctx, t));
  back.ctx.globalCompositeOperation = 'source-atop';
  back.ctx.globalAlpha = 0.3;
  back.ctx.fillStyle = '#5a4e6a';
  back.ctx.fillRect(0, 0, WORLD_W, VIEW_H);
  ctx.drawImage(back.canvas, 0, 0);
  TREES_MID.forEach((t) => drawTree(ctx, t));
  drawGround(ctx, { width: WORLD_W, rot: () => 1, seed: 404 });
  drawBackWall(ctx);
  drawPassage(ctx);
  drawLedge(ctx);
  PLATFORMS.forEach((p, i) => drawPlatform(ctx, p, 61 + i * 7));
  drawFloor(ctx);
  return canvas;
}

/**
 * The rock ceiling (drawn in front of the actors): solid rock down to ceilAt(x), a lit rim,
 * hanging stalactites, and outside the mouth the cliff brow of the hill the cave is cut into.
 */
export function buildCeiling() {
  const { canvas, ctx } = makeCanvas(WORLD_W, VIEW_H);
  for (let x = 0; x < WORLD_W; x++) {
    const c = ceilAt(x);
    if (c === null) continue;
    const bottom = Math.floor(c);
    for (let y = 0; y < bottom; y++) {
      const n = hash2(Math.floor(x / 2), Math.floor(y / 2) + 99);
      const strata = Math.floor((y + x * 0.15) / 7) % 2;
      ctx.fillStyle = n < 0.15 ? ROCK.dark : strata ? ROCK.base : '#423a4c';
      ctx.fillRect(x, y, 1, 1);
    }
    if (bottom > 0) {
      px(ctx, x, bottom - 1, ROCK.rim);
      px(ctx, x, bottom - 2, ROCK.light);
      if (x < MOUTH_X) px(ctx, x - 1, bottom - 1, ROCK.rim); // the cliff edge outside
    }
    if (x < MOUTH_X && hash2(x, 2) < 0.25) px(ctx, x, bottom - 3, ROCK.moss);
  }
  // stalactites
  for (let x = MOUTH_X + 30; x < WORLD_W - 4; x += 9 + Math.floor(hash2(x, 61) * 14)) {
    const top = Math.floor(ceilAt(x));
    const len = 4 + Math.floor(hash2(x, 62) * (top < 40 ? 16 : 8));
    for (let k = 0; k < len; k++) {
      const w = Math.max(1, Math.round(3 * (1 - k / len)));
      rect(ctx, x - Math.floor(w / 2), top - 1 + k, w, 1, k < 2 ? ROCK.base : k % 3 ? '#4e4658' : ROCK.light);
    }
    px(ctx, x, top + len - 1, '#8a7e9a');
  }
  return canvas;
}

/** The darkness overlay map (WORLD_W × VIEW_H): darkAt(x) per column, a touch darker up high. */
export function buildDarkness() {
  const { canvas, ctx } = makeCanvas(WORLD_W, VIEW_H);
  for (let x = 0; x < WORLD_W; x++) {
    const a = darkAt(x);
    if (a <= 0.01) continue;
    ctx.fillStyle = `rgba(6,4,14,${a.toFixed(3)})`;
    ctx.fillRect(x, 0, 1, VIEW_H);
    ctx.fillStyle = `rgba(6,4,14,${(a * 0.25).toFixed(3)})`;
    ctx.fillRect(x, 0, 1, 50);
  }
  return canvas;
}
