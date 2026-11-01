// The three ability icons (14×14), drawn once into offscreen canvases so the HUD can draw them
// dimmed and reveal the recharged part from the bottom up. Internal to the abilities slice.
import { rect, line } from '../core/draw.js';

export const ICON = 14;

// prettier-ignore
const BOLT = [
  '..............',
  '.......OOOOO..',
  '......OYYYO...',
  '.....OYWYO....',
  '....OYWYO.....',
  '...OYWYOOOOO..',
  '..OYYYYYYYYO..',
  '..OOOOOYYYO...',
  '......OYYO....',
  '.....OYYO.....',
  '.....OYO......',
  '....OYO.......',
  '....OO........',
  '..............',
];

// prettier-ignore
const CROSS = [
  '......WW......',
  '.....OYYO.....',
  '.....OYWO.....',
  '..OOOOYWOOOO..',
  '..OYYYWWYYYO..',
  '..OYWWWWWWYO..',
  '..OOOOYWOOOO..',
  '.....OYWO.....',
  '.....OYYO.....',
  '.....OYYO.....',
  '.....OYYO.....',
  '.....OOOO.....',
  '..............',
  '..............',
];

function paint(ctx, rows, colors) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (colors[row[x]]) rect(ctx, x, y, 1, 1, colors[row[x]]);
  });
}

function canvas(draw) {
  const c = document.createElement('canvas');
  c.width = ICON;
  c.height = ICON;
  draw(c.getContext('2d'));
  return c;
}

/** Background: a two-tone square so each icon reads as a tile. */
function tile(ctx, top, bottom) {
  rect(ctx, 0, 0, ICON, ICON / 2, top);
  rect(ctx, 0, ICON / 2, ICON, ICON / 2, bottom);
}

/** One arrow pointing down-and-right-ish: fletching at (x, y), head 9 px lower. */
function arrow(ctx, x, y) {
  line(ctx, x, y + 1, x + 2, y + 8, '#a07a4a');
  rect(ctx, x - 1, y, 1, 2, '#f0ebe0');
  rect(ctx, x + 1, y, 1, 2, '#f0ebe0');
  rect(ctx, x + 1, y + 8, 3, 1, '#c9d0dc');
  rect(ctx, x + 2, y + 9, 1, 2, '#c9d0dc');
}

let icons = null;
/** [Lightning Strike, Arrow Storm, Blessed Touch] icon canvases. */
export function getIcons() {
  if (icons) return icons;
  icons = [
    canvas((c) => {
      tile(c, '#2a3a6e', '#1c264a');
      paint(c, BOLT, { O: '#14101c', Y: '#ffe25a', W: '#ffffff' });
    }),
    canvas((c) => {
      tile(c, '#2e4a2a', '#1e321c');
      arrow(c, 2, 0);
      arrow(c, 6, 3);
      arrow(c, 9, 1);
      rect(c, 0, 12, ICON, 2, '#3e2a1a'); // the ground they land in
    }),
    canvas((c) => {
      tile(c, '#6a5420', '#4a3a16');
      paint(c, CROSS, { O: '#14101c', Y: '#ffd84a', W: '#fff8d0' });
    }),
  ];
  return icons;
}
