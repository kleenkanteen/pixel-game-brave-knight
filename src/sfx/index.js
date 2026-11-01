// Sound effects. Synthesized with Web Audio: sword slash, bow string, Arrow Storm's volley of bow
// strings, Blessed Touch's angelic chord, and Stage 5's: a Shadow's pulse, a portcullis, the Dark
// Lord's beam (charge + fire), his transformation and his death. Lightning Strike plays a real thunderclap from Commons. Fire-and-forget; silent
// where Web Audio is unavailable.
import { audioContext, noiseBuffer } from '../core/audio.js';
import { VIEW_H, VIEW_W } from '../core/constants.js';
import { drawText, measureText } from '../core/font.js';

const VOLUME = 0.6;

/**
 * Lightning: a real thunderclap (Richard Humphries, CC BY 4.0), fetched at runtime from the
 * Wikimedia Commons API. We play 4 s of it: a brief rumble, the crack at THUNDER_CRACK, the roll.
 */
const THUNDER_API_URL =
  'https://commons.wikimedia.org/w/api.php?' +
  new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    titles: 'File:Nosferatu thunderclap - Richard Humphries.wav',
    prop: 'videoinfo',
    viprop: 'url|derivatives|extmetadata',
    viextmetadatafilter: 'Artist|LicenseShortName',
  });
const THUNDER_FROM = 3.0; // s into the recording
const THUNDER_CRACK = 3.37; // s into the recording: the crack
const THUNDER_LEN = 4; // s
const THUNDER_VOL = 1.1;
let thunder = null; // AudioBuffer
let thunderLoading = false;
let thunderCredit = '';
let creditUntil = 0; // performance.now() seconds

const stripHtml = (html) => String(html || '').replace(/<[^>]*>/g, '').trim();

async function loadThunder() {
  const ac = ready();
  if (!ac) return;
  const data = await (await fetch(THUNDER_API_URL)).json();
  const info = data?.query?.pages?.[0]?.videoinfo?.[0];
  if (!info) return;
  // the MP3 transcode decodes everywhere (Safari included); else the original
  const mp3 = (info.derivatives || []).find((d) => d.type === 'audio/mpeg');
  const buf = await (await fetch(mp3?.src || info.url)).arrayBuffer();
  thunder = await new Promise((ok, fail) => ac.decodeAudioData(buf, ok, fail));
  const meta = info.extmetadata || {};
  thunderCredit = `Thunder: ${stripHtml(meta.Artist?.value) || 'Richard Humphries'}, ${stripHtml(meta.LicenseShortName?.value) || 'CC BY 4.0'}, Wikimedia Commons`;
}

