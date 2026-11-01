// Stage 1 world layout (world x, px). Matches the build-spec layout table.
import { GROUND_Y, KNIGHT_W } from '../core/constants.js';


export const GRAVEYARD_X0 = 4;
export const GRAVEYARD_X1 = 100;
export const GRAVE_X = 48; // centre of the Brave Knight's grave mound (spawn)
// Mound line the knight climbs out of (the mound covers his full 16 px width from here down).
export const GRAVE_TOP_Y = GROUND_Y - 5;
export const CROSS_X = 60; // cross in front of the grave
export const SWORD_X = 76; // sword lying on the ground (centre)

export const CHURCH_X = 160; // centre, first screen
export const CHURCH_W = 76;

export const TREES_X0 = 0; // fall trees scattered 0–240 and behind the church
export const TREES_X1 = 240;

export const WHEAT_X0 = 236; // 10 Knight Widths, cut off by the first screen's right edge (320)
export const WHEAT_X1 = 396;

export const FARMER_X = 416; // centre, just after the wheat

export const FARMER_HALF_W = 8; // half the farmer's drawn width
export const HORSE_W = 48; // horse sprite width
// Horse stands 2 Knight Widths to the right of the farmer (sprite edge to sprite edge).
export const HORSE_X = FARMER_X + FARMER_HALF_W + 2 * KNIGHT_W + HORSE_W / 2;

/** World width: a horse's length of open ground after the horse, so the mount / dismount Prompts
 * above him never overlap "Move to next screen" at the right edge. */
export const WORLD_W = HORSE_X + HORSE_W / 2 + 40 + HORSE_W;
