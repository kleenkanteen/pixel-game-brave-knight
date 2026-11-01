/**
 * Stage contract. A Stage is one self-contained level (Stage 1 … Stage 6).
 *
 * @typedef {Object} Stage
 * @property {string} id               registry key, e.g. 'stage-1'
 * @property {number} worldWidth       world width in px (camera clamp, knight bounds)
 * @property {(game: Game) => void} enter   build world + slices; game gives {input, goTo}
 * @property {(dt: number) => void} update  fixed-step update (dt = 1/60 s)
 * @property {(ctx: CanvasRenderingContext2D) => void} render  draw the whole 320×180 frame
 * @property {() => void} exit         tear down (unsubscribe events etc.)
 *
 * @typedef {Object} Game
 * @property {ReturnType<import('./input.js').createInput>} input
 * @property {(id: string, patchCarry?: (carry: object) => void) => void} goTo
 * @property {(id: string, patchCarry?: (carry: object) => void) => void} transition  fade out → goTo(id) → fade in
 * @property {{horse: null|'mounted'|'following', sword:boolean, bow:boolean, weapon:null|'sword'|'bow'}} carry
 *   state carried between Stages
 *
 * The `world` a Stage builds and hands to its slices:
 * @typedef {Object} World
 * @property {ReturnType<import('./input.js').createInput>} input
 * @property {ReturnType<import('./events.js').createEvents>} events
 * @property {ReturnType<import('./camera.js').createCamera>} camera
 * @property {Object} knight     the player slice's public state object
 * @property {number} time       seconds since the Stage was entered
 * @property {number} worldWidth
 */

const noop = () => {};

/**
 * Fill defaults and check the required fields of a Stage definition.
 * @param {Partial<Stage> & {id:string, worldWidth:number}} def
 * @returns {Stage}
 */
export function defineStage(def) {
  if (!def.id) throw new Error('Stage needs an id');
  if (!(def.worldWidth > 0)) throw new Error(`Stage ${def.id} needs a worldWidth`);
  // defineProperties (not spread) so getters on `def` (e.g. a debug `world`) stay live.
  const stage = { enter: noop, update: noop, render: noop, exit: noop };
  return Object.defineProperties(stage, Object.getOwnPropertyDescriptors(def));
}
