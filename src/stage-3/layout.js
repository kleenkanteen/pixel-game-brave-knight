// Stage 3 world layout (world x, px): deep in the rotted woods, a battle already under way.
// Everything in the fight is on the first screen, so it's in view the moment he walks in.

export const WORLD_W = 480; // a screen and a half

/** The knight walks in from off the left edge to here. */
export const ENTER_X = 20;

/** The three fellow adventurers (centre x), holding the line facing right. */
export const ALLIES = { archer: 92, mage: 120, holy: 152 };

/** The monsters (starting centre x): the pack up front, the Dark Mage at the back. */
export const MONSTERS = { zombies: [196, 214, 234], werewolf: 256, darkMage: 296 };
