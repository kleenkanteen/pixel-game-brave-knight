// Stage 4 scenery: outside, the rotted woods' sky and hills; from the cave mouth on, the Lord's
// Lair — a stone back wall, a rock ceiling (in front of the actors) and darkness, lit only by wall
// torches (and by fire). Static layers are pre-rendered once.
import { VIEW_W, VIEW_H } from '../core/constants.js';
import { rect, px, disc, withAlpha } from '../core/draw.js';
import { buildSky, buildClouds, drawClouds, buildHills } from '../stage-1/scenery/sky.js';
import { createLeaves } from '../stage-1/scenery/leaves.js';
import { WORLD_W, MOUTH_X, TORCHES } from './layout.js';
import { buildWorld, buildCeiling, buildDarkness } from './scenery/cave.js';

let layers = null;
function getLayers() {
  if (!layers) {
    layers = {
      sky: buildSky(),
      clouds: buildClouds(),
      hills: buildHills(WORLD_W),
      world: buildWorld(),
      ceiling: buildCeiling(),
      dark: buildDarkness(),
      leaves: createLeaves({ n: 10, x0: -10, x1: MOUTH_X - 20, fams: ['violet', 'violetD', 'rotgreen', 'moss'], seed: 990 }),
    };
  }
  return layers;
}

let shade = null; // per-frame darkness canvas (VIEW_W × VIEW_H)

/** Behind the actors: sky → clouds → hills (parallax) → world layer → back leaves. SCREEN coords. */
export function renderBack(ctx, camera, t) {
  const L = getLayers();
  const camX = Math.round(camera.x);
  if (camX < MOUTH_X) {
    ctx.drawImage(L.sky, 0, 0);
    drawClouds(ctx, L.clouds, camX, t);
    ctx.drawImage(L.hills.far, -Math.round(camX * 0.25), 0);
    ctx.drawImage(L.hills.near, -Math.round(camX * 0.5), 0);
  }
  ctx.drawImage(L.world, camX, 0, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
  L.leaves.render(ctx, camX, t, false);
}

/** In front of the actors: the rock ceiling and the front leaves outside. */
export function renderFront(ctx, camera, t) {
  const L = getLayers();
  const camX = Math.round(camera.x);
  ctx.drawImage(L.ceiling, camX, 0, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
  L.leaves.render(ctx, camX, t, true);
}

/** Torch flicker radius at time t (each torch on its own beat). */
const flicker = (i, t) => Math.sin(t * 9 + i * 2.3) * 1.5 + Math.sin(t * 23 + i) * 1;

/**
 * The darkness over everything drawn so far, with pools of light cut out of it (stepped rings, so
 * the light falls off in pixel-art bands), then a faint warm glow round each fire. SCREEN coords.
 * @param {{x:number, y:number, r:number, warm?:boolean, tint?:string}[]} lights  world coords
 *   warm → an orange glow; tint → a glow of that colour
 */
export function renderDark(ctx, camera, t, lights) {
  const L = getLayers();
  const camX = Math.round(camera.x);
  if (camX + VIEW_W < MOUTH_X - 30) return;
  if (!shade) {
    shade = document.createElement('canvas');
    shade.width = VIEW_W;
    shade.height = VIEW_H;
  }
  const g = shade.getContext('2d');
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, VIEW_W, VIEW_H);
  g.drawImage(L.dark, camX, 0, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
  g.globalCompositeOperation = 'destination-out';
  const all = [...TORCHES.map((tc, i) => ({ x: tc.x, y: tc.y - 6, r: 44 + flicker(i, t), warm: true })), ...lights];
  for (const l of all) {
    const sx = l.x - camX;
    if (sx < -l.r || sx > VIEW_W + l.r) continue;
    for (const [f, a] of [[1, 0.22], [0.8, 0.24], [0.6, 0.28], [0.4, 0.4]]) {
      g.globalAlpha = a;
      disc(g, sx, l.y, Math.max(1, Math.round(l.r * f)), '#000');
    }
  }
  g.globalAlpha = 1;
  ctx.drawImage(shade, 0, 0);
  // warm light spilling from the fires
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  for (const l of all) {
    if (!l.warm && !l.tint) continue;
    const sx = l.x - camX;
    if (sx < -l.r || sx > VIEW_W + l.r) continue;
    withAlpha(ctx, l.tint ? 0.12 : 0.07, () => disc(ctx, sx, l.y, Math.round(l.r * 0.6), l.tint ?? '#ff9a3a'));
  }
  ctx.globalCompositeOperation = prev;
}

/** Wall torches: an iron bracket, a wooden stick and a flickering flame. WORLD coords (over the dark). */
export function renderTorches(ctx, t) {
  TORCHES.forEach((tc, i) => {
    const { x, y } = tc;
    rect(ctx, x - 2, y + 4, 5, 2, '#2a2830'); // bracket
    rect(ctx, x - 1, y + 6, 3, 1, '#3e3c46');
    rect(ctx, x, y - 2, 2, 8, '#6b4428'); // stick
    rect(ctx, x, y - 2, 1, 8, '#8a5a34');
    rect(ctx, x - 1, y - 3, 4, 2, '#3a2a1c'); // pitch-soaked wrap
    const f = Math.floor(t * 10 + i * 3) % 3;
    const h = 5 + f;
    rect(ctx, x - 1, y - 3 - h + 2, 4, h - 2, '#d0342c');
    rect(ctx, x, y - 3 - h, 2, h, '#ff8a2a');
    rect(ctx, x, y - 3 - h + 3, 2, h - 3, '#ffe07a');
    px(ctx, x + (f === 1 ? 1 : 0), y - 4 - h, '#ff8a2a');
    if (Math.floor(t * 4 + i) % 5 === 0) px(ctx, x + 1, y - 7 - h - (Math.floor(t * 20) % 4), '#ffb03a'); // spark
  });
}
