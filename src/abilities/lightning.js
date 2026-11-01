// Lightning Strike effect: three thin rays spiral in around the target and fuse into one big
// bolt; where it lands the ground erupts (flash, shock ring, starburst, sparks + debris).
// Internal to the abilities slice.
import { GROUND_Y, VIEW_W, VIEW_H } from '../core/constants.js';
import { rect, line, disc, px, withAlpha } from '../core/draw.js';

const GATHER = 0.5; // s the three rays circle in (≈ the Mage's cast)
const STRIKE = 0.3; // s the fused bolt stays
const BLAST = 0.45; // s the eruption at the bottom lasts
const RAYS = 3;
const R0 = 28; // px: how far out the rays start circling
const SPIN = 11; // rad/s
const REJAG = 0.05; // s between new zigzags (crackle)
const RING_R = 30; // px: shock ring's final radius
const SKY_Y = -6;

const GLOW = '#8ccaff';
const CORE = '#ffffff';
const SPARK = ['#ffffff', '#d8f0ff', '#8ccaff', '#4a8ce8'];
const DEBRIS = ['#6a5e6e', '#4e4454', '#3a2a2c'];

/** Jagged path from (xTop, y0) down to (xBot, y1): [[x, y], …]. */
function zigzag(xTop, y0, xBot, y1, wobble = 10) {
  const pts = [[xTop, y0]];
  const n = Math.max(3, Math.round((y1 - y0) / 11));
  for (let i = 1; i < n; i++) {
    const f = i / n;
    pts.push([xTop + (xBot - xTop) * f + (Math.random() - 0.5) * wobble, y0 + (y1 - y0) * f + (Math.random() - 0.5) * 4]);
  }
  pts.push([xBot, y1]);
  return pts;
}

function drawPath(ctx, pts, core, glow) {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    withAlpha(ctx, 0.45, () => line(ctx, x0 - Math.floor(glow / 2), y0, x1 - Math.floor(glow / 2), y1, GLOW, glow));
    line(ctx, x0 - Math.floor(core / 2), y0, x1 - Math.floor(core / 2), y1, CORE, core);
  }
}

/** Ring of pixels on an ellipse (flattened to sit on the ground). */
function ring(ctx, cx, cy, rx, ry, color) {
  const n = Math.max(12, Math.round(rx * 1.6));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    rect(ctx, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 2, 1, color);
  }
}

/**
 * @param {{battle:object, damage:number, radius:number}} opts  radius: px either side that it hurts
 */
