// Stage 5 world layout (world x, px; y = world y, the ground at GROUND_Y): out of the Lord's Lair →
// the approach (one screen) → the moat and its drawbridge → the gatehouse (guards on top) → the
// castle's inner court (one screen) → a second, open gate → the plaza: one zoomed-out 960×540
// screen, its top far above the ground (negative y), with twenty-three platforms and the Dark Lord's
// balcony at the top right.
import { GROUND_Y, KNIGHT_W } from '../core/constants.js';

/** The plaza's zoomed-out view: x from PLAZA_VIEW_X, y from TOP_Y, 3× the 320×180 view. */
export const ZOOM = 3;
export const PLAZA_VIEW_X = 1200;
export const TOP_Y = GROUND_Y + 30 - 180 * ZOOM; // -360: the top of the zoomed-out view
export const WORLD_W = PLAZA_VIEW_X + 320 * ZOOM; // 2160

/** The knight walks in from off the left edge (out of the cave mouth) to here. */
export const ENTER_X = 24;
/** The cliff the cave is cut into, at the left edge. */
export const CLIFF_X1 = 46;

/** The moat, spanned by the drawbridge (its deck is the ground: y = GROUND_Y). */
export const MOAT_X0 = 356;
export const MOAT_X1 = 712;

/**
 * The gatehouse: two towers (tops at towerTop) round a gate arch, with a walkway between them
 * (top at walkTop). The portcullis fills [gateX0, gateX1] from archTop to the ground.
 */
export const GATEHOUSE = { x0: 712, x1: 840, towerW: 36, towerTop: 40, walkTop: 58, gateX0: 752, gateX1: 800, archTop: 96 };
/** Before the guards fall he can't pass the portcullis. */
export const GATE1_MAX_X = GATEHOUSE.gateX0 - KNIGHT_W - 2;

/** The inner court, then the second gate's wall (its portcullis is up: it drops once he's through). */
export const COURT_X0 = 840;
export const GATE2 = { x0: 1176, x1: 1216, gateX0: 1180, gateX1: 1212, archTop: 100, wallTop: -40 };
/** Once his left edge is past this, the second gate shuts behind the party. */
export const PLAZA_IN_X = GATE2.x1 + 26;
/** The horse waits outside the plaza: the furthest right its sprite's left edge goes. */
export const HORSE_MAX_X = GATE2.x0 - 48 - 6;
/** Riding, he must get off before the second gate (the horse stays outside). */
export const RIDE_MAX_X = GATE2.x0 - KNIGHT_W - 26;

/** The plaza: open ground between the second gate and the keep. */
export const PLAZA_X0 = GATE2.x1;
export const KEEP_X0 = 2070;
export const PLAZA_X1 = KEEP_X0;

/** The Dark Lord's balcony, high on the keep: he steps out of the door to stand at x. */
export const BALCONY = { x0: 1996, x1: 2122, y: -230, x: 2040, doorX: 2104 };

/** Where the Dark Lord flies (x range) and the top of the view. */
export const ARENA = { x0: PLAZA_X0, x1: KEEP_X0, top: TOP_Y };

/**
 * Twenty-three floating rune-stone platforms in the plaza (one-way: jump straight up through them;
 * a jump clears ~30 px). A stair climbs in from each side, each step STEP px up, topped by a long
 * slab (the first ten; open floor round the ritual circle between them). From each slab a short
 * zigzag climbs to a high walkway over the circle, and from its left end a staircase climbs up to
 * the right to a perch three-quarters of the way up the view (y −228), under the Dark Lord's sweep.
 * Each step up the climb is RISE px, with a gap of ≤12 px between neighbours.
 */
const STEP = 24;
const RISE = 26;
const stair = (x0s, w) => x0s.map((x0, i) => ({ x0, x1: x0 + w[i], y: GROUND_Y - STEP * (i + 1) }));
const SLAB_Y = GROUND_Y - STEP * 5; // 30
const climb = (spans, from) => spans.map(([x0, x1], i) => ({ x0, x1, y: from - RISE * (i + 1) }));
export const PLATFORMS = [
  ...stair([1262, 1304, 1344, 1384, 1428], [54, 52, 52, 56, 92]),
  ...stair([1970, 1930, 1890, 1846, 1766], [54, 52, 52, 56, 92]),
  // the zigzags up from each slab
  ...climb([[1496, 1546], [1556, 1604], [1494, 1544]], SLAB_Y),
  ...climb([[1740, 1790], [1682, 1730], [1742, 1792]], SLAB_Y),
  // the high walkway over the ritual circle (y −74), then the staircase up to the perch
  ...climb([[1554, 1732]], SLAB_Y - RISE * 3),
  ...climb([[1494, 1544], [1554, 1602], [1612, 1660], [1670, 1718], [1728, 1776]], SLAB_Y - RISE * 4),
  { x0: 1786, x1: 1846, y: -228 },
];

/** Floor under world x for feet at y: the top of the nearest platform at or below him, else the ground. */
export function floorAt(x, y) {
  let floor = GROUND_Y;
  for (const p of PLATFORMS) if (x >= p.x0 && x <= p.x1 && y <= p.y + 0.5 && p.y < floor) floor = p.y;
  return floor;
}

/** The gate's guards: three Skeleton Archers on the gatehouse, Reptilians + Werewolves on the bridge. */
const ON_BRIDGE = { x0: 300, x1: GATEHOUSE.gateX0 - 8 };
export const GUARDS = [
  { kind: 'skeleton', x: GATEHOUSE.x0 + 18, air: GROUND_Y - GATEHOUSE.towerTop },
  { kind: 'skeleton', x: (GATEHOUSE.gateX0 + GATEHOUSE.gateX1) / 2, air: GROUND_Y - GATEHOUSE.walkTop },
  { kind: 'skeleton', x: GATEHOUSE.x1 - 18, air: GROUND_Y - GATEHOUSE.towerTop },
  { kind: 'reptile', x: 470, ...ON_BRIDGE },
  { kind: 'werewolf', x: 540 },
  { kind: 'reptile', x: 600, ...ON_BRIDGE },
  { kind: 'werewolf', x: 655 },
  { kind: 'reptile', x: 700, ...ON_BRIDGE },
];

/** Wall torches (orange) and braziers (purple fire) — light sources, drawn over the moonlight. */
export const TORCHES = [
  { x: GATEHOUSE.gateX0 - 8, y: 104 },
  { x: GATEHOUSE.gateX1 + 8, y: 104 },
  { x: 900, y: 108 },
  { x: 1060, y: 100 },
  { x: GATE2.x0 - 8, y: 108 },
];
export const BRAZIERS = [1250, 1480, 1808, 2040];
/** The ritual circle on the plaza floor (centre x). */
export const RUNE_X = (PLATFORMS[4].x1 + PLATFORMS[9].x0) / 2;
/** The chapel's rose window over the plaza (centre). */
export const ROSE = { x: RUNE_X, y: -86, r: 28 };
