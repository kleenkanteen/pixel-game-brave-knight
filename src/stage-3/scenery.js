// Stage 3 scenery: the rotted woods all the way across — same sky and hills as before under a
// heavy violet haze, mist wisps and rotted leaves. Static layers are pre-rendered once.
import { VIEW_W, VIEW_H } from '../core/constants.js';
import { buildSky, buildClouds, drawClouds, buildHills } from '../stage-1/scenery/sky.js';
import { createLeaves } from '../stage-1/scenery/leaves.js';
import { buildHaze, createMist } from '../stage-2/scenery/haze.js';
import { WORLD_W } from './layout.js';
import { buildWorld } from './scenery/world.js';

const ROTTED = () => 1;

let layers = null;
function getLayers() {
  if (!layers) {
    layers = {
      sky: buildSky(),
      clouds: buildClouds(),
      hills: buildHills(WORLD_W),
      world: buildWorld(),
      hazeBack: buildHaze(0.55, { width: WORLD_W, rot: ROTTED }),
      hazeFront: buildHaze(0.15, { width: WORLD_W, rot: ROTTED }),
      mist: createMist({ x0: -60, width: WORLD_W, rot: ROTTED, n: 7, seed: 931 }),
      leaves: createLeaves({ n: 26, x0: -10, x1: WORLD_W - 10, fams: ['violet', 'violetD', 'rotgreen', 'moss'], seed: 780 }),
    };
  }
  return layers;
}

/** Behind the actors: sky → clouds → hills (parallax) → world layer → haze → back leaves. SCREEN coords. */
export function renderBack(ctx, camera, t) {
  const L = getLayers();
  const camX = Math.round(camera.x);
  ctx.drawImage(L.sky, 0, 0);
  drawClouds(ctx, L.clouds, camX, t);
  ctx.drawImage(L.hills.far, -Math.round(camX * 0.25), 0);
  ctx.drawImage(L.hills.near, -Math.round(camX * 0.5), 0);
  ctx.drawImage(L.world, camX, 0, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
  ctx.drawImage(L.hazeBack, camX, 0, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
  L.leaves.render(ctx, camX, t, false);
}

/** In front of the actors: mist wisps → light haze → front leaves. */
export function renderFront(ctx, camera, t) {
  const L = getLayers();
  const camX = Math.round(camera.x);
  L.mist.render(ctx, camX, t);
  ctx.drawImage(L.hazeFront, camX, 0, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
  L.leaves.render(ctx, camX, t, true);
}
