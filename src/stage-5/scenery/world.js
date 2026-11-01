// Builds Stage 5's static layers once (WORLD_W × 540, world y from TOP_Y): the `base` layer (the
// cliff and its cave mouth, the approach, the moat banks, the drawbridge and its chains, the
// gatehouse, the inner court's buildings, the second gate, the plaza's walls and towers, the keep
// and its balcony, the floating platforms, the floors) and the `glow` layer (lit windows, stained
// glass, platform runes) that the moonlight tint doesn't dim. Plus the far layer: mountains and
// towers on the skyline, for parallax.
import { GROUND_Y, VIEW_H } from '../../core/constants.js';
import { rect, px, line } from '../../core/draw.js';
import { makeCanvas, hash2, createRng } from '../../stage-1/scenery/util.js';
import { drawTree } from '../../stage-1/scenery/trees.js';
import { WORLD_W, TOP_Y, CLIFF_X1, MOAT_X0, MOAT_X1, GATEHOUSE, COURT_X0, GATE2, PLAZA_X0, KEEP_X0, BALCONY, PLATFORMS, BRAZIERS, ROSE } from '../layout.js';
import { STONE, DARK_STONE, SLATE, WOOD, IRON, VIOLET, stoneWall, battlements, arch, archShape, windowAt, roundTower, coneRoof, gableRoof, banner } from './paint.js';

const G = GROUND_Y;
const H = VIEW_H - TOP_Y; // 540
const ROCK = { base: '#4a4254', light: '#625872', dark: '#2e2836', rim: '#7a6e8a', moss: '#3e4a2e' };
const GRASS = { top: '#5e8458', mid: '#4a6c44', dark: '#385a36', soil: '#4a3a30', soilD: '#3a2c26', path: '#7a6a54', pathD: '#64563f' };
const WATER = { deep: '#141c38', mid: '#1e2a4a', light: '#2e3e66' };

/**
 * World layers, in world coords (y translated so world y TOP_Y is canvas row 0).
 * platforms: false leaves out the floating platforms (the dance party's plaza).
 */
export function buildWorld({ platforms = true } = {}) {
  const base = makeCanvas(WORLD_W, H);
  const glow = makeCanvas(WORLD_W, H);
  const b = base.ctx;
  const g = glow.ctx;
  b.translate(0, -TOP_Y);
  g.translate(0, -TOP_Y);

  drawPlazaBackdrop(b, g);
  drawCourt(b, g);
  drawGate2(b, g);
  drawKeep(b, g);
  drawApproach(b);
  drawCliff(b);
  drawMoat(b);
  drawGatehouse(b, g);
  drawBridge(b);
  drawFloors(b);
  drawBraziers(b);
  if (platforms) PLATFORMS.forEach((p, i) => drawPlatform(b, g, p, i));
  return { base: base.canvas, glow: glow.canvas };
}

// ------------------------------------------------------------------ the approach

/** The cliff the party comes out of: a rock face with the cave mouth at its foot. */
function drawCliff(b) {
  const top = (x) => Math.round(-6 + (x / CLIFF_X1) ** 2.2 * 96);
  for (let x = 0; x < CLIFF_X1 + 8; x++) {
    const t = x < CLIFF_X1 ? top(x) : 92 + (x - CLIFF_X1) * 7;
    for (let y = Math.max(0, t); y < G; y++) {
      const n = hash2(Math.floor(x / 2), Math.floor(y / 2) + 77);
      const strata = Math.floor((y + x * 0.3) / 7) % 2;
      b.fillStyle = n < 0.14 ? ROCK.dark : strata ? ROCK.base : '#423a4c';
      b.fillRect(x, y, 1, 1);
    }
    if (t >= 0 && t < G) {
      px(b, x, t, ROCK.rim);
      if (hash2(x, 3) < 0.6) px(b, x, t - 1, GRASS.top); // grass on the brow
      if (hash2(x, 4) < 0.25) px(b, x, t - 2, GRASS.mid);
    }
  }
  // the cave mouth: the Lord's Lair behind them
  arch(b, 13, 30, 104, G, '#0a0810', ROCK);
  for (let y = 108; y < G; y += 7) px(b, 24 + (y % 3), y, '#1a1620'); // a glint of the tunnel
  // a few stalactites in the mouth
  for (const [x, l] of [[4, 4], [11, 6], [19, 3], [24, 5]]) rect(b, x, 103, 1, l, ROCK.light);
}

