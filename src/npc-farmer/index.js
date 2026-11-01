import { GROUND_Y } from '../core/constants.js';
import { isNear } from '../core/proximity.js';
import { rect, px } from '../core/draw.js';

const BODY_W = 12; // body width (proximity + knight clamp)
const SPRITE_W = 16; // drawn width (hat brim / arms / pitchfork reach a little wider)
const SPRITE_H = 26; // hat top → boot soles
const BLINK_EVERY = 3.7;
const BLINK_TIME = 0.13;

/** First talk: the full conversation, one panel per line. */
const CONVERSATION = [
  ['Farmer: Hey, who are you?'],
  ['Knight: Your friendly neighborhood knight.'],
  ["Farmer: Didn't all of you die a hundred years ago?"],
  ['Knight: I think so. I feel great though. Anyways, do you know where I am?'],
  [
    'Farmer: You are in the lands of Lusiria. Any point after this is dangerous, though. But if you seek glory and adventure, you will find it there.',
  ],
  [
    "Knight: Glory? That's my middle name. Can I borrow your horse, by the way? If I come back alive, I'll give you a hundred gold coins.",
  ],
  ['Farmer: ...'],
  ['Farmer: ..........'],
  ['Farmer: Okay, but bring him back safe, please.'],
];
/** Talking to him again after that. */
const REPEAT = [['Farmer: Bring him back safe, please.']];

const C = {
  straw: '#e8c86a',
  strawL: '#f6e3a0',
  strawD: '#b8923c',
  band: '#a83a2c',
  skin: '#d39a6a',
  skinD: '#a8704a',
  hair: '#6b4a2e',
  eye: '#2a1c14',
  cheek: '#c97a5a',
  shirt: '#c0392b',
  shirtD: '#8c2a20',
  plaid: '#f0d0b0',
  denim: '#3d64a8',
  denimL: '#5a82c4',
  denimD: '#2a4678',
  button: '#e8c547',
  boot: '#4a3020',
  bootD: '#2e1d12',
  wood: '#8a5e36',
  woodD: '#5e3e22',
  steel: '#b4bac6',
  steelD: '#7a8090',
  shadow: 'rgba(20,14,10,0.3)',
};

/**
 * Farmer slice (NPC at the end of Stage 1): straw hat, plaid shirt, blue overalls, boots,
 * pitchfork; idle breathing bob + occasional blink; turns to face the knight when he is near.
 *   - Knight near (proximity rule) and no Dialogue open → Prompt "Press space to talk" above the FARMER.
 *   - Interact → the CONVERSATION (Dialogue 'farmer'); afterwards a short REPEAT line.
 *   - `near` is true while the knight is in talking range; the horse reads it so that
 *     talking to the farmer takes precedence over mounting. Update BEFORE the horse.
 *
 * @param {import('../core/stage.js').World} world
 * @param {{
 *   x:number,  // centre x
 *   prompts:{show(text:string, worldX:number, topY:number):void},
 *   dialogue:{play(id:string, panels:string[][]):void, isOpen():boolean},
 * }} opts
 * @returns {{
 *   readonly near:boolean,  // knight within talking range this tick
 *   update(dt:number):void,
 *   render(ctx:CanvasRenderingContext2D):void,  // WORLD coordinates
 * }}
 */
