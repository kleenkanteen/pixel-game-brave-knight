// The Archer's blue robin: perches on his back shoulder and, every 4–6 s (random), takes off and
// loops around him diagonally (up to his top-left, across to his top-right, back down to the
// shoulder). Internal to the battle slice; allies.js updates and draws it with the Archer.
import { rect } from '../core/draw.js';

const R = {
  blue: '#3a6ad8',
  blueD: '#24449a',
  blueL: '#7aa8f0',
  breast: '#e8883a',
  beak: '#2a2420',
  eye: '#14101c',
};

const FLIGHT_TIME = 1.6; // s for one loop
const REST = [4, 6]; // s perched between loops

// Loop waypoints relative to the archer's centre x / foot y (screen space, not mirrored).
const LOOP = [
  [-14, -22],
  [-10, -30],
  [2, -32],
  [13, -26],
  [11, -18],
];

/** World point of the shoulder perch for a pose (back shoulder, so it trails his facing). */
function perch(cx, footY, f, bob) {
  return { x: Math.round(cx) - 6 * f, y: footY - 12 + bob };
}

/** Catmull-Rom through pts at u ∈ [0, 1]. */
function spline(pts, u) {
  const n = pts.length - 1;
  const s = Math.min(n - 1e-6, u * n);
  const i = Math.floor(s);
  const k = s - i;
  const p0 = pts[Math.max(0, i - 1)];
  const p1 = pts[i];
  const p2 = pts[i + 1];
  const p3 = pts[Math.min(n, i + 2)];
  const c = (a, b, c2, d) =>
    0.5 * (2 * b + (-a + c2) * k + (2 * a - 5 * b + 4 * c2 - d) * k * k + (-a + 3 * b - 3 * c2 + d) * k * k * k);
  return { x: c(p0.x, p1.x, p2.x, p3.x), y: c(p0.y, p1.y, p2.y, p3.y) };
}

const restTime = () => REST[0] + Math.random() * (REST[1] - REST[0]);

export function createRobin() {
  let rest = restTime();
  let fly = -1; // seconds into the current loop, −1 = perched
  let flapT = 0;
  let lastX = 0;
  let dir = 1;

  function update(dt) {
    flapT += dt;
    if (fly >= 0) {
      if ((fly += dt) >= FLIGHT_TIME) {
        fly = -1;
        rest = restTime();
      }
    } else if ((rest -= dt) <= 0) fly = 0;
  }

  /** Draw at the archer's pose (call right after drawArcher). */
  function render(ctx, cx, footY, f, bob) {
    const home = perch(cx, footY, f, bob);
    if (fly < 0) {
      draw(ctx, home.x, home.y, f, null);
      lastX = home.x;
      return;
    }
    // ease out of / back into the perch so the take-off and landing are gentle
    const u = fly / FLIGHT_TIME;
    const e = u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) ** 2;
    const pts = [home, ...LOOP.map(([dx, dy]) => ({ x: cx + dx, y: footY + dy })), home];
    const p = spline(pts, e);
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    if (x !== lastX) dir = Math.sign(x - lastX);
    lastX = x;
    draw(ctx, x, y, dir, Math.floor(flapT * 14) % 2 === 0 ? 'up' : 'down');
  }

  return { update, render };
}

/** The robin, feet at (x, y), facing f; wings null (folded) / 'up' / 'down'. */
function draw(ctx, x, y, f, wings) {
  const D = (lx, ly, w, h, c) => rect(ctx, f === 1 ? x + lx : x - lx - w + 1, y + ly, w, h, c);
  D(-3, -4, 2, 1, R.blueD); // tail
  D(-2, -5, 4, 2, R.blue); // body
  D(-1, -6, 2, 1, R.blueL); // back
  D(0, -4, 2, 1, R.breast); // orange breast
  D(1, -7, 2, 2, R.blue); // head
  D(2, -7, 1, 1, R.eye);
  D(3, -6, 1, 1, R.beak);
  if (!wings) {
    D(-1, -5, 2, 1, R.blueD); // folded wing
    D(0, -3, 1, 1, R.beak); // feet
  } else if (wings === 'up') {
    D(-1, -7, 1, 2, R.blueD);
    D(-2, -8, 1, 1, R.blueD);
  } else {
    D(-1, -3, 1, 2, R.blueD);
    D(-2, -2, 1, 1, R.blueD);
  }
}
