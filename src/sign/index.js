import { GROUND_Y } from '../core/constants.js';
import { isNear } from '../core/proximity.js';
import { rect, px } from '../core/draw.js';

const W = 26; // board width
const H = 14; // board height
const TOP = GROUND_Y - 30; // board top
const SIGN_TEXT = ['Warning!', 'Monsters ahead. Proceed with caution.', 'The Dark Lord lives beyond here.'];
const KNIGHT_LINE = ['Knight: Shiver me timbers. Just what I was looking for.'];

const C = {
  plank: '#7a5634',
  plankL: '#94704a',
  plankD: '#4e341e',
  post: '#5a3c22',
  postD: '#3a2614',
  paint: '#b02a24',
  paintD: '#6e1a18',
  ink: '#2a1c12',
  nail: '#9aa0aa',
};

/**
 * Sign slice: a weathered warning sign on a post.
 *   - Knight near (proximity rule) + no Dialogue → Prompt "Press space to read sign" above it.
 *   - Interact → the sign's text as a centred Dialogue ('sign', heading in red); the first time it
 *     closes the Brave Knight answers it (Dialogue 'sign-knight').
 *   - `near` is true while the knight is in reading range (the horse yields Interact to it).
 *   - The board is an arrow collider (bow slice): arrows stick in it.
 *
 * @param {import('../core/stage.js').World} world
 * `text` / `reply` replace the Stage 2 warning and the knight's answer (another sign elsewhere).
 * @param {{x:number, text?:string[], reply?:string[], prompts:{show(text:string, worldX:number, topY:number):void},
 *          dialogue:{open(id:string, lines:string[], opts?:object):void, isOpen():boolean}}} opts
 * @returns {{readonly near:boolean, collider:{hit(x:number, y:number):boolean},
 *            update(dt:number):void, render(ctx:CanvasRenderingContext2D):void}}
 */
export function createSign(world, { x, text = SIGN_TEXT, reply = KNIGHT_LINE, prompts, dialogue }) {
  let near = false;
  let answered = false;
  const left = Math.round(x - W / 2);

  world.events.on('dialogue:closed', ({ id }) => {
    if (id !== 'sign' || answered) return;
    answered = true;
    dialogue.open('sign-knight', reply);
  });

  function update() {
    const k = world.knight;
    near = k.visible && isNear(k, x, W);
    if (!k.controlsEnabled || dialogue.isOpen() || !near) return;
    prompts.show('Press space to read sign', x, TOP);
    if (world.input.wasPressed('interact')) dialogue.open('sign', text, { align: 'center', heading: true });
  }

  const collider = {
    hit: (ax, ay) => ax >= left && ax < left + W && ay >= TOP && ay < TOP + H,
  };

  function render(ctx) {
    // post
    rect(ctx, x - 1, TOP + H, 3, GROUND_Y - TOP - H, C.post);
    rect(ctx, x + 1, TOP + H, 1, GROUND_Y - TOP - H, C.postD);
    rect(ctx, x - 2, GROUND_Y - 1, 5, 1, C.postD);
    // board: two planks, slightly askew (right end sags 1 px)
    rect(ctx, left, TOP, W, H, C.plank);
    rect(ctx, left, TOP, W, 1, C.plankL);
    rect(ctx, left, TOP + 6, W, 1, C.plankD); // plank seam
    rect(ctx, left, TOP + H - 1, W, 1, C.plankD);
    rect(ctx, left + W - 1, TOP + 1, 1, H - 1, C.plankD);
    rect(ctx, left + 14, TOP + H, 12, 1, C.plankD); // sag
    for (const [nx, ny] of [[1, 2], [W - 3, 2], [1, H - 3], [W - 3, H - 3]]) px(ctx, left + nx, TOP + ny, C.nail);
    // cracks / grain
    rect(ctx, left + 5, TOP + 3, 4, 1, C.plankD);
    rect(ctx, left + 17, TOP + 9, 5, 1, C.plankD);
    // painted red "!" and scrawled lines of text
    rect(ctx, left + 4, TOP + 3, 2, 6, C.paint);
    rect(ctx, left + 4, TOP + 10, 2, 2, C.paint);
    px(ctx, left + 5, TOP + 8, C.paintD);
    for (const [lx, ly, lw] of [[9, 3, 13], [9, 7, 10], [9, 10, 12]]) {
      for (let i = 0; i < lw; i++) if ((i * 7 + ly) % 5 !== 0) px(ctx, left + lx + i, TOP + ly + ((i >> 2) & 1), C.ink);
    }
  }

  return {
    get near() {
      return near;
    },
    collider,
    update,
    render,
  };
}
