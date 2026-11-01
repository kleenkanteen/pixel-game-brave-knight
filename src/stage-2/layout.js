// Stage 2 world layout (world x, px): practice range → warning sign → the rotted woods.
import { GROUND_Y, KNIGHT_W } from '../core/constants.js';

export const WORLD_W = 960; // three screens

/** The knight walks in from off the left edge to here. */
export const ENTER_X = 20;

export const TABLE_W = 26;
export const TABLE_H = 10;
export const TABLE_TOP = GROUND_Y - TABLE_H; // top row of both tables
export const BOW_TABLE_X = 112; // centre: the bow lies on it
export const ARROW_TABLE_X = 158; // centre: a quiver and loose arrows

/** Three round targets, 2 Knight Widths apart (edge to edge). */
const TARGET_FACE_W = 12;
export const TARGET_XS = [252, 252 + TARGET_FACE_W + 2 * KNIGHT_W, 252 + 2 * (TARGET_FACE_W + 2 * KNIGHT_W)];

export const SIGN_X = 440;

/** Past the sign the woods rot: blend from ROT_X0 (fall) to ROT_X1 (fully rotted). */
export const ROT_X0 = 456;
export const ROT_X1 = 600;

/** 0 (fall) … 1 (rotted) at world x. */
export function rotAt(x) {
  const p = Math.max(0, Math.min(1, (x - ROT_X0) / (ROT_X1 - ROT_X0)));
  return p * p * (3 - 2 * p);
}
