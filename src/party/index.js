// The ending: a dance party in the Dark Lord's plaza. A disco ball hangs over the middle of the
// zoomed-out view, spinning, throwing coloured beams, sweeping spots and sparkles over everyone.
// Our crew dances in the middle (the farmer on the knight's left, the castle and cave creatures
// further left), the transformed Dark Lord hovers to the right, a smaller Hydra beside him. Over it
// all: "Thanks for playing!" and the author line.
import { GROUND_Y, KNIGHT_W, KNIGHT_H, VIEW_W } from '../core/constants.js';
import { rect, px, disc, line, withAlpha } from '../core/draw.js';
import { drawText, measureText } from '../core/font.js';
import { drawKnight } from '../player/art.js';
import { drawFarmer } from '../npc-farmer/index.js';
import { drawArcher, drawMage, drawHolyKnight } from '../battle/art-heroes.js';
import { drawZombie, drawWerewolf, drawDarkMage } from '../battle/art-monsters.js';
import { drawSkeletonArcher, drawReptile, drawShade } from '../battle/art-castle.js';
import { drawCrawler, drawGolem, drawPtero } from '../battle/art-cave.js';
import { drawShadowForm } from '../dark-lord/art.js';
import { drawBody, drawHead, drawNeck, drawForeleg, drawScaled, NECK_JOIN } from '../hydra/art.js';

const G = GROUND_Y;
const BPS = 2; // beats per second
const BALL_R = 18;
const BEAMS = 8;
const SPOTS = 70;
const HUES = ['#ff3a6a', '#ffd23a', '#3aff8a', '#3ac8ff', '#a05aff', '#ff7a2a', '#ff5ae0', '#7affe8'];
const HYDRA_SCALE = 0.55;
const TEXT_IN = 1.2; // s after the lights come up: the thanks fades in
const SITE = 'sabih.dev';
const AUTHOR_PRE = 'Author: Sabih Sarowar, ';
const AUTHOR_Y = 28;

/**
 * @param {import('../core/stage.js').World} world
 * @param {{ x:number, ballY:number, top:number, credit?:string }} opts  x: the middle of the
 *   party (the crew, the ball); ballY: the ball's centre; top: the top of the view (the chain).
 */
