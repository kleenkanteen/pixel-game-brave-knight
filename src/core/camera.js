import { VIEW_W, VIEW_H } from './constants.js';

/**
 * Camera: centred on a target and clamped to [0, worldWidth − viewW].
 * `x` is always an integer so world pixels stay crisp; `y` is the top of the view (0 unless a
 * Stage looks higher, e.g. Stage 5's plaza, where it goes negative).
 * `zoom` is world px per screen (UI) px: 1 normally (the 320×180 view); 3 shows a 960×540 view.
 * Screen (UI) coordinates — the mouse, the HUD — stay 320×180 whatever the zoom.
 * World-space drawing: ctx.translate(-camera.x, -camera.y) (at zoom 1 only x matters).
 * @param {{worldWidth:number}} opts
 */
export function createCamera({ worldWidth }) {
  const camera = {
    x: 0,
    y: 0,
    zoom: 1,
    /** World px across / down the view. */
    get viewW() {
      return Math.round(VIEW_W * camera.zoom);
    },
    get viewH() {
      return Math.round(VIEW_H * camera.zoom);
    },
    /** Centre on a world x (e.g. the knight's centre). */
    follow(targetX) {
      const max = Math.max(0, worldWidth - camera.viewW);
      camera.x = Math.max(0, Math.min(max, Math.round(targetX - camera.viewW / 2)));
    },
    toScreenX: (worldX) => (worldX - camera.x) / camera.zoom,
    toWorldX: (screenX) => camera.x + screenX * camera.zoom,
    toWorldY: (screenY) => camera.y + screenY * camera.zoom,
  };
  return camera;
}
