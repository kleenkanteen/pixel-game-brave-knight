import { STEP } from './constants.js';

/**
 * Fixed 60 Hz update, render once per requestAnimationFrame.
 * @param {{update(dt:number):void, render():void}} hooks
 */
export function createLoop({ update, render }) {
  let acc = 0;
  let last = 0;
  let rafId = 0;

  function frame(now) {
    const dt = Math.min(0.25, (now - last) / 1000); // avoid spiral after tab switch
    last = now;
    acc += dt;
    while (acc >= STEP) {
      update(STEP);
      acc -= STEP;
    }
    render();
    rafId = requestAnimationFrame(frame);
  }

  return {
    start() {
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      cancelAnimationFrame(rafId);
    },
  };
}
