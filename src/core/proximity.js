import { KNIGHT_W } from './constants.js';

/**
 * Proximity rule: true while the horizontal gap between the Brave Knight's body
 * and a target is ≤ 1 Knight Width (overlap counts as gap 0).
 * @param {{x:number, width:number}} knight  knight.x is the LEFT edge of his body
 * @param {number} targetX  CENTRE x of the target
 * @param {number} targetW  width of the target
 */
export function isNear(knight, targetX, targetW) {
  const kL = knight.x;
  const kR = knight.x + knight.width;
  const tL = targetX - targetW / 2;
  const tR = targetX + targetW / 2;
  const gap = Math.max(0, tL - kR, kL - tR);
  return gap <= KNIGHT_W;
}