let out = null; // master gain
let verb = null; // input of a soft feedback-delay "hall" (for the angelic chord + thunder tail)
let white = null; // shared 2 s white-noise buffer

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

  /** Bow string: a deep, damped "thwum" with a soft click of release. `delay` in s. */
  bowString: safe((delay = 0) => {
    const ac = ready();
    if (!ac) return;
    const t = ac.currentTime + 0.005 + delay;
    const f = 82 * (0.94 + Math.random() * 0.12);
    const g = env(ac, t, 0.6, 0.004, 0.36);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 5;
    lp.frequency.setValueAtTime(1500, t);
    lp.frequency.exponentialRampToValueAtTime(150, t + 0.22);
    lp.connect(g);
    const o = tone(ac, 'sawtooth', f * 1.2, t, 0.4, lp);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    // body: a low sine thump under the string
    const body = env(ac, t, 0.5, 0.003, 0.2);
    const b = tone(ac, 'sine', f * 0.75, t, 0.25, body);
    b.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.2);
    const click = env(ac, t, 0.12, 0.001, 0.02);
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;
    hp.connect(click);
    noise(ac, white, t, 0.03, hp);
  }),

  /** Reptilian bite: a wet crunch of jaws snapping shut. */
  bite: safe(() => {
    const ac = ready();
    if (!ac) return;
    const t = ac.currentTime + 0.005;
    const g = env(ac, t, 0.6, 0.002, 0.12);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2;
    bp.frequency.setValueAtTime(1800, t);
    bp.frequency.exponentialRampToValueAtTime(500, t + 0.1);
    bp.connect(g);
    noise(ac, white, t, 0.14, bp);
    const thump = env(ac, t, 0.5, 0.002, 0.14);
    const o = tone(ac, 'sine', 160, t, 0.16, thump);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.12);
    const click = env(ac, t + 0.01, 0.25, 0.001, 0.03);
    tone(ac, 'square', 900, t + 0.01, 0.04, click);
  }),

  /** Reptilian crouching to spring: a low, rattling growl. */
  growl: safe(() => {
    const ac = ready();
    if (!ac) return;
    const t = ac.currentTime + 0.005;
    const g = env(ac, t, 0.28, 0.08, 0.45);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 600;
    lp.connect(g);
    const o = tone(ac, 'sawtooth', 70 + Math.random() * 15, t, 0.55, lp);
    const lfo = ac.createOscillator();
    lfo.frequency.value = 28;
    const depth = ac.createGain();
    depth.gain.value = 18;
    lfo.connect(depth);
    depth.connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + 0.6);
    noise(ac, white, t, 0.5, lp);
  }),

  /** Arrow Storm: `n` bow strings in quick succession. */
  volley(n = 5, every = 0.14) {
    for (let i = 0; i < n; i++) sfx.bowString(i * every);
  },

  /** Lightning Strike: a real thunderclap, timed so its crack lands as the bolt hits (`gather` s after the cast). */
  lightning: safe((gather = 0.5) => {
    const ac = ready();
    if (!ac || !thunder) return;
    const t = ac.currentTime + 0.005 + Math.max(0, gather - (THUNDER_CRACK - THUNDER_FROM));
    const len = Math.min(THUNDER_LEN, thunder.duration - THUNDER_FROM);
    const g = ac.createGain();
    g.gain.setValueAtTime(THUNDER_VOL, t);
    g.gain.setValueAtTime(THUNDER_VOL, t + len - 1.2);
    g.gain.linearRampToValueAtTime(0, t + len);
    g.connect(out);
    const src = ac.createBufferSource();
    src.buffer = thunder;
    src.connect(g);
    src.start(t, THUNDER_FROM, len);
    creditUntil = performance.now() / 1000 + (t - ac.currentTime) + len;
  }),

  /** Start fetching the thunder recording (call before Lightning Strike can be used). */
  preload() {
    if (thunderLoading) return;
    thunderLoading = true;
    loadThunder().catch(() => {});
  },

  /** SCREEN coords: the thunder's CC BY credit, bottom-left, while it plays. */
  renderCredit(ctx) {
    const left = creditUntil - performance.now() / 1000;
    if (left <= 0 || !thunderCredit) return;
    let text = thunderCredit;
    if (measureText(text) > VIEW_W - 6) text = text.replace(', Wikimedia Commons', ', Commons');
    const prev = ctx.globalAlpha;
    ctx.globalAlpha = prev * 0.55 * Math.min(1, left / 0.6);
    drawText(ctx, text, 3, VIEW_H - 10, { color: '#b9b2c8', shadow: true });
    ctx.globalAlpha = prev;
  },

  /** A Shadow's purple pulse: a short descending "pew" with a fizz. */
  pulse: safe(() => {
    const ac = ready();
    if (!ac) return;
    const t = ac.currentTime + 0.005;
    const g = env(ac, t, 0.16, 0.005, 0.28);
    const o = tone(ac, 'square', 880, t, 0.3, g);
    o.frequency.exponentialRampToValueAtTime(220, t + 0.28);
    const f = env(ac, t, 0.08, 0.005, 0.18);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400;
    bp.connect(f);
    noise(ac, white, t, 0.2, bp);
  }),

  /** A portcullis: chains rattling over a deep grinding rumble, then (down) a heavy clang. */
  gate: safe((closing = false, dur = 2) => {
    const ac = ready();
    if (!ac) return;
    const t = ac.currentTime + 0.01;
    const rumble = ac.createGain();
    rumble.gain.setValueAtTime(0.0001, t);
    rumble.gain.linearRampToValueAtTime(0.5, t + 0.2);
    rumble.gain.setValueAtTime(0.5, t + dur - 0.3);
    rumble.gain.linearRampToValueAtTime(0.0001, t + dur);
    rumble.connect(out);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 220;
    lp.connect(rumble);
    noise(ac, white, t, Math.min(1.9, dur), lp);
    // chain links: little metallic ticks
    for (let i = 0; i < dur * 9; i++) {
      const at = t + i / 9 + Math.random() * 0.03;
      const g = env(ac, at, 0.05, 0.002, 0.06);
      tone(ac, 'triangle', 1800 + Math.random() * 900, at, 0.08, g);
    }
    if (closing) {
      const at = t + dur;
      const g = env(ac, at, 0.7, 0.003, 0.9);
      g.connect(verb);
      for (const f of [110, 163, 247, 391]) tone(ac, 'triangle', f, at, 0.95, g);
      const thud = env(ac, at, 0.9, 0.003, 0.4);
      const o = tone(ac, 'sine', 90, at, 0.45, thud);
      o.frequency.exponentialRampToValueAtTime(40, at + 0.4);
    }
  }),

  /** The Dark Lord readies his beam: a rising, wavering hum (`dur` s). */
  beamCharge: safe((dur = 2) => {
    const ac = ready();
    if (!ac) return;
    const t = ac.currentTime + 0.01;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + dur * 0.9);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    g.connect(out);
    for (const [type, f0, det] of [['sawtooth', 110, 0], ['sine', 220, 7]]) {
      const o = tone(ac, type, f0, t, dur, g);
      o.detune.value = det;
      o.frequency.exponentialRampToValueAtTime(f0 * 3, t + dur);
      const lfo = ac.createOscillator();
      lfo.frequency.value = 9;
      const depth = ac.createGain();
      depth.gain.value = 18;
      lfo.connect(depth);
      depth.connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
  }),

  /** The beam fires: a searing, buzzing roar that dies away (`dur` s). */
  beam: safe((dur = 0.7) => {
    const ac = ready();
    if (!ac) return;
    const t = ac.currentTime + 0.005;
    const g = env(ac, t, 0.5, 0.01, dur);
    g.connect(verb);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(5000, t);
    lp.frequency.exponentialRampToValueAtTime(400, t + dur);
    lp.connect(g);
    noise(ac, white, t, dur + 0.05, lp);
    for (const f of [55, 82.5, 110]) tone(ac, 'sawtooth', f, t, dur, lp);
  }),

  /** The Dark Lord's transformation: a swelling whoosh of dark wind and a low groan sweeping down. */
  transform: safe((dur = 2.2) => {
    const ac = ready();
    if (!ac) return;
    const t = ac.currentTime + 0.01;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + dur * 0.8);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    g.connect(out);
    g.connect(verb);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2;
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(2400, t + dur * 0.8);
    bp.connect(g);
    noise(ac, white, t, Math.min(1.95, dur), bp);
    const groan = env(ac, t + dur * 0.55, 0.3, 0.2, dur * 0.6);
    const o = tone(ac, 'sawtooth', 140, t + dur * 0.55, dur * 0.7, groan);
    o.frequency.exponentialRampToValueAtTime(45, t + dur * 1.2);
  }),

  /** The shadow form breaks apart: a deep boom and a long airy dissolve. */
  bossDeath: safe(() => {
    const ac = ready();
    if (!ac) return;
    const t = ac.currentTime + 0.01;
    const boom = env(ac, t, 0.9, 0.005, 1.4);
    boom.connect(verb);
    const o = tone(ac, 'sine', 120, t, 1.5, boom);
    o.frequency.exponentialRampToValueAtTime(30, t + 1.4);
    const air = env(ac, t, 0.35, 0.3, 1.6);
    air.connect(verb);
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    hp.connect(air);
    noise(ac, white, t, 1.9, hp);
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
