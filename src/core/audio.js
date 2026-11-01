// The one shared Web Audio context for synthesized sound (ambience, sound effects). Created lazily
// on first use; browsers may hold one made outside a user gesture suspended, so it resumes on the
// next gesture. Returns null where Web Audio is missing: callers then stay silent.

let ac = null;
let failed = false;

/** @returns {AudioContext|null} */
export function audioContext() {
  if (ac || failed) return ac;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error('no Web Audio');
    ac = new AC();
  } catch {
    failed = true;
    ac = null;
  }
  return ac;
}

if (typeof window !== 'undefined') {
  const resume = () => {
    if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
  };
  ['pointerdown', 'keydown', 'touchend'].forEach((g) => window.addEventListener(g, resume, { capture: true }));
}

/** A mono noise buffer: 'white' (hiss) or 'brown' (soft rumble). */
export function noiseBuffer(ctx, seconds, kind = 'white') {
  const n = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'brown') {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    } else d[i] = w;
  }
  return buf;
}