export function createFarmer(world, { x, prompts, dialogue }) {
  let t = 0;
  let talked = false;
  let facing = 1; // 1 = looking right (over his land), −1 = left (towards the knight)
  let near = false;

  function update(dt) {
    t += dt;
    const { knight, input } = world;
    near = !!knight && knight.visible !== false && isNear(knight, x, BODY_W);
    if (near) facing = knight.x + knight.width / 2 < x ? -1 : 1;
    else facing = Math.sin(t * 0.3) > -0.85 ? 1 : -1; // mostly gazes over the land, glances back now and then
    if (!knight.controlsEnabled || dialogue.isOpen() || !near) return;
    prompts.show('Press space to talk', x, GROUND_Y - SPRITE_H - 5); // clear of the pitchfork tines
    if (input.wasPressed('interact')) {
      dialogue.play('farmer', talked ? REPEAT : CONVERSATION);
      talked = true;
    }
  }

  function render(ctx) {
    const ox = Math.round(x - SPRITE_W / 2);
    const oy = GROUND_Y - SPRITE_H;
    const f = facing;
    // local (facing right) → world, mirrored for facing −1
    const P = (lx, ly, w, h, c) => rect(ctx, f === 1 ? ox + lx : ox + SPRITE_W - lx - w, oy + ly, w, h, c);
    const D = (lx, ly, c) => P(lx, ly, 1, 1, c);

    const b = Math.sin(t * 2.2) > 0.35 ? 1 : 0; // breathing: upper body sinks 1px
    const blink = t % BLINK_EVERY < BLINK_TIME || (t + 0.3) % (BLINK_EVERY * 3) < BLINK_TIME;

    // ground shadow
    rect(ctx, ox + 2, GROUND_Y, SPRITE_W - 3, 1, C.shadow);

    // --- pitchfork (behind the front hand): shaft at local x 13
    P(13, 1 + b, 1, 25 - b, C.wood);
    P(13, 14 + b, 1, 11 - b, C.woodD);
    P(11, -1 + b, 5, 1, C.steelD); // crossbar
    D(13, 0 + b, C.steelD);
    for (const tx of [11, 13, 15]) {
      P(tx, -5 + b, 1, 4, C.steel);
      D(tx, -5 + b, C.steelD);
    }

    // --- back arm (hangs at his side)
    P(3, 12 + b, 2, 4, C.shirtD);
    P(3, 16 + b, 2, 2, C.skinD);

    // --- legs + boots (fixed to the ground)
    P(4, 19, 3, 4, C.denim);
    P(9, 19, 3, 4, C.denimD);
    P(4, 19, 1, 4, C.denimD);
    P(3, 23, 4, 3, C.boot);
    P(9, 23, 4, 3, C.bootD);
    P(3, 25, 4, 1, C.bootD);
    P(6, 23, 1, 1, C.bootD);

    // --- torso: plaid shirt
    P(4, 11 + b, 8, 7, C.shirt);
    for (let r = 0; r < 7; r += 2) P(4, 11 + b + r, 8, 1, C.shirtD); // horizontal checks
    for (const cx of [5, 8, 11]) P(cx, 11 + b, 1, 7, C.plaid); // vertical checks
    for (let r = 0; r < 7; r += 2) for (const cx of [5, 8, 11]) D(cx, 11 + b + r, C.shirtD);
    P(7, 11 + b, 2, 1, C.skin); // open collar

    // --- overalls: pants up to the waist, bib, straps, buttons
    P(4, 17 + b, 8, 3 - b, C.denim);
    P(4, 17 + b, 1, 3 - b, C.denimD);
    P(6, 13 + b, 5, 4, C.denim);
    P(6, 13 + b, 5, 1, C.denimL);
    P(7, 15 + b, 2, 1, C.denimD); // bib pocket
    D(5, 11 + b, C.denim);
    D(5, 12 + b, C.denim);
    D(10, 11 + b, C.denim);
    D(10, 12 + b, C.denim);
    D(6, 13 + b, C.button);
    D(10, 13 + b, C.button);
    P(7, 19, 2, 1, C.denimD); // crotch seam

    // --- head
    P(6, 10 + b, 4, 1, C.skinD); // neck
    P(5, 4 + b, 6, 6, C.skin);
    P(5, 4 + b, 1, 6, C.skinD);
    P(5, 5 + b, 2, 2, C.hair); // sideburn under the hat
    D(6, 7 + b, C.skinD); // ear
    D(11, 7 + b, C.skin); // nose
    D(11, 8 + b, C.skinD);
    if (blink) P(9, 6 + b, 2, 1, C.skinD);
    else {
      D(9, 6 + b, C.eye);
      D(10, 5 + b, C.hair); // bushy brow
      D(9, 5 + b, C.hair);
    }
    D(9, 7 + b, C.cheek);
    P(8, 9 + b, 3, 1, C.skinD); // smiling mouth / stubble
    D(10, 8 + b, C.skinD);

    // --- straw hat: crown, band, wide brim with weave highlights
    P(5, 0 + b, 6, 3, C.straw);
    P(6, -1 + b, 4, 1, C.straw);
    P(6, -1 + b, 3, 1, C.strawL);
    P(5, 0 + b, 1, 3, C.strawD);
    P(5, 2 + b, 6, 1, C.band);
    P(1, 3 + b, 14, 1, C.straw);
    P(2, 3 + b, 3, 1, C.strawL);
    P(10, 3 + b, 3, 1, C.strawL);
    P(0, 4 + b, 2, 1, C.strawD);
    P(14, 4 + b, 2, 1, C.strawD);
    D(4, 4 + b, C.strawD);
    D(11, 4 + b, C.strawD);

    // --- front arm: sleeve from the shoulder forward to the fist around the shaft
    P(10, 11 + b, 2, 3, C.shirt);
    D(11, 12 + b, C.plaid);
    P(11, 14 + b, 2, 1, C.shirtD);
    P(12, 14 + b, 1, 1, C.skin);
    P(12, 15 + b, 3, 2, C.skin); // fist wraps the pitchfork shaft
    D(13, 16 + b, C.skinD);
    D(14, 15 + b, C.skinD);
  }

  return {
    get near() {
      return near;
    },
    update,
    render,
  };
}
