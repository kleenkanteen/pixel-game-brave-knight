import { VIEW_W, VIEW_H } from './core/constants.js';
import { createGame } from './core/game.js';
import { createStage1 } from './stage-1/index.js';
import { createStage2 } from './stage-2/index.js';
import { createStage3 } from './stage-3/index.js';
import { createStage4 } from './stage-4/index.js';
import { createStage5 } from './stage-5/index.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

/** Largest integer scale that fits the window; CSS does the upscaling (pixelated). */
function fit() {
  const scale = Math.max(1, Math.floor(Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H)));
  canvas.style.width = `${VIEW_W * scale}px`;
  canvas.style.height = `${VIEW_H * scale}px`;
}
window.addEventListener('resize', fit);
fit();

const game = createGame({ canvas, ctx });
game.register(createStage1());
game.register(createStage2());
game.register(createStage3());
game.register(createStage4());
game.register(createStage5());
game.goTo('stage-1');
game.start();

// Dev-only handle for tools/shoot.mjs (waitFor conditions, debugging). Stripped from builds.
if (import.meta.env.DEV) window.__game = game;
