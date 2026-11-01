// Stone church facade centred on CHURCH_X: aisles with lean-to roofs, nave with pitched gable roof,
// tower + slate spire + gold cross behind the gable, rose window, arched door, lancet windows.
// Symmetric convention: half-width k covers columns CX−k … CX+k−1.
import { GROUND_Y } from '../../core/constants.js';
import { rect, px } from '../../core/draw.js';
import { CHURCH_X, CHURCH_W } from '../layout.js';
import { hash2, paintRow, drawMask, dither } from './util.js';

const G = GROUND_Y;
const CX = CHURCH_X;
const L0 = CHURCH_X - CHURCH_W / 2; // 122
const R0 = CHURCH_X + CHURCH_W / 2 - 1; // 197
const NAVE_HW = 26;
const WALL_TOP = G - 46; // 104: nave eave line
const APEX = WALL_TOP - 26; // 78: top row of the stone gable
const TOWER_HW = 8;
const TOWER_TOP = G - 100; // 50
const SPIRE_TOP = TOWER_TOP - 24; // 26
const AISLE_INNER = CX - NAVE_HW - 1; // last aisle column next to the nave (left side)

const C = {
  mortar: '#655c55',
  mortarDk: '#544c46',
  stone: ['#a89f90', '#9a9183', '#b4ab9b', '#8f877a'],
  stoneDk: ['#8d8577', '#80786c', '#978e80', '#766f64'],
  stoneHi: '#c4bcab',
  stoneHi2: '#d6cebc',
  roof: '#4d4256',
  roofHi: '#66587a',
  roofDk: '#30283a',
  glassD: '#1f2e48',
  glass: '#33608a',
  glassHi: '#9fd0e4',
  amber: '#a8702e',
  glow: '#f0c062',
  lead: '#2a2630',
  wood: '#6a4226',
  woodD: '#432814',
  woodHi: '#8a5a32',
  iron: '#2b2528',
  gold: '#e8c252',
  goldD: '#a07a24',
  goldHi: '#fff0a0',
  dark: '#1c171c',
};

function stone(x, y, pal = C.stone, mortar = C.mortar) {
  const course = Math.floor(y / 4);
  const ry = y - course * 4;
  if (ry === 3) return mortar;
  const off = course & 1 ? 4 : 0;
  const bx = Math.floor((x + off) / 8);
  const rx = (x + off) % 8;
  if (rx === 7) return mortar;
  const h = hash2(bx, course);
  if (ry === 0 && rx < 3 && h > 0.55) return C.stoneHi;
  return pal[Math.floor(h * pal.length)];
}
const st = (x, y) => stone(x, y);
const sd = (x, y) => stone(x, y, C.stoneDk, C.mortarDk);
const mirrorX = (x) => 2 * CX - 1 - x;

/** Arch half-width for row `rel` (0 = top) of a semicircle of radius R. */
function archHW(rel, R) {
  if (rel >= R) return R;
  return Math.floor(Math.sqrt(R * R - (R - rel - 0.5) ** 2) + 0.5);
}

function aisleRoofTop(x) {
  // left aisle column x: outer edge low (G−30), rising to G−37 at the nave
  const x0 = L0 - 2;
  const t = (x - x0) / (AISLE_INNER + 2 - x0);
  return Math.round(G - 30 - t * 7);
}

function lancet(ctx, wl, wt, w, h, leadCol) {
  const rows = [];
  for (let r = 0; r < h; r++) rows.push(r === 0 ? [w / 2 - 1, w / 2] : r === 1 ? [1, w - 2] : [0, w - 1]);
  // light stone frame (one row above, one column either side) + sill
  const frame = [rows[0], ...rows.map(([a, b]) => [a - 1, b + 1])];
  drawMask(ctx, wl, wt - 1, frame, () => C.stoneHi);
  rect(ctx, wl - 1, wt + h, w + 2, 1, C.stoneHi2);
  const transom = Math.floor(h * 0.55);
  drawMask(ctx, wl, wt, rows, (rx, ry, row) => {
    const x = wl + rx;
    const y = wt + ry;
    if (ry === transom || rx === leadCol) return C.lead;
    if (ry > transom) return dither(x, y, 0.45) ? C.glow : C.amber;
    if (rx === row[0] && ry > 1) return C.glass;
    if (rx === leadCol - 1 && ry === 3) return C.glassHi;
    return C.glassD;
  });
}

