import { VIEW_W } from './constants.js';

/**
 * Horizontal camera, centred on a target and clamped to [0, worldWidth − VIEW_W].
 * `x` is always an integer so world pixels stay crisp.
 * World-space drawing: ctx.translate(-camera.x, 0).
 * @param {{worldWidth:number}} opts
 */
export function createCamera({ worldWidth }) {
  const camera = {
    x: 0,
    y: 0,
    /** Centre on a world x (e.g. the knight's centre). */
    follow(targetX) {
      const max = Math.max(0, worldWidth - VIEW_W);
      camera.x = Math.max(0, Math.min(max, Math.round(targetX - VIEW_W / 2)));
    },
    toScreenX: (worldX) => worldX - camera.x,
    toWorldX: (screenX) => screenX + camera.x,
  };
  return camera;
}