/** Grass, a trodden path and soil from the cliff to the moat; dead trees and rocks behind. */
function drawApproach(b) {
  const trees = [
    { x: 92, h: 76, r: 18, shape: 'dead', leaves: ['violetD', 'moss'], trunk: ['#3a3438', '#544a52', '#1c181e'], rot: 1, seed: 501 },
    { x: 214, h: 64, r: 16, shape: 'dead', leaves: ['moss', 'violetD'], trunk: ['#3a3438', '#544a52', '#1c181e'], rot: 1, seed: 502 },
    { x: 300, h: 70, r: 17, shape: 'dead', leaves: ['violetD'], trunk: ['#2c2830', '#3e3842', '#141216'], rot: 1, seed: 503 },
  ];
  trees.forEach((t) => drawTree(b, t));
  // boulders
  for (const [x, w, h] of [[150, 14, 7], [162, 8, 4], [262, 10, 5], [336, 9, 6]]) {
    for (let yy = 0; yy < h; yy++) {
      const hw = Math.round((w / 2) * Math.sqrt(1 - ((h - yy) / (h + 1)) ** 2));
      rect(b, x - hw, G - h + yy, hw * 2, 1, yy === 0 ? ROCK.rim : yy < 2 ? ROCK.light : ROCK.base);
      px(b, x - hw, G - h + yy, ROCK.dark);
    }
  }
  for (let x = 0; x < MOAT_X0; x++) {
    const onPath = x > 30 && x < MOAT_X0 - 6;
    for (let y = G; y < VIEW_H; y++) {
      const d = y - G;
      const n = hash2(x, y);
      let c;
      if (d === 0) c = onPath && n < 0.7 ? GRASS.path : n < 0.5 ? GRASS.top : GRASS.mid;
      else if (d === 1) c = onPath ? GRASS.pathD : GRASS.mid;
      else if (d < 4) c = n < 0.4 ? GRASS.dark : GRASS.soil;
      else c = n < 0.08 ? '#4a3e34' : n < 0.4 ? GRASS.soilD : GRASS.soil;
      b.fillStyle = c;
      b.fillRect(x, y, 1, 1);
    }
    // grass tufts along the edge of the path
    if (hash2(x, 9) < 0.18) {
      const h = 1 + Math.floor(hash2(x, 10) * 3);
      rect(b, x, G - h, 1, h, hash2(x, 11) < 0.5 ? GRASS.top : GRASS.mid);
    }
  }
}

// ------------------------------------------------------------------ the moat + drawbridge

function drawMoat(b) {
  // stone banks: the outer bank's retaining wall and the castle's foundations
  stoneWall(b, MOAT_X0 - 6, G, MOAT_X0, VIEW_H, STONE, { bw: 6, bh: 4, seed: 3 });
  stoneWall(b, MOAT_X1, G, GATEHOUSE.x1 + 30, VIEW_H, STONE, { bw: 8, bh: 4, seed: 4 });
  // the water: dark, still, banded with reflected light
  for (let x = MOAT_X0; x < MOAT_X1; x++) {
    for (let y = G; y < VIEW_H; y++) {
      const d = y - G;
      let c = d < 10 ? '#0c0c18' : WATER.deep; // the deck's shadow on the water
      if (d >= 10 && (y + Math.floor(x / 11)) % 7 === 0 && hash2(x, y) < 0.5) c = WATER.mid;
      if (d === 10) c = hash2(x, 1) < 0.5 ? WATER.light : WATER.mid; // the waterline
      b.fillStyle = c;
      b.fillRect(x, y, 1, 1);
    }
  }
}