export function drawChurch(ctx) {
  // --- spire + cross ---
  const spireH = TOWER_TOP - 3 - SPIRE_TOP;
  for (let y = SPIRE_TOP; y <= TOWER_TOP - 3; y++) {
    const hw = 1 + Math.floor(((y - SPIRE_TOP) * 9) / spireH);
    paintRow(ctx, y, CX - hw, CX + hw - 1, (x) => {
      if ((y - SPIRE_TOP) % 3 === 2 && (x + y) % 2 === 0) return C.roofDk;
      return x < CX ? C.roofHi : C.roof;
    });
  }
  rect(ctx, CX - 1, TOWER_TOP - 12, 2, 3, C.dark); // little louvre
  rect(ctx, CX - 1, SPIRE_TOP - 12, 2, 12, C.gold);
  rect(ctx, CX - 4, SPIRE_TOP - 9, 8, 2, C.gold);
  rect(ctx, CX, SPIRE_TOP - 12, 1, 12, C.goldD);
  rect(ctx, CX - 4, SPIRE_TOP - 8, 8, 1, C.goldD);
  px(ctx, CX - 1, SPIRE_TOP - 12, C.goldHi);
  px(ctx, CX - 4, SPIRE_TOP - 9, C.goldHi);

  // --- tower ---
  rect(ctx, CX - TOWER_HW - 1, TOWER_TOP - 2, TOWER_HW * 2 + 2, 2, C.stoneHi);
  rect(ctx, CX - TOWER_HW - 1, TOWER_TOP - 1, TOWER_HW * 2 + 2, 1, C.stone[3]);
  for (let y = TOWER_TOP; y < WALL_TOP; y++) {
    paintRow(ctx, y, CX - TOWER_HW, CX + TOWER_HW - 1, (x) => (x >= CX + 4 ? sd(x, y) : st(x, y)));
  }
  // belfry opening with bell
  const bt = TOWER_TOP + 4;
  for (let r = 0; r < 14; r++) paintRow(ctx, bt + r, CX - archHW(r, 5), CX + archHW(r, 5) - 1, () => C.stoneHi);
  for (let r = 0; r < 12; r++) paintRow(ctx, bt + 1 + r, CX - archHW(r, 4), CX + archHW(r, 4) - 1, () => C.dark);
  const yb = bt + 5;
  rect(ctx, CX - 1, yb, 2, 1, C.goldD);
  rect(ctx, CX - 2, yb + 1, 4, 3, C.gold);
  rect(ctx, CX - 3, yb + 4, 6, 1, C.gold);
  rect(ctx, CX + 1, yb + 1, 1, 4, C.goldD);
  px(ctx, CX - 2, yb + 1, C.goldHi);
  rect(ctx, CX - 1, yb + 5, 2, 1, C.goldD);
  rect(ctx, CX - 6, bt + 14, 12, 1, C.stoneHi2);

  // --- aisles (column-wise so walls stop under the lean-to roofs) ---
  for (let x = L0; x <= AISLE_INNER; x++) {
    const top = aisleRoofTop(x) + 2;
    for (let y = top; y < G; y++) {
      px(ctx, x, y, st(x, y));
      const mx = mirrorX(x);
      px(ctx, mx, y, st(mx, y));
    }
  }

  // --- nave + stone gable ---
  for (let y = APEX; y < G; y++) {
    const hw = y < WALL_TOP ? y - APEX + 1 : NAVE_HW;
    paintRow(ctx, y, CX - hw, CX + hw - 1, st);
  }

  // aisle lean-to roofs
  for (let x = L0 - 2; x <= AISLE_INNER + 2; x++) {
    const top = aisleRoofTop(x);
    for (const [xx, hi] of [
      [x, C.roofHi],
      [mirrorX(x), C.roof],
    ]) {
      rect(ctx, xx, top, 1, 2, (xx + top) % 3 === 0 ? C.roofDk : hi);
      px(ctx, xx, top + 2, C.roofDk);
    }
  }

  // buttresses at the nave corners
  for (const bx of [CX - NAVE_HW - 2, CX + NAVE_HW - 2]) {
    rect(ctx, bx, WALL_TOP + 2, 4, G - WALL_TOP - 2, '#b8af9f');
    rect(ctx, bx, WALL_TOP + 2, 1, G - WALL_TOP - 2, C.stoneHi2);
    rect(ctx, bx + 3, WALL_TOP + 2, 1, G - WALL_TOP - 2, '#968d80');
    for (let y = WALL_TOP + 7; y < G; y += 6) rect(ctx, bx, y, 4, 1, C.mortar);
  }

  // plinth
  for (let y = G - 3; y < G; y++) paintRow(ctx, y, L0, R0, sd);

  // --- gable roof trim (pitched roof edge, 6 px thick) ---
  for (let y = APEX - 6; y <= WALL_TOP + 2; y++) {
    const hwo = y - (APEX - 6) + 1;
    const hwi = hwo - 6;
    paintRow(ctx, y, CX - hwo, CX + hwo - 1, (x) => {
      const dist = x < CX ? CX - x : x - CX + 1;
      if (dist <= hwi) return null;
      const k = dist - hwi;
      if (k === 1) return C.roofDk;
      if (k > 2 && (x + y) % 3 === 0) return C.roofDk;
      return x < CX ? C.roofHi : C.roof;
    });
  }

  // --- rose window ---
  const rcx = CX - 0.5;
  const rcy = APEX + 13;
  for (let y = rcy - 8; y <= rcy + 8; y++) {
    paintRow(ctx, y, CX - 9, CX + 8, (x) => {
      const dx = x - rcx;
      const dy = y - rcy;
      const d = Math.hypot(dx, dy);
      if (d > 7.6) return null;
      if (d > 6.6) return C.lead;
      if (d > 5.6) return C.stoneHi;
      if (d < 1.2) return C.gold;
      if (d > 2.6 && d < 3.4) return C.lead;
      const a = Math.atan2(dy, dx) + Math.PI;
      const seg = (a / (Math.PI * 2)) * 8;
      const sector = Math.floor(seg) % 8;
      if (d > 3 && Math.min(seg % 1, 1 - (seg % 1)) < 0.13) return C.lead;
      if (d <= 2.6) return sector % 2 ? '#c8423a' : C.glow;
      if (dx < -2 && dy < -2 && d < 5) return '#7fb0e0';
      return sector % 2 ? '#3b5f9a' : '#b03a3a';
    });
  }

  // --- side windows ---
  lancet(ctx, CX - 20, WALL_TOP + 7, 6, 18, 2);
  lancet(ctx, CX + 14, WALL_TOP + 7, 6, 18, 3);
  lancet(ctx, L0 + 4, G - 24, 4, 12, 9);
  lancet(ctx, R0 - 7, G - 24, 4, 12, 9);

  // --- arched door ---
  const doorTop = G - 26;
  for (let r = 0; r < 26; r++) paintRow(ctx, doorTop - 2 + r, CX - archHW(r, 8), CX + archHW(r, 8) - 1, (x, y) =>
    r < 6 && (x - CX + 8) % 3 === 0 ? '#b0a796' : C.stoneHi);
  for (let r = 0; r < 23; r++) {
    const hw = archHW(r, 6);
    paintRow(ctx, doorTop + r, CX - hw, CX + hw - 1, (x, y) => {
      const rx = x - (CX - 6);
      if (rx === 5 || rx === 6) return '#2a1810';
      if (y === doorTop + 8 || y === doorTop + 17) return C.iron;
      if (rx % 3 === 2) return C.woodD;
      return rx % 3 === 0 ? C.woodHi : C.wood;
    });
  }
  px(ctx, CX - 3, doorTop + 12, C.gold);
  px(ctx, CX + 2, doorTop + 12, C.gold);
  rect(ctx, CX - 10, G - 3, 20, 3, '#b2a998');
  rect(ctx, CX - 10, G - 3, 20, 1, C.stoneHi2);
  rect(ctx, CX - 12, G - 1, 24, 1, '#9a917f');
}
