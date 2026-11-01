// Builds the static world-space layer (WORLD_W × VIEW_H) once: trees, church, ground, wheat body, graveyard.
import { GROUND_Y, VIEW_H } from '../../core/constants.js';
import { WORLD_W } from '../layout.js';
import { makeCanvas, outline } from './util.js';
import { BACK_TREES, MID_TREES, drawTree } from './trees.js';
import { drawChurch } from './church.js';
import { drawGround } from './ground.js';
import { drawFence, drawGrave, drawStones } from './graveyard.js';
import { drawWheatBody } from './wheat.js';

function group(drawFn, outlineColor, maxY) {
  const { canvas, ctx } = makeCanvas(WORLD_W, VIEW_H);
  drawFn(ctx);
  if (outlineColor) outline(canvas, outlineColor, maxY);
  return { canvas, ctx };
}

export function buildWorld() {
  const { canvas, ctx } = makeCanvas(WORLD_W, VIEW_H);

  // trees behind the church (no outline: it would fill the gaps between leaves), hazed toward the warm sky for depth
  const back = group((c) => BACK_TREES.forEach((t) => drawTree(c, t)));
  back.ctx.globalCompositeOperation = 'source-atop';
  back.ctx.globalAlpha = 0.22;
  back.ctx.fillStyle = '#d9b9a0';
  back.ctx.fillRect(0, 0, WORLD_W, VIEW_H);
  ctx.drawImage(back.canvas, 0, 0);

  ctx.drawImage(group((c) => MID_TREES.forEach((t) => drawTree(c, t))).canvas, 0, 0);
  ctx.drawImage(group(drawChurch, '#2e2630').canvas, 0, 0);

  drawGround(ctx);
  drawWheatBody(ctx);
  drawFence(ctx);
  drawGrave(ctx);
  ctx.drawImage(group(drawStones, '#2a2430', GROUND_Y + 1).canvas, 0, 0);
  return canvas;
}
