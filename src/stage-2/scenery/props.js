// Static props baked into the Stage 2 world layer: the two wooden tables, and the quiver and
// loose arrows on the second one.
import { GROUND_Y } from '../../core/constants.js';
import { rect, px } from '../../core/draw.js';
import { TABLE_W, TABLE_TOP, ARROW_TABLE_X } from '../layout.js';

const WOOD = '#8a5e36';
const WOOD_L = '#a87644';
const WOOD_D = '#5e3e22';
const WOOD_DD = '#3e2814';

/** Trestle table centred on x: plank top, apron, two legs. */
export function drawTable(ctx, x) {
  const L = Math.round(x - TABLE_W / 2);
  rect(ctx, L + 1, GROUND_Y, TABLE_W - 2, 1, 'rgba(20,14,10,0.3)');
  // legs
  for (const lx of [L + 2, L + TABLE_W - 5]) {
    rect(ctx, lx, TABLE_TOP + 3, 3, GROUND_Y - TABLE_TOP - 3, WOOD_D);
    rect(ctx, lx, TABLE_TOP + 3, 1, GROUND_Y - TABLE_TOP - 3, WOOD);
  }
  rect(ctx, L + 4, GROUND_Y - 3, TABLE_W - 8, 1, WOOD_DD); // stretcher
  // top + apron
  rect(ctx, L, TABLE_TOP, TABLE_W, 2, WOOD);
  rect(ctx, L, TABLE_TOP, TABLE_W, 1, WOOD_L);
  rect(ctx, L + 1, TABLE_TOP + 2, TABLE_W - 2, 1, WOOD_D);
  rect(ctx, L, TABLE_TOP + 1, 1, 1, WOOD_D);
  rect(ctx, L + TABLE_W - 1, TABLE_TOP + 1, 1, 1, WOOD_D);
  for (const gx of [L + 6, L + 15]) px(ctx, gx, TABLE_TOP + 1, WOOD_D); // grain
}

/** Quiver of arrows leaning on the table, and a few arrows laid flat on top. */
export function drawArrowsOnTable(ctx) {
  const L = Math.round(ARROW_TABLE_X - TABLE_W / 2);
  const top = TABLE_TOP;
  // loose arrows lying on the table (tips right)
  for (const [ox, oy] of [[3, -1], [5, -2], [2, -3]]) {
    const y = top + oy;
    rect(ctx, L + ox + 2, y, 9, 1, '#a8743e');
    px(ctx, L + ox + 11, y, '#c9d0dc');
    px(ctx, L + ox + 12, y, '#7d8597');
    rect(ctx, L + ox, y, 2, 1, '#e8e2d4');
    px(ctx, L + ox + 1, y, '#c8323c');
  }
  // quiver standing at the right end, arrows poking out
  const qx = L + TABLE_W - 9;
  for (const [ax, h] of [[1, 5], [3, 7], [5, 4]]) {
    rect(ctx, qx + ax, top - 8 - h, 1, h, '#a8743e');
    px(ctx, qx + ax - 1, top - 8 - h, '#e8e2d4');
    px(ctx, qx + ax + 1, top - 8 - h, '#c8323c');
    px(ctx, qx + ax, top - 9 - h, '#e8e2d4');
  }
  rect(ctx, qx, top - 9, 7, 9, '#5a3a24');
  rect(ctx, qx, top - 9, 7, 1, '#7a5234');
  rect(ctx, qx + 6, top - 8, 1, 8, '#3a2414');
  rect(ctx, qx, top - 5, 7, 1, '#e8c547'); // brass band
  px(ctx, qx + 2, top - 3, '#3a2414');
}
