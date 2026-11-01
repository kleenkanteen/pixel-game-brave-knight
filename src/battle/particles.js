// Tiny particle pool for battle effects (orb sparkles, embers, explosions, hit bursts).
// Internal to the battle slice.
import { rect } from '../core/draw.js';

/**
 * add({x, y, vx, vy, life, colors, g?, drag?, size?}) — colours run first → last over the life.
 * @returns {{add(p:object):void, update(dt:number):void, render(ctx:CanvasRenderingContext2D):void}}
 */
export function createParticles() {
  const list = [];

  function add(p) {
    list.push({ g: 0, drag: 0, size: 1, ...p, t: 0 });
  }

  function update(dt) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.t += dt;
      if (p.t >= p.life) {
        list.splice(i, 1);
        continue;
      }
      if (p.drag) {
        const k = Math.exp(-p.drag * dt);
        p.vx *= k;
        p.vy *= k;
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  function render(ctx) {
    for (const p of list) {
      const c = p.colors[Math.min(p.colors.length - 1, Math.floor((p.t / p.life) * p.colors.length))];
      rect(ctx, p.x, p.y, p.size, p.size, c);
    }
  }

  return { add, update, render };
}

/** Burst of `n` particles from (x, y). */
export function burst(particles, x, y, n, { colors, speed = 60, up = 30, g = 200, life = [0.3, 0.6], size = 1, drag = 0 }) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.6);
    particles.add({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v * 0.7 - up * Math.random(),
      life: life[0] + Math.random() * (life[1] - life[0]),
      colors,
      g,
      size: typeof size === 'number' ? size : Math.random() < 0.5 ? size[0] : size[1],
      drag,
    });
  }
}
