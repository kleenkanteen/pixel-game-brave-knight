import { VIEW_W, KNIGHT_W } from '../core/constants.js';
import { drawText, measureText } from '../core/font.js';
import { rect, withAlpha } from '../core/draw.js';

const SHOW_WITHIN = 3 * KNIGHT_W; // hint shows once he is this close to the right bound
const PUSH_TIME = 0.2; // s he must keep pushing right against the bound to leave
const FADE = 0.25;
const TEXT = 'Move to next screen';
const TEXT_Y = 92;
const COLOR = '#fff6d8';
const GOLD = '#e8c547';
const OUTLINE = '#14101c';

/**
 * Exit slice: the way out on the right edge of a Stage.
 *   - Knight within 3 Knight Widths of his right bound → "Move to next screen" and a nudging
 *     arrow on the right edge of the screen (fades in / out).
 *   - He keeps pushing right against the bound (no Dialogue open) → knight.autoWalk = 1 (he walks
 *     on off the screen) and onExit() once (the Stage starts the transition).
 *
 * @param {import('../core/stage.js').World} world
 *   - enabled() false (e.g. before a Stage's fight is won) → no hint and no way out yet.
 *   - world.exitNear mirrors whether the hint is up (the horse hides its own hint meanwhile, so
 *     the two never overlap).
 *
 * @param {{dialogue:{isOpen():boolean}, onExit:()=>void, enabled?:()=>boolean}} deps
 * @returns {{update(dt:number):void, render(ctx:CanvasRenderingContext2D):void}}  render: SCREEN coords
 */
export function createExit(world, { dialogue, onExit, enabled = () => true }) {
  let t = 0;
  let alpha = 0;
  let pushT = 0;
  let gone = false;

  function update(dt) {
    t += dt;
    const k = world.knight;
    const open = enabled();
    const near = open && k.controlsEnabled && !gone && k.x >= k.boundR - SHOW_WITHIN;
    world.exitNear = near;
    alpha = Math.max(0, Math.min(1, alpha + (near ? dt : -dt) / FADE));
    if (!open || gone || !k.controlsEnabled || dialogue.isOpen()) return;
    pushT = k.blockedRight ? pushT + dt : 0;
    if (pushT >= PUSH_TIME) {
      gone = true;
      k.autoWalk = 1;
      onExit();
    }
  }

  /** Chunky right-pointing arrow: shaft + head, 9 px tall. */
  function arrow(ctx, x, y, c) {
    rect(ctx, x, y + 3, 7, 3, c);
    for (let i = 0; i < 5; i++) rect(ctx, x + 6 + i, y + i, 1, 9 - i * 2, c);
  }

  function render(ctx) {
    if (alpha <= 0) return;
    const nudge = Math.floor(t * 3) % 2;
    const w = measureText(TEXT);
    const ax = VIEW_W - 16 + nudge;
    const tx = VIEW_W - 20 - w;
    withAlpha(ctx, alpha, () => {
      withAlpha(ctx, 0.55, () => rect(ctx, tx - 5, TEXT_Y - 4, w + 33, 17, OUTLINE));
      drawText(ctx, TEXT, tx, TEXT_Y, { color: COLOR, outline: OUTLINE });
      // arrow with a dark outline
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) arrow(ctx, ax + ox, TEXT_Y - 1 + oy, OUTLINE);
      arrow(ctx, ax, TEXT_Y - 1, GOLD);
    });
  }

  return { update, render };
}