export function createLightning({ battle, damage, radius }) {
  const strikes = []; // {x, t, spin, rays:[paths], jagT, hit, bolt, burst:[{a, len}]}
  let flash = 0;

  function cast(x) {
    strikes.push({ x, t: 0, spin: Math.random() * Math.PI * 2, rays: [], jagT: 0, hit: false, bolt: null, rays2: null });
  }

  /** Where ray i is at gather progress p: top + bottom x and depth (−1 back … 1 front). */
  function rayPos(s, i, p) {
    const a = s.spin + SPIN * s.t + (i * Math.PI * 2) / RAYS;
    const r = R0 * Math.pow(1 - p, 1.4);
    return { top: s.x + Math.cos(a) * r * 1.5, bot: s.x + Math.cos(a) * r, depth: Math.sin(a) };
  }

  function update(dt) {
    flash = Math.max(0, flash - dt);
    for (let i = strikes.length - 1; i >= 0; i--) {
      const s = strikes[i];
      s.t += dt;
      const p = Math.min(1, s.t / GATHER);
      if (!s.hit) {
        if ((s.jagT -= dt) <= 0) {
          s.jagT = REJAG;
          s.rays = Array.from({ length: RAYS }, (_, k) => {
            const r = rayPos(s, k, p);
            return { pts: zigzag(r.top, SKY_Y, r.bot, GROUND_Y, 8), depth: r.depth };
          });
        }
        // little sparks skitter where each ray touches down
        for (let k = 0; k < RAYS; k++) {
          if (Math.random() < 0.35) battle.particle({ x: rayPos(s, k, p).bot, y: GROUND_Y - 1, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 30, life: 0.25, colors: SPARK, g: 200 });
        }
        if (p >= 1) strike(s);
      } else if ((s.jagT -= dt) <= 0 && s.t - GATHER < STRIKE) {
        s.jagT = REJAG;
        s.bolt = zigzag(s.x, SKY_Y, s.x, GROUND_Y, 12);
      }
      if (s.t >= GATHER + Math.max(STRIKE, BLAST)) strikes.splice(i, 1);
    }
  }

  function strike(s) {
    s.hit = true;
    s.jagT = REJAG;
    s.bolt = zigzag(s.x, SKY_Y, s.x, GROUND_Y, 12);
    // the starburst: rays fanning out from the impact, mostly up and sideways
    s.burst = Array.from({ length: 11 }, (_, k) => ({ a: Math.PI + (k / 10) * Math.PI + (Math.random() - 0.5) * 0.25, len: 14 + Math.random() * 14 }));
    flash = 0.2;
    battle.damageArea(s.x - radius, s.x + radius, damage, s.x);
    battle.burst(s.x, GROUND_Y - 2, 26, { colors: SPARK, speed: 110, up: 50, g: 220, life: [0.3, 0.7] });
    battle.burst(s.x, GROUND_Y - 1, 12, { colors: DEBRIS, speed: 70, up: 60, g: 260, life: [0.4, 0.8], size: [1, 2] });
    battle.burst(s.x, GROUND_Y - 4, 8, { colors: ['#9a90a8', '#6a6078'], speed: 25, up: 15, g: -20, life: [0.6, 1.0], size: 2, drag: 2 });
  }

  function render(ctx) {
    for (const s of strikes) {
      if (!s.hit) {
        const p = Math.min(1, s.t / GATHER);
        // a faint glow gathering on the ground at the target
        withAlpha(ctx, 0.25 + 0.4 * p, () => rect(ctx, s.x - 2 - (1 - p) * 10, GROUND_Y, 5 + (1 - p) * 20, 1, GLOW));
        // rays behind the axis first (dimmer), then those in front
        for (const r of [...s.rays].sort((a, b) => a.depth - b.depth)) {
          withAlpha(ctx, r.depth < 0 ? 0.5 : 0.95, () => drawPath(ctx, r.pts, 1, r.depth < 0 ? 2 : 3));
        }
        continue;
      }
      const st = s.t - GATHER;
      // the fused bolt
      if (st < STRIKE && s.bolt && !(Math.floor(st * 30) % 4 === 3 && st > 0.1)) {
        withAlpha(ctx, 1 - (st / STRIKE) ** 2, () => drawPath(ctx, s.bolt, 3, 7));
      }
      // eruption at the bottom
      const b = Math.min(1, st / BLAST);
      const ease = 1 - (1 - b) * (1 - b);
      const fade = 1 - b;
      withAlpha(ctx, fade, () => {
        // blinding dome shrinking back into the ground
        const dome = Math.round(9 * (1 - b));
        if (dome > 0) {
          withAlpha(ctx, 0.5, () => disc(ctx, s.x, GROUND_Y, dome + 3, GLOW));
          disc(ctx, s.x, GROUND_Y, dome, CORE);
        }
        // shock ring racing outward along the ground
        const rx = 4 + ease * RING_R;
        ring(ctx, s.x, GROUND_Y + 1, rx, rx * 0.28, b < 0.5 ? CORE : GLOW);
        withAlpha(ctx, 0.5, () => ring(ctx, s.x, GROUND_Y + 1, rx * 0.7, rx * 0.2, GLOW));
        // starburst lines
        for (const r of s.burst) {
          const inner = ease * r.len * 0.55;
          const outer = 4 + ease * r.len;
          const x0 = s.x + Math.cos(r.a) * inner;
          const y0 = GROUND_Y + Math.sin(r.a) * inner * 0.8;
          const x1 = s.x + Math.cos(r.a) * outer;
          const y1 = GROUND_Y + Math.sin(r.a) * outer * 0.8;
          line(ctx, x0, y0, x1, y1, b < 0.35 ? CORE : GLOW);
          px(ctx, x1, y1, CORE);
        }
        // scorch on the ground
        withAlpha(ctx, 0.6, () => rect(ctx, s.x - 7, GROUND_Y + 1, 14, 1, '#2a2030'));
      });
    }
  }

  /** The white-blue flash over the whole screen when a bolt lands. SCREEN coords. */
  function renderScreen(ctx) {
    if (flash > 0) withAlpha(ctx, (flash / 0.2) * 0.4, () => rect(ctx, 0, 0, VIEW_W, VIEW_H, '#e8f4ff'));
  }

  return { cast, update, render, renderScreen, gatherTime: GATHER };
}
