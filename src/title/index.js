import { VIEW_W, VIEW_H } from '../core/constants.js';
import { drawText, measureText } from '../core/font.js';
import { rect, px, withAlpha } from '../core/draw.js';

const LABEL = 'PLAY';
const LABEL_SCALE = 2;
const BTN_W = 64;
const BTN_H = 24;
const BTN_X = Math.round((VIEW_W - BTN_W) / 2);
const BTN_Y = Math.round((VIEW_H - BTN_H) / 2) + 10;
const PRESS_TIME = 0.12; // s the button shows pressed before 'title:play'
const FADE_OUT = 0.4; // s overlay fade after Play

// Palette
const INK = '#0a0812';
const GOLD = '#e8c547';
const GOLD_DK = '#a8801c';
const FACE = { idle: '#4a3a6a', hover: '#5e4a88', press: '#3a2d54' };
const LIGHT = { idle: '#7a68a6', hover: '#9480c4', press: '#2c2240' };
const DARK = { idle: '#2a2040', hover: '#33284e', press: '#5a4880' };

/**
 * Title slice: dim overlay over the scene, pixel title "Brave Knight" and a bevelled PLAY
 * button centred (hover highlight, pressed state). Only a click ON the button counts: it is
 * consumed, the button shows pressed for a moment, then the title hides (fading the
 * overlay) and emits 'title:play'.
 *
 * @param {import('../core/stage.js').World} world
 * @returns {{
 *   readonly active: boolean,   // true until PLAY is clicked
 *   update(dt:number):void,
 *   render(ctx:CanvasRenderingContext2D):void,  // SCREEN coordinates
 * }}
 */
export function createTitle(world) {
  let active = true;
  let hover = false;
  let pressT = -1; // ≥0 while the press animation plays
  let fadeT = -1; // ≥0 while the overlay fades after Play
  let t = 0;

  const inButton = ({ x, y }) => x >= BTN_X && x < BTN_X + BTN_W && y >= BTN_Y && y < BTN_Y + BTN_H;

  function update(dt) {
    t += dt;
    if (fadeT >= 0) {
      fadeT += dt;
      return;
    }
    if (!active) return;
    hover = inButton(world.input.mouse);
    if (pressT >= 0) {
      if (world.input.wasClicked()) world.input.consumeClick();
      pressT += dt;
      if (pressT >= PRESS_TIME) {
        active = false;
        fadeT = 0;
        world.events.emit('title:play');
      }
      return;
    }
    if (hover && world.input.wasClicked()) {
      world.input.consumeClick();
      pressT = 0;
    }
  }

  function drawButton(ctx, state) {
    const down = state === 'press' ? 1 : 0;
    const x = BTN_X;
    const y = BTN_Y + down;
    // drop shadow (smaller when pressed)
    withAlpha(ctx, 0.6, () => rect(ctx, x + 1, BTN_Y + 2 + down, BTN_W, BTN_H - down, INK));
    // 1px dark frame with clipped corners
    rect(ctx, x + 1, y, BTN_W - 2, BTN_H, INK);
    rect(ctx, x, y + 1, BTN_W, BTN_H - 2, INK);
    // face
    rect(ctx, x + 1, y + 1, BTN_W - 2, BTN_H - 2, FACE[state]);
    // bevel: light top/left, dark bottom/right
    rect(ctx, x + 1, y + 1, BTN_W - 2, 1, LIGHT[state]);
    rect(ctx, x + 1, y + 1, 1, BTN_H - 2, LIGHT[state]);
    rect(ctx, x + 1, y + BTN_H - 2, BTN_W - 2, 1, DARK[state]);
    rect(ctx, x + BTN_W - 2, y + 1, 1, BTN_H - 2, DARK[state]);
    // gold inner rim when hovered
    if (state === 'hover') {
      rect(ctx, x + 3, y + 3, BTN_W - 6, 1, GOLD_DK);
      rect(ctx, x + 3, y + BTN_H - 4, BTN_W - 6, 1, GOLD_DK);
      rect(ctx, x + 3, y + 3, 1, BTN_H - 6, GOLD_DK);
      rect(ctx, x + BTN_W - 4, y + 3, 1, BTN_H - 6, GOLD_DK);
    }
    // label
    const lw = measureText(LABEL, LABEL_SCALE);
    const lx = x + Math.round((BTN_W - lw) / 2);
    const ly = y + Math.round((BTN_H - 7 * LABEL_SCALE) / 2);
    const col = state === 'hover' ? '#fff3c4' : state === 'press' ? '#d8c890' : '#f2e6c4';
    drawText(ctx, LABEL, lx, ly, { color: col, shadow: INK, scale: LABEL_SCALE });
    // little sword-point arrows beside the label when hovered
    if (state === 'hover') {
      const bob = Math.floor(t * 4) % 2;
      const ay = y + Math.floor(BTN_H / 2) - 1;
      for (let i = 0; i < 3; i++) {
        px(ctx, x - 5 - bob + i, ay - 2 + i, GOLD);
        px(ctx, x - 5 - bob + i, ay + 2 - i, GOLD);
        px(ctx, x + BTN_W + 4 + bob - i, ay - 2 + i, GOLD);
        px(ctx, x + BTN_W + 4 + bob - i, ay + 2 - i, GOLD);
      }
    }
  }

  function drawTitle(ctx) {
    const y = BTN_Y - 46;
    const cx = VIEW_W / 2;
    // deep shadow, then gold with outline
    drawText(ctx, 'Brave Knight', cx + 2, y + 2, { color: INK, align: 'center', scale: 3 });
    drawText(ctx, 'Brave Knight', cx, y, { color: GOLD, align: 'center', outline: INK, scale: 3 });
    // highlight band on the upper glyph rows: redraw clipped
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y, VIEW_W, 6);
    ctx.clip();
    drawText(ctx, 'Brave Knight', cx, y, { color: '#fff0a8', align: 'center', scale: 3 });
    ctx.restore();
    // ornament line under the title
    const w = measureText('Brave Knight', 3);
    const ly = y + 7 * 3 + 6;
    rect(ctx, Math.round(cx - w / 2), ly, w, 1, GOLD_DK);
    rect(ctx, Math.round(cx) - 2, ly - 1, 4, 3, GOLD);
    px(ctx, Math.round(cx) - 3, ly, GOLD);
    px(ctx, Math.round(cx) + 2, ly, GOLD);
  }

  function render(ctx) {
    let a = 1;
    if (!active) {
      if (fadeT < 0 || fadeT >= FADE_OUT) return;
      a = 1 - fadeT / FADE_OUT;
    }
    withAlpha(ctx, a, () => {
      withAlpha(ctx, 0.5, () => rect(ctx, 0, 0, VIEW_W, VIEW_H, INK));
      // soft vignette bands top/bottom
      withAlpha(ctx, 0.35, () => {
        rect(ctx, 0, 0, VIEW_W, 14, INK);
        rect(ctx, 0, VIEW_H - 14, VIEW_W, 14, INK);
      });
      drawTitle(ctx);
      const state = pressT >= 0 || !active ? 'press' : hover ? 'hover' : 'idle';
      drawButton(ctx, state);
    });
  }

  return {
    get active() {
      return active;
    },
    update,
    render,
  };
}
