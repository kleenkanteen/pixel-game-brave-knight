// Sound effects, synthesized with Web Audio (no audio files): sword slash, bow string, lightning,
// Arrow Storm's volley of bow strings, Blessed Touch's angelic chord. Fire-and-forget; silent
// where Web Audio is unavailable.
import { audioContext, noiseBuffer } from '../core/audio.js';

const VOLUME = 0.6;

let out = null; // master gain
let verb = null; // input of a soft feedback-delay "hall" (for the angelic chord + thunder tail)
let white = null; // shared 2 s white-noise buffer
let brown = null; // shared 3 s brown-noise buffer

function ready() {
  const ac = audioContext();
  if (!ac) return null;
  if (!out) {
    out = ac.createGain();
    out.gain.value = VOLUME;
    out.connect(ac.destination);
    verb = ac.createGain();
    const taps = [0.11, 0.17, 0.23];
    for (const d of taps) {
      const delay = ac.createDelay(1);
      delay.delayTime.value = d;
      const fb = ac.createGain();
      fb.gain.value = 0.45;
      const damp = ac.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 2600;
      verb.connect(delay);
      delay.connect(damp);
      damp.connect(fb);
      fb.connect(delay);
      const wet = ac.createGain();
      wet.gain.value = 0.35;
      damp.connect(wet);
      wet.connect(out);
    }
    white = noiseBuffer(ac, 2, 'white');
    brown = noiseBuffer(ac, 3, 'brown');
  }
  return ac;
}

/** Gain node with an attack/decay envelope starting at t. */
function env(ac, t, peak, attack, decay, dest = out) {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(dest);
  return g;
}

/** Play a slice of a noise buffer into `dest`. */
function noise(ac, buf, t, dur, dest) {
  const s = ac.createBufferSource();
  s.buffer = buf;
  s.connect(dest);
  s.start(t, Math.random() * Math.max(0, buf.duration - dur - 0.01), dur);
  return s;
}

function tone(ac, type, freq, t, dur, dest) {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.connect(dest);
  o.start(t);
  o.stop(t + dur + 0.05);
  return o;
}

const safe = (fn) => (...args) => {
  try {
    fn(...args);
  } catch {
    /* stay silent */
  }
};

export const sfx = {
  /** Sword swing: an airy whoosh that sweeps down, with a faint steel ring. */
  slash: safe(() => {
    const ac = ready();
    if (!ac) return;
    const t = ac.currentTime + 0.005;
    const g = env(ac, t, 0.7, 0.03, 0.2);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(3800, t);
    bp.frequency.exponentialRampToValueAtTime(700, t + 0.2);
    bp.connect(g);
    noise(ac, white, t, 0.25, bp);
    const ring = env(ac, t + 0.02, 0.05, 0.005, 0.18);
    tone(ac, 'triangle', 2650 + Math.random() * 200, t + 0.02, 0.2, ring);
  }),

  /** Bow string: a low, damped "thwum" with a little click of release. `delay` in s. */
  bowString: safe((delay = 0) => {
    const ac = ready();
    if (!ac) return;
    const t = ac.currentTime + 0.005 + delay;
    const f = 150 * (0.93 + Math.random() * 0.14);
    const g = env(ac, t, 0.45, 0.004, 0.28);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 4;
    lp.frequency.setValueAtTime(2400, t);
    lp.frequency.exponentialRampToValueAtTime(260, t + 0.18);
    lp.connect(g);
    const o = tone(ac, 'sawtooth', f * 1.15, t, 0.3, lp);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    const click = env(ac, t, 0.25, 0.001, 0.025);
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2500;
    hp.connect(click);
    noise(ac, white, t, 0.04, hp);
  }),

  /** Arrow Storm: `n` bow strings in quick succession. */
  volley(n = 5, every = 0.14) {
    for (let i = 0; i < n; i++) sfx.bowString(i * every);
  },

  /** Lightning Strike: crackling while the rays gather (`gather` s), then a crack and a rolling rumble. */
  lightning: safe((gather = 0.5) => {
    const ac = ready();
    if (!ac) return;
    const t = ac.currentTime + 0.005;
    // crackle: hiss chopped by a fast random-ish tremolo, swelling toward the strike
    const cg = ac.createGain();
    cg.gain.setValueAtTime(0.0001, t);
    cg.gain.exponentialRampToValueAtTime(0.25, t + gather);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + gather + 0.05);
    cg.connect(out);
    const chop = ac.createGain();
    chop.gain.value = 0.5;
    chop.connect(cg);
    const lfoG = ac.createGain();
    lfoG.gain.value = 0.5;
    lfoG.connect(chop.gain);
    const lfo = tone(ac, 'square', 37, t, gather + 0.1, lfoG);
    lfo.frequency.linearRampToValueAtTime(90, t + gather);
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3000;
    hp.connect(chop);
    noise(ac, white, t, gather + 0.1, hp);

    // the crack
    const s = t + gather;
    const crack = env(ac, s, 1.0, 0.002, 0.25);
    const cbp = ac.createBiquadFilter();
    cbp.type = 'highpass';
    cbp.frequency.value = 700;
    cbp.connect(crack);
    noise(ac, white, s, 0.3, cbp);
    crack.connect(verb);
    // the boom + rumble
    const boom = env(ac, s, 1.0, 0.01, 1.9);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, s);
    lp.frequency.exponentialRampToValueAtTime(120, s + 1.2);
    lp.connect(boom);
    noise(ac, brown, s, 2, lp);
  }),

  /** Blessed Touch: a soft, swelling major chord with shimmering detune and bell-like sparkles. */
  blessed: safe(() => {
    const ac = ready();
    if (!ac) return;
    const t = ac.currentTime + 0.01;
    const dur = 1.9;
    const pad = ac.createGain();
    pad.gain.setValueAtTime(0.0001, t);
    pad.gain.exponentialRampToValueAtTime(0.16, t + 0.35);
    pad.gain.setValueAtTime(0.16, t + dur - 0.9);
    pad.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    pad.connect(out);
    pad.connect(verb);
    // C major, voiced like a choir "aah": a soft lowpass over sines + triangles, each doubled + detuned
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3000;
    lp.connect(pad);
    for (const f of [261.6, 329.6, 392.0, 523.3, 659.3]) {
      for (const [type, det] of [
        ['sine', -6],
        ['triangle', 6],
      ]) {
        const o = tone(ac, type, f, t, dur, lp);
        o.detune.value = det;
      }
    }
    // sparkles rising over it
    [1046.5, 1318.5, 1568, 2093].forEach((f, i) => {
      const at = t + 0.12 + i * 0.13;
      const g = env(ac, at, 0.07, 0.005, 0.7);
      g.connect(verb);
      tone(ac, 'sine', f, at, 0.75, g);
    });
  }),
};
