import { GROUND_Y } from '../core/constants.js';
import { drawText } from '../core/font.js';
import { rect, withAlpha } from '../core/draw.js';

const FADE = 0.4;
const INK = '#0a0812';
const GOLD = '#e8c547';

/**
 * Edge hint: a left arrow + text pinned to the left of the screen while `when()` is true
 * (fades in / out, arrow nudges left).
 *
 * @param {import('../core/stage.js').World} world
 * @param {{text:string, when:()=>boolean}} opts
 * @returns {{update(dt:number):void, render(ctx:CanvasRenderingContext2D):void}}  // render in SCREEN coords
 */
export function createHint(world, { text, when }) {
  let a = 0;
  let t = 0;
  return {
    update(dt) {
      t += dt;
      a = Math.max(0, Math.min(1, a + (when() ? dt : -dt) / FADE));
    },
    render(ctx) {
      if (a <= 0) return;
      const nudge = Math.round(Math.sin(t * 5) * 1.5);
      const x = 6 + nudge;
      const y = GROUND_Y - 44;
      withAlpha(ctx, a, () => {
        // left arrow: 5 px tall head with a 2 px shaft
        for (let i = 0; i < 3; i++) rect(ctx, x + i, y + 2 - i, 1, 1 + i * 2, GOLD);
        rect(ctx, x + 3, y + 1, 7, 3, GOLD);
        drawText(ctx, text, x + 14, y - 1, { color: '#fffaf0', outline: INK });
      });
    },
  };
}