/** The drawbridge deck (its top is the ground), iron bands, and the chains up to the gatehouse. */
function drawBridge(b) {
  const x0 = MOAT_X0 - 4;
  const x1 = MOAT_X1;
  for (let x = x0; x < x1; x++) {
    const plank = Math.floor((x - x0) / 7);
    const seam = (x - x0) % 7 === 0;
    const h = hash2(plank, 21);
    const face = h < 0.3 ? WOOD.dark : h > 0.75 ? WOOD.light : WOOD.base;
    rect(b, x, G, 1, 1, seam ? WOOD.dark : WOOD.light); // the deck's top (lit)
    rect(b, x, G + 1, 1, 4, seam ? WOOD.dark : face);
    if (!seam && hash2(x, 22) < 0.12) px(b, x, G + 2 + Math.floor(hash2(x, 23) * 3), WOOD.dark); // knots
    rect(b, x, G + 5, 1, 2, '#2a1a10'); // the beam under it
  }
  // iron bands with rivets
  for (let x = x0 + 18; x < x1 - 4; x += 40) {
    rect(b, x, G, 3, 7, IRON.base);
    rect(b, x, G, 3, 1, IRON.light);
    px(b, x + 1, G + 2, IRON.light);
    px(b, x + 1, G + 5, IRON.light);
  }
  // trestles under the deck, standing in the water: cross-braced timber legs
  for (let x = x0 + 44; x < x1 - 30; x += 88) {
    for (const lx of [x, x + 14]) {
      rect(b, lx, G + 7, 3, VIEW_H - G - 7, '#3a2414');
      rect(b, lx, G + 7, 1, VIEW_H - G - 7, WOOD.base);
    }
    line(b, x + 2, G + 8, x + 15, G + 20, '#3a2414');
    line(b, x + 15, G + 8, x + 2, G + 20, '#2a1a10');
    rect(b, x - 1, G + 16, 19, 1, WOOD.dark);
  }
  // the hinge end, a heavy iron lip at the gate
  rect(b, x1 - 4, G - 1, 4, 8, IRON.dark);
  // a rail along the far side: posts with iron caps, a timber rail between them
  for (let x = x0 + 6; x < x1 - 6; x += 22) {
    rect(b, x, G - 13, 2, 13, WOOD.dark);
    rect(b, x, G - 13, 1, 13, WOOD.base);
    rect(b, x - 1, G - 14, 4, 1, IRON.light);
  }
  rect(b, x0 + 6, G - 11, x1 - x0 - 12, 2, WOOD.base);
  rect(b, x0 + 6, G - 11, x1 - x0 - 12, 1, WOOD.light);
  rect(b, x0 + 6, G - 6, x1 - x0 - 12, 1, WOOD.dark);
  // chains: from the bridge's outer end up into the gatehouse's wall
  const chain = (ax, ay, bx, by, c, cl) => {
    const n = Math.round(Math.hypot(bx - ax, by - ay) / 2);
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const sag = Math.sin(u * Math.PI) * 6; // a little slack
      const x = ax + (bx - ax) * u;
      const y = ay + (by - ay) * u + sag;
      if (i % 2) px(b, x, y, c);
      else {
        px(b, x, y - 1, c);
        px(b, x, y + 1, c);
        px(b, x + 1, y, cl);
      }
    }
  };
  chain(MOAT_X0 + 2, G - 1, GATEHOUSE.x0 + 4, 74, IRON.dark, IRON.base);
  chain(MOAT_X0 + 8, G - 2, GATEHOUSE.x0 + 4, 70, IRON.base, IRON.light);
  rect(b, MOAT_X0, G - 3, 4, 3, IRON.base); // the chains' ring bolts
  rect(b, MOAT_X0 + 6, G - 4, 4, 3, IRON.base);
}

// ------------------------------------------------------------------ the gatehouse

