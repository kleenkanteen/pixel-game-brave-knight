import { drawText, measureText, GLYPH_H } from '../core/font.js';
import { VIEW_W } from '../core/constants.js';

const GAP_ABOVE = 6; // px between the target's head and the bottom of the text
const BOB_SPEED = 3; // rad/s
const COLOR = '#fff6d8';
const KEY_COLOR = '#e8c547'; // "space" / "Click" highlighted
const OUTLINE = '#14101c';
const KEY_WORDS = /^(space|Space|Click|click|v|V|B|Q)$/;

/**
 * Prompt slice: short hints above a character, following the camera.
 *
 * Usage: whoever wants a Prompt calls `show()` during its update, every tick it should
 * be visible (the proximity check lives with the caller, via core/proximity.js isNear).
 * `update()` must run AFTER all other slices' updates in the tick: it commits that tick's
 * requests. `render()` draws the committed Prompts. (Committing on update rather than
 * clearing on render avoids flicker on frames that run 0 or 2 fixed updates.)
 * Drawn in the pixel font with a 1px dark outline and a gentle 1px bob; the key word
 * ("space", "Click", "v", "B", "Q") is gold.
 *
 * @param {import('../core/stage.js').World} world
 * @returns {{
 *   show(text:string, worldX:number, topY:number):void,  // centred on worldX, ~6px above topY
 *   update(dt:number):void,
 *   render(ctx:CanvasRenderingContext2D):void,           // WORLD coordinates
 * }}
 */
export function createPrompts(world) {
  let pending = [];
  let visible = [];
  let t = 0;

  function drawPrompt(ctx, text, x, y) {
    // outline pass for the whole string first so word outlines never overlap neighbours' ink
    drawText(ctx, text, x, y, { color: OUTLINE, outline: OUTLINE });
    let cx = x;
    const words = text.split(' ');
    words.forEach((word, i) => {
      const w = drawText(ctx, word, cx, y, { color: KEY_WORDS.test(word) ? KEY_COLOR : COLOR });
      cx += w + (i < words.length - 1 ? measureText(' ') + 2 : 0); // space glyph (3) + 2 letter gaps
    });
  }

  return {
    show(text, worldX, topY) {
      pending.push({ text, x: worldX, y: topY });
    },
    update(dt) {
      t += dt;
      visible = pending;
      pending = [];
      // something to interact with: space interacts instead of jumping (read by the player next tick)
      world.interactable = visible.some((p) => /\bspace\b/i.test(p.text));
    },
    render(ctx) {
      const camX = world.camera.x;
      const bob = Math.sin(t * BOB_SPEED) > 0 ? -1 : 0;
      for (const p of visible) {
        // centred over the target, but nudged to stay fully on screen
        const w = measureText(p.text);
        const left = Math.round(p.x - w / 2);
        const x = Math.max(camX + 2, Math.min(camX + (world.camera.viewW ?? VIEW_W) - 2 - w, left));
        drawPrompt(ctx, p.text, x, Math.round(p.y) - GAP_ABOVE - GLYPH_H + bob);
      }
    },
  };
}
