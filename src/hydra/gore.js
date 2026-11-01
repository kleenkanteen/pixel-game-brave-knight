// Hydra gore: blood and guts flung out when it explodes. Chunks fly, splat on the floor, the
// shelves and the back wall, and stick to any hero they hit (stains that ride along on them and
// drip). Internal to the hydra slice.
import { GROUND_Y } from '../core/constants.js';
import { rect, px, withAlpha } from '../core/draw.js';
import { ellipse } from '../battle/paint.js';

const G = 380; // px/s²
const BLOOD = ['#5a0608', '#8a0a0e', '#b8141a', '#e0303a'];
const GUTS = ['#d86a7a', '#b84a5a', '#f0a0a8', '#7a2a4a', '#9a3a52'];
const SCALE = ['#3a6a4a', '#24442f', '#5a8a5a'];
const BONE = ['#e8e0d0', '#c8bea8'];

/**
 * @param {{floorAt:(x:number, y:number)=>number, heroes:()=>object[], knight:object}} opts
 *   heroes(): the battle's heroes ({x centre, y feet, w, h, facing?}); the Brave Knight's facing
 *   and lift come from `knight`.
 */
export function createGore({ floorAt, heroes, knight }) {
  const chunks = []; // flying {x, y, vx, vy, kind, c, size, wallT}
  const splats = []; // stuck to the world {x, y, w, h, c, drip, dripMax}
  const stains = []; // stuck to a hero {hero, dx, dy, c, size, drip, dripMax}
  const pools = []; // spreading pools on the floor {x, y, rx, max, c}

  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const facingOf = (h) => (h.kind === 'player' ? knight.facing : h.facing) || 1;
  const liftOf = (h) => (h.kind === 'player' ? knight.lift || 0 : 0);

  function add(x, y, vx, vy, kind) {
    const c = kind === 'blood' ? pick(BLOOD.slice(1)) : kind === 'gut' ? pick(GUTS) : kind === 'scale' ? pick(SCALE) : pick(BONE);
    const size = kind === 'blood' ? (Math.random() < 0.6 ? 1 : 2) : kind === 'gut' ? 2 + Math.floor(Math.random() * 2) : 2;
    // some blood slaps against the back wall mid-flight and sticks there
    const wallT = kind === 'blood' && Math.random() < 0.3 ? 0.15 + Math.random() * 0.5 : kind === 'gut' && Math.random() < 0.12 ? 0.3 + Math.random() * 0.4 : Infinity;
    chunks.push({ x, y, vx, vy, kind, c, size, wallT, t: 0 });
  }

  /**
   * The explosion: chunks in every direction from the body at (cx, cy), plus a volley aimed at
   * each hero within `reach` so everyone gets some on them. Pools of blood spread where it stood.
   */
  function explode(cx, cy, w, h, reach = 320) {
    for (let i = 0; i < 260; i++) {
      const x = cx + (Math.random() - 0.5) * w;
      const y = cy + (Math.random() - 0.5) * h;
      const a = -Math.PI * (0.05 + Math.random() * 0.9); // mostly up and out
      const v = 60 + Math.random() * 220;
      const r = Math.random();
      const kind = r < 0.62 ? 'blood' : r < 0.86 ? 'gut' : r < 0.95 ? 'scale' : 'bone';
      add(x, y, Math.cos(a) * v * (Math.random() < 0.7 ? 1 : -1) - 30, Math.sin(a) * v, kind);
    }
    for (const hero of heroes()) {
      const d = Math.abs(hero.x - cx);
      if (d > reach) continue;
      const n = 10 + Math.floor(Math.random() * 6);
      for (let i = 0; i < n; i++) {
        const tx = hero.x + (Math.random() - 0.5) * hero.w * 0.8;
        const ty = hero.y - liftOf(hero) - hero.h * (0.15 + Math.random() * 0.8);
        const x0 = cx + (Math.random() - 0.5) * 30;
        const y0 = cy - Math.random() * 20;
        const T = 0.45 + (d / reach) * 0.5 + Math.random() * 0.15;
        add(x0, y0, (tx - x0) / T, (ty - y0 - 0.5 * G * T * T) / T, i % 4 === 0 ? 'gut' : 'blood');
        chunks[chunks.length - 1].wallT = Infinity; // these are for him
        chunks[chunks.length - 1].aimed = hero;
      }
    }
    pools.push({ x: cx - 10, y: GROUND_Y, rx: 0, max: 46, c: '#5a0608' });
    pools.push({ x: cx - 34, y: GROUND_Y, rx: 0, max: 22, c: '#7a0a0e' });
    pools.push({ x: cx + 22, y: GROUND_Y, rx: 0, max: 26, c: '#6a080c' });
  }

  function update(dt) {
    for (const p of pools) p.rx = Math.min(p.max, p.rx + dt * 40);
    for (let i = chunks.length - 1; i >= 0; i--) {
      const c = chunks[i];
      c.t += dt;
      const prevY = c.y;
      c.vy += G * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      // hits a hero: sticks to them
      const hero = heroes().find((h) => {
        const feet = h.y - liftOf(h);
        return (c.aimed === h || Math.random() < 0.6) && Math.abs(c.x - h.x) <= h.w / 2 && c.y <= feet && c.y >= feet - h.h + 2;
      });
      if (hero) {
        const f = facingOf(hero);
        const dripMax = c.kind === 'blood' && Math.random() < 0.45 ? 1 + Math.floor(Math.random() * 4) : 0;
        stains.push({ hero, dx: (c.x - hero.x) * f, dy: c.y - (hero.y - liftOf(hero)), c: c.c, size: c.kind === 'gut' ? 2 : c.size, drip: 0, dripMax });
        chunks.splice(i, 1);
        continue;
      }
      if (c.t >= c.wallT) {
        splat(c, 'wall');
        chunks.splice(i, 1);
        continue;
      }
      const floor = floorAt(c.x, Math.min(prevY, c.y));
      if (c.vy > 0 && c.y >= floor) {
        c.y = floor;
        splat(c, 'floor');
        chunks.splice(i, 1);
        continue;
      }
      if (c.t > 4) chunks.splice(i, 1);
    }
    for (const s of splats) if (s.drip < s.dripMax) s.drip = Math.min(s.dripMax, s.drip + dt * 3);
    for (const s of stains) if (s.drip < s.dripMax) s.drip = Math.min(s.dripMax, s.drip + dt * 1.5);
  }

  function splat(c, where) {
    if (where === 'floor') {
      const w = c.kind === 'blood' ? 1 + Math.floor(Math.random() * 4) : c.size + 1;
      splats.push({ x: c.x - w / 2, y: c.y - (c.kind === 'blood' ? 1 : c.size), w, h: c.kind === 'blood' ? 1 : c.size, c: c.c, drip: 0, dripMax: 0, kind: c.kind });
    } else {
      const s = c.kind === 'gut' ? c.size : 1 + Math.floor(Math.random() * 2);
      splats.push({ x: c.x, y: c.y, w: s, h: s, c: c.c, drip: 0, dripMax: c.kind === 'blood' && Math.random() < 0.5 ? 2 + Math.floor(Math.random() * 7) : 0, kind: c.kind });
    }
  }

  /** WORLD, behind the actors: pools, splats on the floor/shelves/wall. */
  function renderBehind(ctx) {
    for (const p of pools) {
      if (p.rx < 1) continue;
      ellipse(ctx, p.x, p.y, Math.round(p.rx), Math.max(1, Math.round(p.rx / 10)), p.c);
      if (p.rx > 6) rect(ctx, p.x - p.rx * 0.4, p.y - 1, Math.round(p.rx * 0.5), 1, '#a0101a');
    }
    for (const s of splats) {
      rect(ctx, s.x, s.y, s.w, s.h, s.c);
      if (s.kind === 'gut' && s.w > 1) px(ctx, s.x, s.y, '#f8c0c8');
      if (s.drip >= 1) rect(ctx, s.x, s.y + s.h, 1, Math.floor(s.drip), BLOOD[1]);
    }
  }

  /** WORLD, after the heroes are drawn: stains on them, and the chunks still in the air. */
  function renderFront(ctx) {
    for (const s of stains) {
      const h = s.hero;
      if (h.kind === 'player' && !knight.visible) continue;
      const f = facingOf(h);
      const x = Math.round(h.x + s.dx * f);
      const y = Math.round(h.y - liftOf(h) + s.dy);
      withAlpha(ctx, 0.92, () => {
        rect(ctx, x, y, s.size, s.size, s.c);
        if (s.drip >= 1) rect(ctx, x, y + s.size, 1, Math.floor(s.drip), BLOOD[1]);
      });
    }
    for (const c of chunks) {
      rect(ctx, c.x, c.y, c.size, c.size, c.c);
      if (c.kind === 'gut' && c.size > 2) px(ctx, c.x, c.y, '#f8c0c8');
    }
  }

  return {
    explode,
    update,
    renderBehind,
    renderFront,
    /** Stains stuck to this hero (tools/tests). */
    stainsOn: (hero) => stains.filter((s) => s.hero === hero).length,
    get flying() {
      return chunks.length;
    },
  };
}