function drawGatehouse(b, g) {
  const { x0, x1, towerW, towerTop, walkTop, gateX0, gateX1, archTop } = GATEHOUSE;
  // curtain wall running off behind it, both ways
  stoneWall(b, x0 - 24, 76, x0, G, STONE, { seed: 5 });
  battlements(b, x0 - 24, x0, 76, STONE);
  // the middle block over the gate
  stoneWall(b, x0 + towerW, walkTop, x1 - towerW, G, STONE, { bw: 8, bh: 5, seed: 6 });
  battlements(b, x0 + towerW, x1 - towerW, walkTop, STONE);
  // machicolations: corbels under the walkway's parapet
  for (let x = x0 + towerW + 2; x < x1 - towerW - 2; x += 6) {
    rect(b, x, walkTop + 6, 4, 3, STONE.light);
    rect(b, x, walkTop + 9, 4, 1, STONE.dark);
    px(b, x + 1, walkTop + 10, '#14101c');
  }
  // the two towers
  for (const [tx0, seed] of [[x0, 7], [x1 - towerW, 8]]) {
    roundTower(b, tx0, tx0 + towerW, towerTop, G, STONE, seed);
    battlements(b, tx0 - 2, tx0 + towerW + 2, towerTop, STONE, { w: 5, h: 7, gap: 3 });
    rect(b, tx0 - 2, towerTop, towerW + 4, 2, STONE.light); // corbelled lip
    rect(b, tx0 - 1, towerTop + 2, towerW + 2, 1, STONE.dark);
    // arrow slits
    for (const y of [64, 100]) {
      rect(b, tx0 + towerW / 2 - 1, y, 2, 9, '#100c16');
      rect(b, tx0 + towerW / 2 - 2, y + 3, 4, 2, '#100c16');
    }
    // a lit window high up
    windowAt(b, g, tx0 + towerW / 2 - 2, towerTop + 10, 4, 7, { pointed: true });
  }
  // the gate arch (the portcullis is drawn per frame) and its passage
  arch(b, (gateX0 + gateX1) / 2, gateX1 - gateX0, archTop, G, '#0c0a12', STONE);
  // a hint of the court through it: flagstones and dim light at the far end
  rect(b, gateX0, G - 1, gateX1 - gateX0, 1, '#2a2632');
  // keystone + banner over the arch
  rect(b, (gateX0 + gateX1) / 2 - 3, archTop - 4, 6, 5, STONE.light);
  rect(b, (gateX0 + gateX1) / 2 - 2, archTop - 3, 4, 3, STONE.base);
  banner(b, (gateX0 + gateX1) / 2 - 6, walkTop + 13, 12, 18);
  // the foundation steps down into the moat
  rect(b, x0 - 1, G, x1 - x0 + 2, 2, STONE.dark);
  // curtain wall on the far side (the court's outer wall)
  stoneWall(b, x1, 64, x1 + 16, G, STONE, { seed: 9 });
  battlements(b, x1, x1 + 16, 64, STONE);
}

// ------------------------------------------------------------------ the inner court

