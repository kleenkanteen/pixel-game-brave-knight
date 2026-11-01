import { VIEW_W } from '../core/constants.js';
import { drawText, measureText } from '../core/font.js';
import { rect, px, withAlpha } from '../core/draw.js';

const FADE = 0.3;
const CARD_Y = 58;
const INK = '#0a0812';
const GOLD = '#e8c547';
const GOLD_DK = '#a8801c';

/**
 * Objective slice: centred card "Objective" with the goal beneath; fades in 0.3 s,
 * holds, fades out 0.3 s — `seconds` is the total time on screen. The card slides
 * down 3 px while fading in.
 *
 * @param {import('../core/stage.js').World} world
 * @returns {{
 *   show(title:string, goal:string, seconds:number):void,  // Stage 1: show('Objective', 'Explore', 5)
 *   update(dt:number):void,
 *   render(ctx:CanvasRenderingContext2D):void,             // SCREEN coordinates
 * }}
 */
export function createObjective(world) {
  let card = null; // {title, goal, seconds, t}

  function diamond(ctx, cx, cy) {
    px(ctx, cx, cy - 1, GOLD);
    rect(ctx, cx - 1, cy, 3, 1, GOLD);
    px(ctx, cx, cy + 1, GOLD);
  }

  return {
    show(title, goal, seconds) {
      card = { title, goal, seconds, t: 0 };
    },
    update(dt) {
      if (!card) return;
      card.t += dt;
      if (card.t >= card.seconds) card = null;
    },
    render(ctx) {
      if (!card) return;
      const { t, seconds } = card;
      const alpha = Math.max(0, Math.min(1, t / FADE, (seconds - t) / FADE));
      const slide = Math.round((1 - Math.min(1, t / FADE)) * -3);
      const titleW = measureText(card.title);
      const goalW = measureText(card.goal, 2);
      const w = Math.max(titleW + 40, goalW + 32, 96);
      const h = 42;
      const x = Math.round((VIEW_W - w) / 2);
      const y = CARD_Y + slide;
      const cx = Math.round(VIEW_W / 2);

      withAlpha(ctx, alpha, () => {
        // body: translucent, with a soft darker edge
        withAlpha(ctx, 0.72, () => rect(ctx, x, y + 1, w, h - 2, '#120e1a'));
        withAlpha(ctx, 0.4, () => {
          rect(ctx, x - 1, y + 2, 1, h - 4, INK);
          rect(ctx, x + w, y + 2, 1, h - 4, INK);
        });
        // gold rules top and bottom with tapered ends
        rect(ctx, x + 2, y, w - 4, 1, GOLD);
        rect(ctx, x + 2, y + h - 1, w - 4, 1, GOLD);
        rect(ctx, x + 6, y + 1, w - 12, 1, GOLD_DK);
        rect(ctx, x + 6, y + h - 2, w - 12, 1, GOLD_DK);
        diamond(ctx, x + 1, y);
        diamond(ctx, x + w - 2, y);
        diamond(ctx, x + 1, y + h - 1);
        diamond(ctx, x + w - 2, y + h - 1);

        // "Objective" heading flanked by small rules
        const ty = y + 7;
        drawText(ctx, card.title, cx, ty, { color: GOLD, align: 'center', shadow: INK });
        const half = Math.ceil(titleW / 2);
        rect(ctx, cx - half - 12, ty + 3, 8, 1, GOLD_DK);
        rect(ctx, cx + half + 4, ty + 3, 8, 1, GOLD_DK);

        // goal, large
        drawText(ctx, card.goal, cx, y + 20, { color: '#fffaf0', align: 'center', outline: INK, scale: 2 });
      });
    },
  };
}
