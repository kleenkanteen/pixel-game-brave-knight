// Health bars + floating damage numbers, with a tiny 3×5 digit font (the main font has no digits).
// Internal to the battle slice.
import { rect, withAlpha } from '../core/draw.js';

// prettier-ignore
const DIGITS = {
  0: ['###', '#.#', '#.#', '#.#', '###'],
  1: ['.#.', '##.', '.#.', '.#.', '###'],
  2: ['##.', '..#', '.#.', '#..', '###'],
  3: ['##.', '..#', '.#.', '..#', '##.'],
  4: ['#.#', '#.#', '###', '..#', '..#'],
  5: ['###', '#..', '##.', '..#', '##.'],
  6: ['.##', '#..', '###', '#.#', '###'],
  7: ['###', '..#', '.#.', '.#.', '.#.'],
  8: ['###', '#.#', '###', '#.#', '###'],
  9: ['###', '#.#', '###', '..#', '##.'],
  '-': ['...', '...', '###', '...', '...'],
  '+': ['...', '.#.', '###', '.#.', '...'],
};
const OUTLINE = '#14101c';

/** Width in px of a tiny-font string (1 px letter gap). */
export const tinyWidth = (str) => Math.max(0, String(str).length * 4 - 1);

/** Tiny 3×5 text (digits, '-', '+') with a 1 px dark outline. Returns the width. */
export function drawTiny(ctx, str, x, y, color) {
  const s = String(str);
  x = Math.round(x);
  y = Math.round(y);
  for (const pass of [0, 1]) {
    [...s].forEach((ch, i) => {
      const g = DIGITS[ch];
      if (!g) return;
      g.forEach((row, gy) => {
        for (let gx = 0; gx < 3; gx++) {
          if (row[gx] !== '#') continue;
          const X = x + i * 4 + gx;
          const Y = y + gy;
          if (pass === 0) rect(ctx, X - 1, Y - 1, 3, 3, OUTLINE);
          else rect(ctx, X, Y, 1, 1, color);
        }
      });
    });
  }
  return tinyWidth(s);
}

const fillColor = (f) => (f > 0.5 ? '#5ec24a' : f > 0.25 ? '#e8c547' : '#d0342c');

/**
 * Hero health bar centred on cx, bottom edge at `bottom`: an 18×4 bar with the HP number
 * stacked above it. Enemy bars (enemy: true) are a slimmer red bar with no number.
 */
export function drawHealthBar(ctx, cx, bottom, hp, maxHp, { enemy = false } = {}) {
  // snap the centre ONCE, so the bar, its number and the sprite below (drawn at round(x) − 8)
  // all move together pixel for pixel — rounding each part separately made them tremble
  cx = Math.round(cx);
  bottom = Math.round(bottom);
  const f = Math.max(0, Math.min(1, hp / maxHp));
  if (enemy) {
    const w = 14;
    const x = cx - w / 2;
    const y = bottom - 3;
    rect(ctx, x, y, w, 3, OUTLINE);
    rect(ctx, x + 1, y + 1, w - 2, 1, '#4a1c20');
    rect(ctx, x + 1, y + 1, Math.ceil((w - 2) * f), 1, '#e0533e');
    return;
  }
  const num = String(Math.max(0, Math.ceil(hp)));
  const bw = 18;
  const bx = cx - bw / 2;
  const by = bottom - 4;
  drawTiny(ctx, num, cx - Math.floor(tinyWidth(num) / 2), by - 6, '#f4efe2');
  rect(ctx, bx, by, bw, 4, OUTLINE);
  rect(ctx, bx + 1, by + 1, bw - 2, 2, '#4a1c20');
  rect(ctx, bx + 1, by + 1, Math.ceil((bw - 2) * f), 2, fillColor(f));
  rect(ctx, bx + 1, by + 1, Math.ceil((bw - 2) * f), 1, 'rgba(255,255,255,0.25)');
}

/** Floating "-3" style numbers that rise and fade. */
export function createDamageNumbers() {
  const list = [];
  const LIFE = 0.75;
  return {
    add(x, y, text, color) {
      list.push({ x: x + (Math.random() - 0.5) * 6, y, text, color, t: 0 });
    },
    update(dt) {
      for (let i = list.length - 1; i >= 0; i--) {
        list[i].t += dt;
        if (list[i].t >= LIFE) list.splice(i, 1);
      }
    },
    render(ctx) {
      for (const n of list) {
        const rise = Math.round(n.t * 18);
        withAlpha(ctx, Math.min(1, (LIFE - n.t) / 0.25), () =>
          drawTiny(ctx, n.text, n.x - tinyWidth(n.text) / 2, n.y - rise, n.color),
        );
      }
    },
  };
}
