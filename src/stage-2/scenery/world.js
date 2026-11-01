// Builds the static Stage 2 world layer (WORLD_W × VIEW_H) once: fall trees around the practice
// range, rotted trees past the sign, ground, tables.
import { VIEW_H } from '../../core/constants.js';
import { makeCanvas } from '../../stage-1/scenery/util.js';
import { drawTree } from '../../stage-1/scenery/trees.js';
import { WORLD_W, BOW_TABLE_X, ARROW_TABLE_X } from '../layout.js';
import { drawGround } from './ground.js';
import { drawTable, drawArrowsOnTable } from './props.js';

const AUTUMN = ['yellow', 'red', 'darkred'];
const GREENS = ['green', 'green2', 'green3', 'green4'];
const ROTTED = ['violet', 'violetD', 'rotgreen', 'moss'];
const ROT_BARK = ['#3a3438', '#544a52', '#1c181e'];
const ROT_BARK_D = ['#2c2830', '#3e3842', '#141216'];

export const BACK_TREES = [
  { x: 60, h: 72, r: 18, shape: 'oak', leaves: ['red', 'darkred', 'yellow'], seed: 51 },
  { x: 206, h: 66, r: 17, shape: 'tall', leaves: AUTUMN, seed: 52 },
  { x: 372, h: 74, r: 18, shape: 'oak', leaves: GREENS, seed: 53 },
  // rotted, behind
  { x: 540, h: 78, r: 18, shape: 'dead', leaves: ROTTED, trunk: ROT_BARK_D, rot: 0.8, seed: 61 },
  { x: 650, h: 84, r: 20, shape: 'dead', leaves: ROTTED, trunk: ROT_BARK_D, rot: 1, seed: 62 },
  { x: 760, h: 72, r: 18, shape: 'dead', leaves: ROTTED, trunk: ROT_BARK_D, rot: 0.75, seed: 63 },
  { x: 870, h: 80, r: 19, shape: 'dead', leaves: ROTTED, trunk: ROT_BARK_D, rot: 1, seed: 64 },
];

export const MID_TREES = [
  { x: 22, h: 64, r: 18, shape: 'spread', leaves: ['darkred', 'red', 'yellow'], seed: 71 },
  { x: 180, h: 56, r: 14, shape: 'tall', leaves: ['yellow', 'yellow', 'red'], seed: 72 },
  { x: 404, h: 62, r: 17, shape: 'spread', leaves: AUTUMN, seed: 73 },
  // rotted
  { x: 500, h: 60, r: 16, shape: 'dead', leaves: ['moss', 'rotgreen', 'violetD'], trunk: ROT_BARK, rot: 0.6, seed: 81 },
  { x: 590, h: 70, r: 18, shape: 'dead', leaves: ROTTED, trunk: ROT_BARK, rot: 0.75, seed: 82 },
  { x: 700, h: 58, r: 15, shape: 'dead', leaves: ROTTED, trunk: ROT_BARK, rot: 1, seed: 83 },
  { x: 800, h: 74, r: 19, shape: 'dead', leaves: ROTTED, trunk: ROT_BARK, rot: 0.8, seed: 84 },
  { x: 920, h: 62, r: 16, shape: 'dead', leaves: ROTTED, trunk: ROT_BARK, rot: 0.85, seed: 85 },
];

export function buildWorld() {
  const { canvas, ctx } = makeCanvas(WORLD_W, VIEW_H);

  // back trees, hazed toward the sky for depth
  const back = makeCanvas(WORLD_W, VIEW_H);
  BACK_TREES.forEach((t) => drawTree(back.ctx, t));
  back.ctx.globalCompositeOperation = 'source-atop';
  back.ctx.globalAlpha = 0.25;
  back.ctx.fillStyle = '#c9b0a8';
  back.ctx.fillRect(0, 0, WORLD_W, VIEW_H);
  ctx.drawImage(back.canvas, 0, 0);

  MID_TREES.forEach((t) => drawTree(ctx, t));
  drawGround(ctx);
  drawTable(ctx, BOW_TABLE_X);
  drawTable(ctx, ARROW_TABLE_X);
  drawArrowsOnTable(ctx);
  return canvas;
}