function drawCourt(b, g) {
  const x0 = COURT_X0;
  const x1 = GATE2.x0;
  // towers rising behind the back wall (against the sky)
  for (const [tx, w, top, roof] of [[868, 26, -40, 34], [1004, 18, -10, 0], [1090, 30, -96, 40]]) {
    roundTower(b, tx, tx + w, top, 36, DARK_STONE, tx);
    if (roof) coneRoof(b, tx - 2, tx + w + 2, top, roof);
    else battlements(b, tx - 2, tx + w + 2, top, DARK_STONE);
    windowAt(b, g, tx + w / 2 - 2, top + 12, 4, 7);
  }
  // high back wall all along, its walk crenellated
  stoneWall(b, x0, 34, x1, G, DARK_STONE, { seed: 11 });
  battlements(b, x0, x1, 34, DARK_STONE);
  // a round tower in the court: roof, windows
  roundTower(b, 850, 884, 4, G, DARK_STONE, 21);
  coneRoof(b, 848, 886, 4, 40);
  windowAt(b, g, 864, 30, 5, 9);
  windowAt(b, g, 864, 74, 5, 9, { lit: false });
  rect(b, 860, 118, 14, 32, '#0c0a12'); // its door
  archShape(867, 14, 114, 118, (x, y, w) => rect(b, x, y, w, 1, '#0c0a12'));
  rect(b, 861, 120, 1, 30, WOOD.dark);

  // the great hall: a gabled front with tall lit windows and a doorway up a few steps
  stoneWall(b, 904, 40, 1040, G, DARK_STONE, { bw: 10, seed: 22 });
  gableRoof(b, 900, 1044, 40, 34);
  rect(b, 900, 39, 144, 2, SLATE.dark);
  for (const wx of [918, 942, 996, 1020]) windowAt(b, g, wx, 56, 6, 26);
  // rose window in the gable
  for (let dy = -6; dy <= 6; dy++) {
    for (let dx = -6; dx <= 6; dx++) {
      const r = Math.hypot(dx, dy);
      if (r > 6.4) continue;
      if (r > 5.4) px(b, 972 + dx, 22 + dy, DARK_STONE.light);
      else px(g, 972 + dx, 22 + dy, (Math.atan2(dy, dx) * 4 + 8) % 2 < 1 ? VIOLET.pane : VIOLET.red);
    }
  }
  px(g, 972, 22, '#ffe9a0');
  // doorway + steps
  arch(b, 972, 22, 98, 140, '#0c0a12', DARK_STONE);
  rect(b, 962, 104, 20, 36, '#3a2418');
  rect(b, 971, 104, 2, 36, WOOD.dark);
  for (let i = 0; i < 4; i++) rect(b, 956 - i * 4, 140 + i * 3 - 1, 32 + i * 8, 3, i % 2 ? DARK_STONE.base : DARK_STONE.light);
  banner(b, 930, 92, 10, 22);
  banner(b, 1006, 92, 10, 22);

  // a cloister: three arches under a wall walk
  stoneWall(b, 1044, 64, 1140, G, DARK_STONE, { seed: 23 });
  battlements(b, 1044, 1140, 64, DARK_STONE);
  for (const cx of [1060, 1092, 1124]) arch(b, cx, 22, 96, G, '#100c16', DARK_STONE);
  // statues of gargoyles on plinths
  for (const sx of [892, 1048]) {
    rect(b, sx - 5, 130, 10, 20, DARK_STONE.light);
    rect(b, sx - 6, 128, 12, 2, DARK_STONE.base);
    rect(b, sx - 4, 118, 8, 10, '#3a3444');
    rect(b, sx - 6, 114, 3, 5, '#3a3444'); // wings
    rect(b, sx + 3, 114, 3, 5, '#3a3444');
    rect(b, sx - 2, 112, 4, 6, '#46404e'); // head
    px(b, sx - 2, 111, '#46404e');
    px(b, sx + 1, 111, '#46404e');
    px(b, sx - 1, 114, '#a050f0');
    px(b, sx + 1, 114, '#a050f0');
  }
  // a well
  rect(b, 1112, 136, 22, 14, DARK_STONE.base);
  stoneWall(b, 1112, 136, 1134, G, DARK_STONE, { bw: 6, bh: 4, seed: 24 });
  rect(b, 1112, 135, 22, 2, DARK_STONE.light);
  rect(b, 1114, 116, 2, 20, WOOD.dark);
  rect(b, 1130, 116, 2, 20, WOOD.dark);
  gableRoof(b, 1108, 1138, 118, 7, SLATE);
  rect(b, 1116, 122, 14, 1, WOOD.light);
  rect(b, 1122, 123, 1, 6, '#8a7a5a'); // rope
  rect(b, 1120, 129, 5, 4, WOOD.base); // bucket
  // barrels + crates by the cloister
  for (const [x, w, h, k] of [[1072, 10, 12, 'b'], [1083, 10, 12, 'b'], [1094, 12, 10, 'c'], [1097, 9, 8, 'c']]) {
    const y = G - h - (k === 'c' && x === 1097 ? 10 : 0);
    rect(b, x, y, w, h, k === 'b' ? WOOD.base : '#7a5a34');
    rect(b, x, y, w, 1, WOOD.light);
    if (k === 'b') {
      rect(b, x, y + 3, w, 1, IRON.base);
      rect(b, x, y + h - 4, w, 1, IRON.base);
      rect(b, x + w - 2, y, 2, h, WOOD.dark);
    } else {
      line(b, x + 1, y + 1, x + w - 2, y + h - 2, WOOD.dark);
      rect(b, x, y, 1, h, WOOD.dark);
      rect(b, x + w - 1, y, 1, h, WOOD.dark);
    }
  }
}

/** The second gate: a thick wall with an arched passage, a tall tower over it. */
function drawGate2(b, g) {
  const { x0, x1, gateX0, gateX1, archTop, wallTop } = GATE2;
  // the tower framing the plaza's left edge
  roundTower(b, x0 - 8, x1 + 36, -250, G, DARK_STONE, 31);
  coneRoof(b, x0 - 12, x1 + 40, -250, 70);
  battlements(b, x0 - 10, x1 + 38, -250, DARK_STONE);
  for (const y of [-220, -160, -100, -40, 30]) windowAt(b, g, x1 + 10, y, 5, 9, { lit: y !== -100 });
  // the gate wall itself
  stoneWall(b, x0, wallTop, x1, G, DARK_STONE, { seed: 32 });
  battlements(b, x0, x1, wallTop, DARK_STONE);
  arch(b, (gateX0 + gateX1) / 2, gateX1 - gateX0, archTop, G, '#120e1c', DARK_STONE);
  // through it: a glimpse of the plaza's violet fire light
  for (let y = archTop + 18; y < G; y += 3) rect(b, gateX0 + 4, y, gateX1 - gateX0 - 8, 1, '#1e1430');
  rect(b, (gateX0 + gateX1) / 2 - 3, archTop - 4, 6, 5, DARK_STONE.light); // keystone
}

// ------------------------------------------------------------------ the plaza

