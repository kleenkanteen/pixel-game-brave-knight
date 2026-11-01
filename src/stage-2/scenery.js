// Stage 2 scenery: the same warm fall afternoon as Stage 1 over the practice range, turning
// rotted and hazy past the warning sign. Static layers are pre-rendered once (sky, parallax hills,
// world layer, haze); per frame only clouds, falling leaves and mist wisps are drawn.
// Reuses Stage 1's scenery parts (sky, clouds, hills, trees, leaves).
import { VIEW_W, VIEW_H } from '../core/constants.js';
import { buildSky, buildClouds, drawClouds, buildHills } from '../stage-1/scenery/sky.js';
import { createLeaves } from '../stage-1/scenery/leaves.js';
import { WORLD_W } from './layout.js';
import { buildWorld, BACK_TREES, MID_TREES } from './scenery/world.js';
import { buildHaze, createMist } from './scenery/haze.js';

const ALL_TREES = [...BACK_TREES, ...MID_TREES];
const fallTrees = ALL_TREES.filter((t) => t.x < 480); // before the rot zone
const rotTrees = ALL_TREES.filter((t) => t.x >= 480);

let layers = null;
function getLayers() {
  if (!layers) {
    layers = {
      sky: buildSky(),
      clouds: buildClouds(),
      hills: buildHills(WORLD_W),
      world: buildWorld(),
      hazeBack: buildHaze(0.5),
      hazeFront: buildHaze(0.17),
      mist: createMist(),
      leaves: createLeaves({ n: 34, seed: 778, trees: fallTrees }),
      rotLeaves: createLeaves({ n: 30, seed: 779, trees: rotTrees, fams: ['violet', 'violetD', 'rotgreen', 'moss'] }),
    };
  }
  return layers;
}

/**
 * Behind the actors: sky → clouds → hills (parallax) → world layer → haze → back leaves.
 * SCREEN coords; applies the camera itself.
 */
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
  L.rotLeaves.render(ctx, camX, t, false);
}

/** In front of the actors: mist wisps → light haze → front leaves. */
export function renderFront(ctx, camera, t) {
  const L = getLayers();
  const camX = Math.round(camera.x);
  L.mist.render(ctx, camX, t);
  ctx.drawImage(L.hazeFront, camX, 0, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
  L.leaves.render(ctx, camX, t, true);
  L.rotLeaves.render(ctx, camX, t, true);
}
