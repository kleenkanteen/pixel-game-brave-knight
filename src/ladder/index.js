import { GROUND_Y, KNIGHT_W } from '../core/constants.js';
import { rect, px } from '../core/draw.js';

const W = 12; // rail to rail
const RUNG_EVERY = 6;
const ABOVE = 12; // px the rails stick up above the ledge (something to grab at the top)
const REACH = KNIGHT_W; // px from the ladder (either side of its centre) that he can use it

const C = {
  rail: '#7a5634',
  railL: '#94704a',
  railD: '#4e341e',
  rung: '#8a643e',
  rope: '#c8b08a',
};

/**
 * Ladder slice: a wooden ladder from the floor up to a ledge (optional higher ground).
 *   - On the floor at its foot, or on the ledge at its top (within REACH), on foot, no Dialogue:
 *     Prompt "Press space to climb ladder" / "Press space to climb down"; Interact → the knight
 *     climbs it (player.startLadder). Riding: "Press v to dismount to climb" instead.
 *   - `near` is true while he's at it (the horse yields Interact to it).
 *
 * @param {import('../core/stage.js').World} world
 * @param {{x:number, topY:number,  // centre x; topY = the ledge's top (where he stands up there)
 *          prompts:{show(text:string, worldX:number, topY:number):void},
 *          dialogue:{isOpen():boolean},
 *          player:{startLadder(x:number, toY:number, onDone?:()=>void):void}}} opts
 * @returns {{readonly near:boolean, update(dt:number):void, render(ctx:CanvasRenderingContext2D):void}}
 *   render: WORLD coords, behind the actors
 */
export function createLadder(world, { x, topY, prompts, dialogue, player }) {
  let near = false;

  function update() {
    const k = world.knight;
    const cx = k.x + k.width / 2;
    const atBottom = Math.abs(k.y - GROUND_Y) < 1;
    const atTop = Math.abs(k.y - topY) < 1;
    near = k.visible && k.onGround && !k.onLadder && Math.abs(cx - x) <= REACH && (atBottom || atTop);
    if (!near || !k.controlsEnabled || dialogue.isOpen()) return;
    if (k.mounted) {
      prompts.show('Press space to dismount to climb', cx, k.y - k.height, { interact: false }); // Space: the horse lets him off
      return;
    }
    prompts.show(atBottom ? 'Press space to climb ladder' : 'Press space to climb down', cx, k.y - k.height);
    if (world.input.wasPressed('interact')) player.startLadder(x, atBottom ? topY : GROUND_Y);
  }

  function render(ctx) {
    const top = topY - ABOVE;
    const l = Math.round(x - W / 2);
    const r = l + W - 2;
    for (const rx of [l, r]) {
      rect(ctx, rx, top, 2, GROUND_Y - top, C.rail);
      rect(ctx, rx, top, 1, GROUND_Y - top, C.railL);
      rect(ctx, rx, top, 2, 1, C.railD);
    }
    for (let y = GROUND_Y - 4; y > top + 2; y -= RUNG_EVERY) {
      rect(ctx, l + 2, y, W - 4, 1, C.rung);
      rect(ctx, l + 2, y + 1, W - 4, 1, C.railD);
      px(ctx, l + 1, y, C.rope);
      px(ctx, r, y, C.rope);
    }
  }

  return {
    get near() {
      return near;
    },
    update,
    render,
  };
}
