// Stage 4 world layout (world x, px): the edge of the rotted woods → the sign → the mouth of the
// Lord's Lair → the open cavern (one screen, seven monsters) → a low tunnel → the Hydra's chamber
// (two screens) with a ledge you can climb to by ladder.
import { GROUND_Y } from '../core/constants.js';

export const WORLD_W = 1280; // four screens

/** The knight walks in from off the left edge to here. */
export const ENTER_X = 20;

export const SIGN_X = 150;
/** The cave mouth: rock overhead from here on (darkness creeps in). */
export const MOUTH_X = 236;
/** The open cavern: one screen wide. */
export const CAVERN_X0 = 270;
export const CAVERN_X1 = 560;
/** The low tunnel into the chamber. */
export const TUNNEL_X0 = 560;
export const TUNNEL_X1 = 640;
/** The Hydra's chamber: two screens wide. */
export const CHAMBER_X0 = 640;

/** Higher ground: a rock shelf, reached by a ladder at its left end. The floor blast can't reach it. */
export const LEDGE = { x0: 860, x1: 1000, y: GROUND_Y - 44, ladderX: 874 };
/**
 * Two rock platforms above the ledge, a jump apart (a jump clears ~30 px up and ~30 px across):
 * ledge → the right one → back left to the top one, level with the Hydra's chin when it charges.
 */
export const PLATFORMS = [
  { x0: 1012, x1: 1064, y: GROUND_Y - 70 },
  { x0: 940, x1: 998, y: GROUND_Y - 94 },
];
/** Everything he can stand on above the floor (one-way: jump up through, land on top). */
export const SHELVES = [LEDGE, ...PLATFORMS];

/** The Hydra's body (centre), against the back wall; it wakes when he comes this far. */
export const HYDRA_X = 1222;
export const HYDRA_WAKE_X = 780;
/** He can't walk into the Hydra (right clamp for knight.x): right up to its front claws. */
export const KNIGHT_MAX_X = HYDRA_X - 66;

/** Seven monsters of three kinds in the open cavern; the Pterodactyls keep to its open air. */
const SKY = { x0: CAVERN_X0 + 10, x1: CAVERN_X1 - 10 };
export const MONSTERS = [
  { kind: 'crawler', x: 330 },
  { kind: 'ptero', x: 380, ...SKY },
  { kind: 'golem', x: 420 },
  { kind: 'crawler', x: 456 },
  { kind: 'ptero', x: 492, ...SKY },
  { kind: 'crawler', x: 520 },
  { kind: 'golem', x: 546 },
];

/** Wall torches (bracket position): dim pools of light down the cave. */
export const TORCHES = [
  { x: 262, y: 104 },
  { x: 352, y: 94 },
  { x: 462, y: 90 },
  { x: 548, y: 100 },
  { x: 606, y: 112 },
  { x: 690, y: 100 },
  { x: 800, y: 90 },
  { x: 940, y: 72 },
  { x: 1090, y: 100 },
];

/** Floor under world x for feet at y: the top of the nearest shelf at or below him, else the ground. */
export function floorAt(x, y) {
  let floor = GROUND_Y;
  for (const s of SHELVES) if (x >= s.x0 && x <= s.x1 && y <= s.y + 0.5 && s.y < floor) floor = s.y;
  return floor;
}

/** Bottom of the rock ceiling at world x (null: open sky). */
export function ceilAt(x) {
  const keys = [
    [MOUTH_X - 44, 0],
    [MOUTH_X, 92],
    [MOUTH_X + 26, 92],
    [300, 36],
    [380, 28],
    [450, 40],
    [520, 30],
    [548, 50],
    [TUNNEL_X0 + 14, 86],
    [600, 90],
    [TUNNEL_X1 - 8, 84],
    [700, 14],
    [820, 6],
    [960, 10],
    [1100, 4],
    [WORLD_W, 8],
  ];
  if (x < keys[0][0]) return null;
  for (let i = 1; i < keys.length; i++) {
    const [x1, y1] = keys[i];
    const [x0, y0] = keys[i - 1];
    if (x <= x1) {
      const p = (x - x0) / (x1 - x0);
      // straight slope for the cliff brow, smooth curves inside
      const e = i === 1 ? p : (1 - Math.cos(p * Math.PI)) / 2;
      return y0 + (y1 - y0) * e;
    }
  }
  return keys[keys.length - 1][1];
}

/** How dark the cave is at world x (0 outside → 0.64 inside). */
export function darkAt(x) {
  const p = Math.max(0, Math.min(1, (x - (MOUTH_X - 20)) / 110));
  return p * p * (3 - 2 * p) * 0.64;
}
