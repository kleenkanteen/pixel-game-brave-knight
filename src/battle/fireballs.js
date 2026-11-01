// The Dark Mage's fireballs. A cast marks the ground where its target stands with a spinning
// fire vortex (the warning); the fireball rises off the top of the screen and, FUSE seconds after
// the cast, crashes down on the mark and explodes. Whoever is still standing there is hurt.
// Internal to the battle slice.
import { GROUND_Y } from '../core/constants.js';
import { px, disc, withAlpha } from '../core/draw.js';
import { ellipse } from './paint.js';
import { burst } from './particles.js';

export const FUSE = 3; // s from cast to impact
const FALL_TIME = 0.42; // s of the fireball's final plunge
const RISE_TIME = 0.5; // s the launched fireball is seen rising
const BLAST_R = 13; // px either side of the mark that the explosion reaches
const FLASH_TIME = 0.2;
const SCORCH_TIME = 4;

const FIRE = ['#ffffff', '#ffe07a', '#ff8a2a', '#d0342c', '#5a2420'];
const SMOKE = ['#6a5e6e', '#4e4454', '#3a3240'];
const DIRT = ['#3a2a2c', '#2c2224'];

/**
 * @param {{particles:ReturnType<import('./particles.js').createParticles>,
 *          onExplode:(x:number, radius:number)=>void}} deps
 */
export function createFireballs({ particles, onExplode }) {
  const spells = []; // {fromX, fromY, tx, t, dir}
  const flashes = []; // {x, t}
  const scorches = []; // {x, t}

  /** Launch from the staff (fromX, fromY) at a mark on the ground at tx. */
  function cast(fromX, fromY, tx) {
    spells.push({ fromX, fromY, tx: Math.round(tx), t: 0, dir: Math.sign(tx - fromX) || 1 });
  }

  function fallPos(s) {
    const p = Math.max(0, (s.t - (FUSE - FALL_TIME)) / FALL_TIME);
    return { x: s.tx - s.dir * (1 - p) * 34, y: -12 + (GROUND_Y - 1 + 12) * p * p };
  }

  function update(dt) {
    for (let i = spells.length - 1; i >= 0; i--) {
      const s = spells[i];
      s.t += dt;
      // ember trail while rising / falling
      if (s.t < RISE_TIME) {
        const y = s.fromY - 260 * s.t;
        particles.add({ x: s.fromX + (Math.random() - 0.5) * 3, y, vx: 0, vy: 10, life: 0.3, colors: FIRE.slice(1) });
      } else if (s.t > FUSE - FALL_TIME) {
        const p = fallPos(s);
        for (let k = 0; k < 2; k++) {
          particles.add({ x: p.x + (Math.random() - 0.5) * 4, y: p.y - 3, vx: (Math.random() - 0.5) * 10, vy: -20, life: 0.35, colors: FIRE.slice(1) });
        }
      }
      // the vortex licks flames upward
      if (Math.random() < 0.35 + 0.4 * (s.t / FUSE)) {
        particles.add({ x: s.tx + (Math.random() - 0.5) * 18, y: GROUND_Y, vx: 0, vy: -18 - Math.random() * 20, life: 0.35, colors: FIRE.slice(1) });
      }
      if (s.t >= FUSE) {
        spells.splice(i, 1);
        explode(s.tx);
      }
    }
    for (let i = flashes.length - 1; i >= 0; i--) if ((flashes[i].t += dt) >= FLASH_TIME) flashes.splice(i, 1);
    for (let i = scorches.length - 1; i >= 0; i--) if ((scorches[i].t += dt) >= SCORCH_TIME) scorches.splice(i, 1);
  }

  function explode(x) {
    const y = GROUND_Y - 2;
    flashes.push({ x, t: 0 });
    scorches.push({ x, t: 0 });
    burst(particles, x, y, 34, { colors: FIRE, speed: 110, up: 70, g: 240, life: [0.35, 0.75], size: [1, 2] });
    burst(particles, x, y - 2, 12, { colors: SMOKE, speed: 25, up: 30, g: -12, life: [0.8, 1.4], size: 2, drag: 1.5 });
    burst(particles, x, GROUND_Y, 10, { colors: DIRT, speed: 70, up: 80, g: 360, life: [0.4, 0.7] });
    onExplode(x, BLAST_R);
  }

  /** On the ground, behind the actors: scorch marks + the warning vortexes. */
  function renderGround(ctx, t) {
    for (const s of scorches) {
      withAlpha(ctx, 0.55 * (1 - s.t / SCORCH_TIME), () => ellipse(ctx, s.x, GROUND_Y + 1, 12, 2, '#120a0c'));
    }
    for (const s of spells) drawVortex(ctx, s.tx, s.t, t);
  }

  /** In front of the actors: fireballs in flight + explosion flashes. */
  function renderAir(ctx, t) {
    for (const s of spells) {
      if (s.t < RISE_TIME) drawFireball(ctx, s.fromX, s.fromY - 260 * s.t, t);
      else if (s.t > FUSE - FALL_TIME) {
        const p = fallPos(s);
        drawFireball(ctx, p.x, p.y, t);
      }
    }
    for (const f of flashes) {
      const p = f.t / FLASH_TIME;
      withAlpha(ctx, 1 - p, () => {
        disc(ctx, f.x, GROUND_Y - 4, Math.round(5 + p * 12), '#ff8a2a');
        disc(ctx, f.x, GROUND_Y - 4, Math.round(3 + p * 8), '#ffe07a');
        disc(ctx, f.x, GROUND_Y - 4, Math.round(1 + p * 4), '#ffffff');
      });
    }
  }

  return { cast, update, renderGround, renderAir, get count() { return spells.length; } };
}

