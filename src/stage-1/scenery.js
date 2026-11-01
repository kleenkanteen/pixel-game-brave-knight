// Stage 1 scenery: warm fall afternoon. Static layers are pre-rendered once to offscreen canvases
// (sky, parallax hills, world layer with trees / church / graveyard / ground / wheat body);
// per frame only clouds, swaying wheat stalks and falling leaves are drawn.
// Parts live in ./scenery/: util, sky (sky/clouds/hills), trees, church, graveyard, ground, wheat, leaves, world.
import { VIEW_W, VIEW_H } from '../core/constants.js';
import { buildSky, buildClouds, drawClouds, buildHills } from './scenery/sky.js';
import { buildWorld } from './scenery/world.js';
import { createWheat } from './scenery/wheat.js';
import { createLeaves } from './scenery/leaves.js';
import { BACK_TREES, MID_TREES } from './scenery/trees.js';

let layers = null;
function getLayers() {
  if (!layers) {
    layers = {
      sky: buildSky(),
      clouds: buildClouds(),
      hills: buildHills(),
      world: buildWorld(),
      wheat: createWheat(),
      leaves: createLeaves({ trees: [...BACK_TREES, ...MID_TREES] }),
    };
  }
  return layers;
}

/**
 * Everything behind the actors: sky → clouds → hills (parallax) → world layer
 * (trees, church, ground, graveyard/grave/cross, wheat body) → swaying wheat → back leaves.
 * Draws in SCREEN coords, applying the camera itself (so layers can parallax).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x:number}} camera
 * @param {number} t  seconds
 */
export function renderBack(ctx, camera, t) {
  const L = getLayers();
  const camX = Math.round(camera.x);
  ctx.drawImage(L.sky, 0, 0);
  drawClouds(ctx, L.clouds, camX, t);
  ctx.drawImage(L.hills.far, -Math.round(camX * 0.25), 0);
  ctx.drawImage(L.hills.near, -Math.round(camX * 0.5), 0);
  ctx.drawImage(L.world, camX, 0, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
  L.wheat.renderBack(ctx, camX, t);
  L.leaves.render(ctx, camX, t, false);
}

/**
 * In front of the actors: foreground wheat tufts → front leaves.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x:number}} camera
 * @param {number} t
 */
export function renderFront(ctx, camera, t) {
  const L = getLayers();
  const camX = Math.round(camera.x);
  L.wheat.renderFront(ctx, camX, t);
  L.leaves.render(ctx, camX, t, true);
}
