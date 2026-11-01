// Single source of truth for shared numbers (see tickets/assets/build-spec.md).

/** Internal resolution in pixels. */
export const VIEW_W = 320;
export const VIEW_H = 180;

/** Top of the walkable ground: the Brave Knight's feet stand on this y. */
export const GROUND_Y = 150;

/** Knight Width: the Brave Knight's body width, the world's distance unit. */
export const KNIGHT_W = 16;
export const KNIGHT_H = 24;

/** Movement (px/s, px/s²). Instant start/stop; same speed in the air. */
export const WALK_SPEED = 70;
/** Riding the horse: WALK_SPEED × this. */
export const MOUNTED_SPEED_MULT = 1.5;
export const JUMP_VY = -190;
export const GRAVITY = 600;

/** Duration of one Strike swing, seconds (shared by player pose + sword arc). */
export const STRIKE_TIME = 0.25;

/** Fixed update step (60 Hz). */
export const STEP = 1 / 60;