function drawFireball(ctx, x, y, t) {
  const fl = Math.sin(t * 25) > 0 ? 1 : 0;
  withAlpha(ctx, 0.3, () => disc(ctx, x, y, 5 + fl, '#ff8a2a'));
  disc(ctx, x, y, 3, '#d0342c');
  disc(ctx, x, y, 2, '#ff8a2a');
  disc(ctx, x, y - 1, 1, '#ffe07a');
  px(ctx, x, y - 1, '#ffffff');
}

/** Spinning ring of fire on the ground at x, growing in and spinning faster as impact nears. */
function drawVortex(ctx, x, st, t) {
  const grow = Math.min(1, st / 0.35);
  const urgency = st / FUSE;
  const rx = Math.round(4 + 9 * grow);
  const ry = Math.max(1, Math.round(rx * 0.28));
  const cy = GROUND_Y + 1;
  const spin = st * (4 + 9 * urgency);
  const FIRE_C = ['#ffe07a', '#ff8a2a', '#d0342c'];

  withAlpha(ctx, 0.3 + 0.35 * urgency, () => ellipse(ctx, x, cy, rx, ry, '#3a0a08'));
  // three spiral arms
  for (let arm = 0; arm < 3; arm++) {
    for (let s = 1; s <= 9; s++) {
      const q = s / 9;
      const a = spin + arm * 2.094 + q * 2.6;
      px(ctx, x + Math.cos(a) * rx * q, cy + Math.sin(a) * ry * q, FIRE_C[Math.min(2, Math.floor((1 - q) * 3))]);
    }
  }
  // the ring
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = -spin * 0.8 + (i / n) * Math.PI * 2;
    px(ctx, x + Math.cos(a) * rx, cy + Math.sin(a) * ry, i % 3 === 0 ? '#ffe07a' : i % 3 === 1 ? '#ff8a2a' : '#d0342c');
  }
  // little flame tongues rising off the ring
  for (let i = 0; i < 6; i++) {
    const a = spin * 0.5 + (i / 6) * Math.PI * 2;
    const fx = x + Math.cos(a) * rx * 0.85;
    const h = 2 + Math.round((Math.sin(t * 14 + i * 1.7) + 1) * (1 + 2 * urgency));
    for (let k = 0; k < h; k++) px(ctx, fx, cy + Math.sin(a) * ry - 1 - k, k === h - 1 ? '#ffe07a' : '#ff8a2a');
  }
  // last second: the mark blinks white-hot
  if (urgency > 0.7 && Math.floor(t * 12) % 2 === 0) {
    withAlpha(ctx, 0.7, () => {
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        px(ctx, x + Math.cos(a) * (rx + 2), cy + Math.sin(a) * (ry + 1), '#fff6d8');
      }
    });
  }
}