export function createParty(world, { x: CX, ballY: BY, top: TOP, credit = '' }) {
  let t = 0;
  const sparks = []; // {x, y, vx, vy, life, max, c}
  const spots = Array.from({ length: SPOTS }, (_, i) => ({
    a: (i / SPOTS) * Math.PI * 2 * 3.7, // azimuth round the ball
    r: 140 + ((i * 97) % 380), // how far out it lands
    y: G - 4 - ((i * 53) % 300), // height on the walls / over the crowd
    c: HUES[i % HUES.length],
  }));

  // left → right: creatures, the farmer, the crew, the Dark Lord, the small Hydra
  const dancers = [
    { kind: 'werewolf', x: CX - 330 },
    { kind: 'crawler', x: CX - 300 },
    { kind: 'skeleton', x: CX - 278 },
    { kind: 'golem', x: CX - 250 },
    { kind: 'crawler', x: CX - 222 },
    { kind: 'reptile', x: CX - 188 },
    { kind: 'skeleton', x: CX - 150 },
    { kind: 'zombie', x: CX - 128 },
    { kind: 'werewolf', x: CX - 102 },
    { kind: 'zombie', x: CX - 78 },
    { kind: 'darkMage', x: CX - 56 },
    { kind: 'farmer', x: CX - 32 },
    { kind: 'knight', x: CX - 10 },
    { kind: 'archer', x: CX + 12 },
    { kind: 'mage', x: CX + 32 },
    { kind: 'holy', x: CX + 52 },
    { kind: 'darkLord', x: CX + 120 },
    { kind: 'hydra', x: CX + 222 },
    // overhead
    { kind: 'ptero', x: CX - 260, y: G - 84 },
    { kind: 'ptero', x: CX - 120, y: G - 104 },
    { kind: 'shade', x: CX + 90, y: G - 110, v: 2 },
    { kind: 'shade', x: CX + 160, y: G - 96, v: 5 },
  ].map((d, i) => ({ ...d, ph: (i * 0.37) % 1, f: i % 2 ? -1 : 1 }));

  function start() {
    t = 0;
    sparks.length = 0;
    overSite = false;
  }

  /** The clickable "sabih.dev" in the author line, in SCREEN px. */
  function siteRect() {
    const full = AUTHOR_PRE + SITE;
    const left = Math.round(VIEW_W / 2 - measureText(full) / 2);
    const x = left + measureText(AUTHOR_PRE) + 1;
    return { x: x - 2, y: AUTHOR_Y - 2, w: measureText(SITE) + 4, h: 12 };
  }
  let overSite = false;
  const setCursor = (c) => {
    const cv = document.getElementById('game');
    if (cv) cv.style.cursor = c;
  };

  function update(dt) {
    t += dt;
    if (t > TEXT_IN + 0.4) {
      const m = world.input.mouse;
      const r = siteRect();
      const over = m.x >= r.x && m.x < r.x + r.w && m.y >= r.y && m.y < r.y + r.h;
      if (over !== overSite) setCursor(over ? 'pointer' : 'default');
      overSite = over;
      if (over && world.input.wasClicked()) {
        world.input.consumeClick();
        window.open(`https://${SITE}`, '_blank', 'noopener');
      }
    }
    // sparkles flung off the ball
    const n = Math.random() < 0.6 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 30 + Math.random() * 90;
      sparks.push({
        x: CX + Math.cos(a) * BALL_R,
        y: BY + Math.sin(a) * BALL_R,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp * 0.8,
        life: 0,
        max: 0.8 + Math.random() * 1.4,
        c: HUES[(Math.random() * HUES.length) | 0],
      });
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.life += dt;
      p.vy += 40 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life >= p.max) sparks.splice(i, 1);
    }
  }

  // ------------------------------------------------------------------ the dancers (WORLD)

  /** 0..1 bounce on the beat, `ph` offsetting each dancer. */
  const bounce = (ph, k = 1) => Math.abs(Math.sin((t * BPS + ph) * Math.PI * k));
  /** Facing: they turn about every two beats, each on their own count. */
  const turn = (d) => (Math.floor(t * BPS * 0.5 + d.ph * 4) % 2 ? -d.f : d.f);
  const alt = (d) => Math.floor(t * BPS + d.ph * 2) % 2;

  function drawDancer(ctx, d) {
    const b = bounce(d.ph);
    const hop = Math.round(b * 4);
    const foot = G - hop;
    const f = turn(d);
    const sway = Math.round(Math.sin((t * BPS * 0.5 + d.ph) * Math.PI) * 3);
    const x = d.x + sway;
    const a = alt(d);
    const shadow = () => withAlpha(ctx, 0.35, () => rect(ctx, x - 6 + hop / 2, G, 12 - hop, 1, '#000'));
    switch (d.kind) {
      case 'knight': {
        shadow();
        const pose = {
          bodyDy: a,
          legs: [
            { x: 4, lift: a ? 2 : 0 },
            { x: 9, lift: a ? 0 : 2 },
          ],
          backArm: { hx: 2, hy: a ? 0 : 7 }, // disco: one hand up, the other on the hip, swapping
          frontArm: { hx: 13, hy: a ? 7 : -1 },
          plumeSway: a,
        };
        drawKnight(ctx, Math.round(x - KNIGHT_W / 2), foot - KNIGHT_H, f, pose);
        break;
      }
      case 'farmer':
        shadow();
        drawFarmer(ctx, x, foot, f, { b: a, blink: false, shadow: false });
        break;
      case 'archer':
        shadow();
        drawArcher(ctx, x, foot, f, { bob: a, pull: b * 0.6 });
        break;
      case 'mage':
        shadow();
        drawMage(ctx, x, foot, f, { bob: a, cast: a ? 1 : 0, t });
        break;
      case 'holy':
        shadow();
        drawHolyKnight(ctx, x, foot, f, { bob: a, swing: a ? 0.3 : 0, sheathed: !a });
        break;
      case 'zombie':
        shadow();
        drawZombie(ctx, x, foot, f, { walkT: t * 1.5, lunge: b });
        break;
      case 'werewolf':
        shadow();
        drawWerewolf(ctx, x, G, f, { walkT: t, arm: a ? 'wind' : 'swing', p: b, air: hop * 2, t });
        break;
      case 'darkMage':
        shadow();
        drawDarkMage(ctx, x, foot, f, { bob: a, cast: b, t });
        break;
      case 'skeleton':
        shadow();
        drawSkeletonArcher(ctx, x, foot, f, { pull: b, t });
        break;
      case 'reptile':
        withAlpha(ctx, 0.35, () => rect(ctx, x - 22, G, 44, 1, '#000'));
        drawReptile(ctx, x, G - Math.round(b * 3), f, { walkT: t * 0.8, coil: a ? b : 0, jaw: 0.3 + 0.6 * b, t });
        break;
      case 'golem':
        shadow();
        drawGolem(ctx, x, G - Math.round(b * 2), f, { walkT: t * 0.5, raise: b });
        break;
      case 'crawler':
        drawCrawler(ctx, x, G, f, { walkT: t * 2, air: hop * 2, t });
        break;
      case 'ptero':
        drawPtero(ctx, x + Math.sin(t * 0.8 + d.ph * 6) * 40, d.y + Math.sin(t * BPS * Math.PI) * 4, f, { flapT: t * 1.5 });
        break;
      case 'shade':
        drawShade(ctx, x + Math.sin(t * 1.1 + d.ph * 6) * 26, d.y + Math.sin(t * BPS * Math.PI + d.ph) * 5, f, { flapT: t * 2, variant: d.v, t });
        break;
      case 'darkLord':
        drawShadowForm(ctx, d.x + Math.sin(t * BPS * 0.5 * Math.PI) * 6, G - 52 - Math.round(b * 6), { t: t * 1.5, charge: a ? 0.3 : 0 });
        break;
      case 'hydra':
        withAlpha(ctx, 0.35, () => rect(ctx, d.x - 34, G, 64, 1, '#000'));
        drawScaled(ctx, 'party-hydra', { x: d.x - 175, y: 0, w: 280, h: G + 1 }, d.x, G, HYDRA_SCALE, HYDRA_SCALE, (g) => drawHydra(g, d.x));
        break;
    }
  }

  /** A full-size Hydra (scaled down by the caller), heads bobbing to the beat, mouths singing. */
  function drawHydra(g, HX) {
    const roots = [
      { x: HX - 38, y: G - 30 },
      { x: HX - 32, y: G - 40 },
      { x: HX - 20, y: G - 46 },
    ];
    const heads = [
      { x: HX - 70, y: G - 46 },
      { x: HX - 56, y: G - 74 },
      { x: HX - 26, y: G - 90 },
    ].map((h, i) => {
      const k = bounce(i * 0.33);
      return { x: h.x + Math.round(Math.sin((t * BPS + i) * Math.PI * 0.5) * 8), y: h.y - Math.round(k * 10) };
    });
    drawBody(g, HX, G, { breathe: alt({ ph: 0 }), t });
    for (const i of [2, 0, 1]) {
      const h = heads[i];
      drawNeck(g, roots[i], { x: h.x + NECK_JOIN.dx, y: h.y + NECK_JOIN.dy }, { dim: i === 2, rRoot: i === 1 ? 10 : 9 });
      drawHead(g, h.x, h.y, -1, { open: 0.25 + 0.6 * bounce(i * 0.33), eye: 'open', dim: i === 2, t });
      if (i === 0) drawForeleg(g, HX, G, t);
    }
  }

  /** WORLD: everyone, dancing. */
  function render(ctx) {
    for (const d of dancers) drawDancer(ctx, d);
  }

  // ------------------------------------------------------------------ the lights (WORLD)

  /** A club in the dark: dim everything drawn so far (SCREEN coords, the whole view). */
  function renderDark(ctx, v) {
    withAlpha(ctx, 0.45, () => rect(ctx, 0, 0, v.w, v.h, '#08040f'));
  }

  /** The beams, the sweeping spots, the ball and its sparkles (drawn after the dimming). */
  function renderFront(ctx) {
    const rot = t * 0.9;
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';

    // beams: spinning round the ball, landing on the floor; the ones swinging behind fainter
    for (let i = 0; i < BEAMS; i++) {
      const a = rot + (i / BEAMS) * Math.PI * 2;
      const front = Math.sin(a);
      const ex = CX + Math.cos(a) * 470;
      const ey = G - 40 + front * 40;
      const w = 18 + front * 8;
      const alpha = 0.06 + 0.07 * (front * 0.5 + 0.5);
      withAlpha(ctx, alpha, () => {
        ctx.fillStyle = HUES[i];
        ctx.beginPath();
        ctx.moveTo(CX, BY);
        ctx.lineTo(ex - w, ey);
        ctx.lineTo(ex + w, ey);
        ctx.closePath();
        ctx.fill();
      });
      withAlpha(ctx, alpha * 2, () => disc(ctx, ex, ey, Math.round(w * 0.7), HUES[i]));
    }

    // the mirror's spots, sweeping across the walls, the floor and the dancers
    for (const s of spots) {
      const a = s.a + rot;
      const front = Math.sin(a);
      if (front < -0.2) continue;
      const sx = Math.round(CX + Math.cos(a) * s.r);
      const r = front > 0.6 ? 3 : 2;
      withAlpha(ctx, 0.25 + 0.35 * front, () => disc(ctx, sx, s.y, r, s.c));
      withAlpha(ctx, 0.12, () => disc(ctx, sx, s.y, r + 3, s.c));
    }

    // a soft halo round the ball
    const hue = HUES[Math.floor(t * BPS) % HUES.length];
    for (const [r, al] of [[60, 0.04], [42, 0.06], [28, 0.08]]) withAlpha(ctx, al, () => disc(ctx, CX, BY, r, hue));
    ctx.globalCompositeOperation = prev;

    // the chain, the cap, the ball
    for (let y = TOP; y < BY - BALL_R - 3; y += 2) px(ctx, CX, y, y % 4 ? '#8a8494' : '#5a5464');
    rect(ctx, CX - 3, BY - BALL_R - 3, 7, 3, '#6a6474');
    drawBall(ctx, rot);

    // sparkles
    for (const p of sparks) {
      const k = 1 - p.life / p.max;
      withAlpha(ctx, k, () => {
        px(ctx, Math.round(p.x), Math.round(p.y), p.c);
        if (k > 0.6) {
          px(ctx, Math.round(p.x) - 1, Math.round(p.y), p.c);
          px(ctx, Math.round(p.x) + 1, Math.round(p.y), p.c);
          px(ctx, Math.round(p.x), Math.round(p.y) - 1, p.c);
          px(ctx, Math.round(p.x), Math.round(p.y) + 1, p.c);
        }
      });
    }
  }

  /** The mirror ball: a grid of facets that slides round as it spins, some flashing. */
  function drawBall(ctx, rot) {
    const R = BALL_R;
    const shift = rot * 6; // facet columns slide by
    for (let dy = -R; dy <= R; dy++) {
      const half = Math.floor(Math.sqrt(R * R - dy * dy));
      for (let dx = -half; dx <= half; dx++) {
        // the facet under this pixel, on the sphere's surface (columns bunch up at the edges)
        const u = Math.asin(dx / (half + 0.5)) / (Math.PI / 2); // −1..1 across the row
        const col = Math.floor((u * 4 + shift) * 1.5);
        const row = Math.floor((dy + R) / 3);
        const edge = (dy + R) % 3 === 0 || Math.abs(((u * 4 + shift) * 1.5) % 1) < 0.12;
        const lit = 0.5 - dx / (R * 2.2) - dy / (R * 2.2); // light from the top left
        const flash = Math.sin(t * 7 + col * 2.3 + row * 1.7) > 0.93;
        let c;
        if (edge) c = '#3a3846';
        else if (flash) c = '#ffffff';
        else if (lit > 0.7) c = '#e6e8f2';
        else if (lit > 0.45) c = (col + row) % 2 ? '#b8bccc' : '#a4a8ba';
        else if (lit > 0.2) c = (col + row) % 3 ? '#80849a' : HUES[(col + row) % HUES.length];
        else c = '#5a5c70';
        px(ctx, CX + dx, BY + dy, c);
      }
    }
    // twinkling star glints on its face
    for (let i = 0; i < 3; i++) {
      const k = Math.sin(t * 5 + i * 2.1);
      if (k < 0.5) continue;
      const gx = CX - 6 + ((i * 7 + Math.floor(t * 2)) % 12);
      const gy = BY - 7 + ((i * 5) % 10);
      const l = k > 0.85 ? 3 : 2;
      line(ctx, gx - l, gy, gx + l, gy, '#ffffff');
      line(ctx, gx, gy - l, gx, gy + l, '#ffffff');
    }
  }

  // ------------------------------------------------------------------ the thanks (SCREEN)

  /** SCREEN (320×180): "Thanks for playing!" in white with a black outline, the author, the music credit. */
  function renderScreen(u) {
    const a = Math.min(1, Math.max(0, (t - TEXT_IN) / 0.8));
    if (a <= 0) return;
    withAlpha(u, a, () => {
      const title = 'Thanks for playing!';
      let x = Math.round(VIEW_W / 2 - measureText(title, 2) / 2);
      [...title].forEach((ch, i) => {
        const y = 8 - Math.round(bounce(i * 0.08) * 2);
        x += drawText(u, ch, x, y, { color: '#fff', outline: '#000', scale: 2 }) + (ch === ' ' ? 0 : 2);
      });
      const by = AUTHOR_PRE + SITE;
      drawText(u, by, Math.round(VIEW_W / 2 - measureText(by) / 2), AUTHOR_Y, { color: '#fff6d8', outline: '#14101c' });
      // underline the link (brighter while hovered)
      const r = siteRect();
      rect(u, r.x + 2, AUTHOR_Y + 9, r.w - 4, 1, '#14101c');
      rect(u, r.x + 2, AUTHOR_Y + 8, r.w - 4, 1, overSite ? '#ffffff' : '#8ad0ff');
      if (credit) {
        withAlpha(u, 0.75, () => drawText(u, credit, Math.round(VIEW_W / 2 - measureText(credit) / 2), 40, { color: '#c8c0d8', outline: '#14101c' }));
      }
    });
  }

  return { start, update, render, renderDark, renderFront, renderScreen };
}
