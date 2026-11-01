import { VIEW_W, VIEW_H } from './core/constants.js';
import { createGame } from './core/game.js';
import { createStage1 } from './stage-1/index.js';
import { createStage2 } from './stage-2/index.js';
import { createStage3 } from './stage-3/index.js';
import { createStage4 } from './stage-4/index.js';
import { createStage5 } from './stage-5/index.js';
import { createTouchControls } from './touch/index.js';
import { inject } from '@vercel/analytics';

// /game/ is proxied through the website's separate Vercel project.
// Send analytics to this game's project on both its own domain and sabih.dev.
const analyticsOrigin = 'https://brave-night-sigma.vercel.app';
inject({
  scriptSrc: `${analyticsOrigin}/_vercel/insights/script.js`,
  viewEndpoint: `${analyticsOrigin}/_vercel/insights/view`,
  eventEndpoint: `${analyticsOrigin}/_vercel/insights/event`,
});

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

/** Largest integer scale that fits the window; CSS does the upscaling (pixelated). */
function fit() {
  const fitScale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  // Phones: fill the screen (quarter steps keep the pixels nearly even); desktop: integer scale.
  const scale = document.body.classList.contains('touch')
    ? Math.max(1, Math.floor(fitScale * 4) / 4)
    : Math.max(1, Math.floor(fitScale));
  canvas.style.width = `${VIEW_W * scale}px`;
  canvas.style.height = `${VIEW_H * scale}px`;
}
window.addEventListener('resize', fit);

const game = createGame({ canvas, ctx });
createTouchControls(game.input);
fit();
game.register(createStage1());
game.register(createStage2());
game.register(createStage3());
game.register(createStage4());
game.register(createStage5());
game.goTo('stage-1');
game.start();

// Dev-only handle for tools/shoot.mjs (waitFor conditions, debugging). Stripped from builds.
if (import.meta.env.DEV) window.__game = game;
