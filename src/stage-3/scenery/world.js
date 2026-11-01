// Builds the static Stage 3 world layer (WORLD_W × VIEW_H) once: rotted trees all the way, sour
// ground, a few gravestone-like rocks. Reuses the Stage 1 tree painter and Stage 2 ground.
import { VIEW_H, GROUND_Y } from '../../core/constants.js';
import { rect, px } from '../../core/draw.js';
import { makeCanvas } from '../../stage-1/scenery/util.js';
import { drawTree } from '../../stage-1/scenery/trees.js';
import { drawGround } from '../../stage-2/scenery/ground.js';
import { WORLD_W } from '../layout.js';

const ROTTED = ['violet', 'violetD', 'rotgreen', 'moss'];
const ROT_BARK = ['#3a3438', '#544a52', '#1c181e'];
const ROT_BARK_D = ['#2c2830', '#3e3842', '#141216'];

const BACK_TREES = [
  { x: 30, h: 82, r: 19, shape: 'dead', leaves: ROTTED, trunk: ROT_BARK_D, rot: 0.9, seed: 301 },
  { x: 140, h: 76, r: 18, shape: 'dead', leaves: ROTTED, trunk: ROT_BARK_D, rot: 1, seed: 302 },
  { x: 250, h: 86, r: 20, shape: 'dead', leaves: ROTTED, trunk: ROT_BARK_D, rot: 0.85, seed: 303 },
  { x: 350, h: 78, r: 18, shape: 'dead', leaves: ROTTED, trunk: ROT_BARK_D, rot: 1, seed: 304 },
  { x: 450, h: 84, r: 19, shape: 'dead', leaves: ROTTED, trunk: ROT_BARK_D, rot: 0.9, seed: 305 },
];

const MID_TREES = [
  { x: 6, h: 66, r: 17, shape: 'dead', leaves: ROTTED, trunk: ROT_BARK, rot: 0.8, seed: 311 },
  { x: 330, h: 70, r: 18, shape: 'dead', leaves: ROTTED, trunk: ROT_BARK, rot: 0.9, seed: 312 },
  { x: 410, h: 60, r: 16, shape: 'dead', leaves: ['moss', 'rotgreen', 'violetD'], trunk: ROT_BARK, rot: 0.7, seed: 313 },
];

/** A mossy boulder half sunk in the ground. */
function drawRock(ctx, x, w, h) {
  for (let i = 0; i < h; i++) {
    const half = Math.round((w / 2) * Math.sqrt(1 - ((h - i) / h) ** 2));
    rect(ctx, x - half, GROUND_Y - h + i, half * 2, 1, i < 2 ? '#5a5462' : '#46404e');
    px(ctx, x - half, GROUND_Y - h + i, '#2e2a34');
  }
  rect(ctx, x - w / 4, GROUND_Y - h, w / 3, 1, '#3a4226');
  px(ctx, x + 1, GROUND_Y - h + 2, '#2e2a34');
}

export function buildWorld() {
  const { canvas, ctx } = makeCanvas(WORLD_W, VIEW_H);

  const back = makeCanvas(WORLD_W, VIEW_H);
  BACK_TREES.forEach((t) => drawTree(back.ctx, t));
  back.ctx.globalCompositeOperation = 'source-atop';
  back.ctx.globalAlpha = 0.3;
  back.ctx.fillStyle = '#5a4e6a';
  back.ctx.fillRect(0, 0, WORLD_W, VIEW_H);
  ctx.drawImage(back.canvas, 0, 0);

  MID_TREES.forEach((t) => drawTree(ctx, t));
  drawGround(ctx, { width: WORLD_W, rot: () => 1, seed: 303 });
  drawRock(ctx, 58, 10, 5);
  drawRock(ctx, 372, 14, 6);
  drawRock(ctx, 440, 8, 4);
  return canvas;
}