/** Distant towers: darker and cooler (further off, in the haze). */
const FAR_STONE = { base: '#3a3648', light: '#4a4658', dark: '#2c2838', mortar: '#201c28', moss: '#2a3226', shade: '#24202e' };

/**
 * Behind the plaza: distant spires against the sky; a long back wall with an arcade at its foot;
 * in the middle a chapel front rising high with its rose window, flanked by two towers.
 */
function drawPlazaBackdrop(b, g) {
  const x0 = PLAZA_X0;
  const x1 = KEEP_X0;
  // distant spires (dim, cool silhouettes; the moon's patch of sky, right of centre, kept clear)
  for (const [tx, w, top, lit] of [[1262, 20, -290, 1], [1352, 14, -236, 0], [1440, 22, -316, 1], [1830, 18, -262, 0], [1890, 14, -210, 1], [2030, 16, -300, 1]]) {
    roundTower(b, tx, tx + w, top, -30, FAR_STONE, tx);
    coneRoof(b, tx - 2, tx + w + 2, top, 26 + (tx % 3) * 8, { base: '#2e2838', light: '#3e3650', dark: '#201a2a' });
    windowAt(b, g, tx + w / 2 - 2, top + 16, 4, 7, { lit: !!lit, frame: FAR_STONE });
  }
  // the chapel's flanking towers
  const { x: rx, y: ry, r } = ROSE;
  for (const tx of [rx - 112, rx + 84]) {
    roundTower(b, tx, tx + 28, -236, G, DARK_STONE, tx);
    coneRoof(b, tx - 3, tx + 31, -236, 46);
    battlements(b, tx - 2, tx + 30, -236, DARK_STONE, { w: 4, h: 5, gap: 3 });
    windowAt(b, g, tx + 12, -206, 4, 9);
    windowAt(b, g, tx + 12, -150, 4, 9, { glass: VIOLET });
  }
  // the chapel front: gabled, with the rose window and tall lancets either side
  stoneWall(b, rx - 84, -150, rx + 84, G, DARK_STONE, { bw: 10, bh: 6, seed: 42 });
  gableRoof(b, rx - 90, rx + 90, -150, 44);
  rect(b, rx - 90, -151, 180, 2, SLATE.dark);
  coneRoof(b, rx - 2, rx + 2, -194, 4); // a finial on the ridge
  for (let dy = -r - 1; dy <= r + 1; dy++) {
    for (let dx = -r - 1; dx <= r + 1; dx++) {
      const d = Math.hypot(dx, dy);
      if (d > r + 0.5) continue;
      if (d > r - 2.5) {
        px(b, rx + dx, ry + dy, d > r - 1 ? DARK_STONE.dark : DARK_STONE.light);
        continue;
      }
      const a = Math.atan2(dy, dx);
      const spoke = Math.abs(Math.sin(a * 6)) < 0.12 || Math.abs(d - 12) < 0.8 || d < 3;
      if (spoke) px(b, rx + dx, ry + dy, DARK_STONE.dark);
      else {
        const petal = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 12) % 2;
        const c = d < 12 ? (petal ? VIOLET.red : VIOLET.pane) : petal ? VIOLET.pane : VIOLET.paneD;
        px(g, rx + dx, ry + dy, hash2(dx, dy) < 0.12 ? VIOLET.paneL : c);
      }
    }
  }
  for (const wx of [rx - 66, rx - 50, rx + 42, rx + 58]) windowAt(b, g, wx, -118, 8, 44, { glass: VIOLET });
  // the long back wall, lower either side of the chapel
  const top = -34;
  stoneWall(b, x0, top, rx - 84, G, DARK_STONE, { bw: 10, bh: 6, seed: 41 });
  stoneWall(b, rx + 84, top, x1, G, DARK_STONE, { bw: 10, bh: 6, seed: 43 });
  battlements(b, x0, rx - 112, top, DARK_STONE, { w: 6, h: 8, gap: 5 });
  battlements(b, rx + 112, x1, top, DARK_STONE, { w: 6, h: 8, gap: 5 });
  // buttresses
  for (let x = x0 + 40; x < x1 - 20; x += 106) {
    if (Math.abs(x + 6 - rx) < 96) continue;
    stoneWall(b, x, top + 8, x + 12, G, DARK_STONE, { bw: 6, seed: x });
    rect(b, x + 11, top + 8, 1, G - top - 8, DARK_STONE.shade);
    rect(b, x, top + 8, 12, 2, DARK_STONE.light);
  }
  // a string course, then the arcade at ground level: arches between pillars, banners above
  rect(b, x0, -6, x1 - x0, 2, DARK_STONE.light);
  rect(b, x0, -4, x1 - x0, 1, DARK_STONE.dark);
  for (let cx = x0 + 74; cx < x1 - 40; cx += 53) {
    arch(b, cx, 30, 82, G, '#0e0a16', DARK_STONE);
    rect(b, cx - 15, 80, 30, 1, DARK_STONE.light);
  }
  for (let cx = x0 + 100; cx < x1 - 60; cx += 106) banner(b, cx - 6, 6, 12, 40);
}

/** The keep on the right: a massive tower to the top of the sky, the balcony, its door. */
function drawKeep(b, g) {
  const x0 = KEEP_X0;
  const x1 = WORLD_W;
  stoneWall(b, x0, TOP_Y, x1, G, DARK_STONE, { bw: 11, bh: 6, seed: 51 });
  rect(b, x0, TOP_Y, 2, G - TOP_Y, DARK_STONE.shade);
  rect(b, x0 + 2, TOP_Y, 1, G - TOP_Y, DARK_STONE.light);
  // windows up the keep
  for (const [y, lit] of [[-340, true], [-300, false], [-150, true], [-90, true], [-30, false], [40, true]]) windowAt(b, g, x0 + 36, y, 6, 14, { lit, glass: y < -200 ? VIOLET : undefined });
  // the great doors at its foot
  arch(b, x0 + 44, 34, 92, G, '#0c0a12', DARK_STONE);
  rect(b, x0 + 28, 100, 32, 50, '#2a1a12');
  for (let x = x0 + 30; x < x0 + 58; x += 5) rect(b, x, 100, 1, 50, '#1a100a');
  rect(b, x0 + 43, 96, 2, 54, IRON.dark);
  for (const y of [110, 134]) rect(b, x0 + 28, y, 32, 2, IRON.base);

  // the balcony: a slab on stepped corbels, the doorway behind it (doors drawn per frame)
  const { x0: bx0, x1: bx1, y, doorX } = BALCONY;
  rect(b, bx0, y, bx1 - bx0, 5, DARK_STONE.base);
  rect(b, bx0, y, bx1 - bx0, 1, DARK_STONE.light);
  rect(b, bx0, y + 5, bx1 - bx0, 1, DARK_STONE.dark);
  for (let x = bx0 + 6; x < x0; x += 14) {
    for (let k = 0; k < 4; k++) rect(b, x + k, y + 6 + k * 3, 8 - k * 2, 3, k % 2 ? DARK_STONE.base : DARK_STONE.light);
    rect(b, x + 3, y + 18, 2, 2, DARK_STONE.dark);
  }
  // the doorway: a pointed arch with a warm violet light inside
  archShape(doorX, 20, y - 36, y, (x, yy, w) => rect(b, x - 2, yy, w + 4, 1, DARK_STONE.light));
  archShape(doorX, 16, y - 34, y, (x, yy, w) => rect(g, x, yy, w, 1, (yy - (y - 34)) % 7 === 0 ? '#3a1a52' : '#5a2a7a'));
  // banners either side of the doorway
  banner(b, doorX - 22, y - 60, 10, 26);
  banner(b, doorX + 14, y - 60, 10, 26);
}

/** Plaza + court floors: big flagstones; the ritual circle is drawn per frame (it glows). */
function drawFloors(b) {
  for (let x = COURT_X0; x < WORLD_W; x++) {
    for (let y = G; y < VIEW_H; y++) {
      const row = Math.floor((y - G) / 6);
      const slab = Math.floor((x + (row % 2) * 7) / 14);
      const edge = (y - G) % 6 === 0 || (x + (row % 2) * 7) % 14 === 0;
      const h = hash2(slab, row + 5);
      let c = edge ? DARK_STONE.mortar : h < 0.2 ? DARK_STONE.dark : h > 0.85 ? DARK_STONE.light : DARK_STONE.base;
      if (y === G) c = DARK_STONE.light;
      b.fillStyle = c;
      b.fillRect(x, y, 1, 1);
    }
  }
}

/** Iron braziers on stone stands (their violet fire is drawn per frame). */
function drawBraziers(b) {
  for (const x of BRAZIERS) {
    rect(b, x - 3, G - 16, 6, 16, DARK_STONE.light);
    rect(b, x - 3, G - 16, 1, 16, DARK_STONE.dark);
    rect(b, x - 5, G - 2, 10, 2, DARK_STONE.base);
    rect(b, x - 7, G - 21, 14, 5, IRON.base);
    rect(b, x - 6, G - 16, 12, 1, IRON.dark);
    rect(b, x - 7, G - 21, 14, 1, IRON.light);
    for (const dx of [-7, 6]) rect(b, x + dx, G - 24, 1, 3, IRON.base);
  }
}

/** A floating rune-stone: a flat lit top, a rough tapering underside, violet runes that glow. */
function drawPlatform(b, g, { x0, x1, y }, i) {
  const w = x1 - x0;
  for (let x = x0; x <= x1; x++) {
    const u = (x - x0) / w;
    const under = Math.max(3, Math.round(4 + Math.sin(u * Math.PI) * 9 + hash2(x, i) * 3));
    for (let yy = 0; yy < under; yy++) {
      const n = hash2(x * 3 + i, yy);
      b.fillStyle = yy >= under - 2 ? ROCK.dark : n < 0.15 ? ROCK.dark : n > 0.88 ? ROCK.light : DARK_STONE.base;
      b.fillRect(x, y + yy, 1, 1);
    }
    px(b, x, y + under, '#1c1822');
  }
  rect(b, x0, y, w + 1, 1, DARK_STONE.light);
  rect(b, x0, y + 1, w + 1, 1, '#7a7488');
  // runes carved along its face, glowing
  const rng = createRng(700 + i);
  for (let x = x0 + 4; x < x1 - 4; x += 6) {
    const shape = rng.int(0, 3);
    const ry = y + 4;
    if (shape === 0) rect(g, x, ry, 1, 3, VIOLET.pane);
    if (shape === 1) {
      px(g, x, ry, VIOLET.paneL);
      px(g, x + 1, ry + 1, VIOLET.pane);
      px(g, x, ry + 2, VIOLET.pane);
    }
    if (shape === 2) rect(g, x, ry + 1, 3, 1, VIOLET.pane);
    if (shape === 3) {
      rect(g, x, ry, 1, 3, VIOLET.pane);
      px(g, x + 1, ry, VIOLET.paneL);
    }
  }
}

// ------------------------------------------------------------------ far layer (parallax)

/** Width of the far layer: it scrolls at FAR_PARALLAX of the camera. */
export const FAR_PARALLAX = 0.3;
export const FAR_W = Math.ceil(WORLD_W * FAR_PARALLAX) + 980;

/**
 * Distant mountains and, on a crag, the castle's towers seen from the approach. FAR_W × 540,
 * row 0 = world y TOP_Y (it shares the world's vertical position, scrolling slower across).
 */
export function buildFar() {
  const { canvas, ctx } = makeCanvas(FAR_W, H);
  ctx.translate(0, -TOP_Y);
  const ridge = (seed, base, amp, color, rim) => {
    for (let x = 0; x < FAR_W; x++) {
      const y = Math.round(base - amp * (0.55 * Math.sin(x / 47 + seed) + 0.3 * Math.sin(x / 19 + seed * 2) + 0.15 * Math.sin(x / 7 + seed * 3)));
      rect(ctx, x, y, 1, G + 10 - y, color);
      px(ctx, x, y, rim);
    }
  };
  ridge(1, 92, 34, '#1a2040', '#2e3a64');
  // the castle on its crag: a cluster of towers with tiny lit windows
  const cx = 300;
  for (const [dx, w, top] of [[-40, 10, 48], [-26, 14, 30], [-8, 18, 14], [14, 12, 36], [30, 9, 54]]) {
    rect(ctx, cx + dx, top, w, 120 - top, '#11142a');
    for (let x = cx + dx - 1; x < cx + dx + w + 1; x += 3) rect(ctx, x, top - 3, 2, 3, '#11142a');
    px(ctx, cx + dx + Math.floor(w / 2), top + 8, '#e8b04a');
    if (w > 11) px(ctx, cx + dx + 3, top + 20, '#e8b04a');
  }
  // the crag under it
  for (let x = cx - 60; x < cx + 60; x++) {
    const y = Math.round(104 + ((x - cx) / 60) ** 2 * 22 + Math.sin(x / 5) * 2);
    rect(ctx, x, y, 1, 140 - y, '#11142a');
  }
  ridge(4, 122, 18, '#141a34', '#24304e');
  return canvas;
}
