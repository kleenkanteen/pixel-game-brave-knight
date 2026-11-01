// The dark woods ambience: a low drone + wind (synthesized), then an owl hoot (synthesized) and a
// real wolf howl (Wikimedia Commons, public domain) taking turns, 20 s apart.
// One engine shared by every Stage so it carries on across Stage transitions; each Stage just
// says how much of it it wants via setLevel().

import { audioContext, noiseBuffer as makeNoise } from '../core/audio.js';

const MASTER = 0.55; // overall volume at level 1
const CALL_EVERY = 40; // s between owl calls, and between wolf howls (they take turns, 20 s apart)
const RESPONSE = 1.2; // s for the volume to follow setLevel()

let ac = null;
let master = null; // gain: level × MASTER
let echo = null; // input of the distance echo
let level = 0; // what the Stage asked for (0..1)
let applied = -1; // last level sent to the gain
let started = false; // drone running
const FIRST_OWL = 5; // s after the dark sets in
const FIRST_WOLF = FIRST_OWL + CALL_EVERY / 2;
let owlTimer = FIRST_OWL;
let wolfTimer = FIRST_WOLF;

function ensureContext() {
  if (master) return ac;
  ac = audioContext();
  if (!ac) return null;
  try {
    master = ac.createGain();
    master.gain.value = 0;
    master.connect(ac.destination);

    // "far away": a lowpassed feedback delay that calls are also sent through
    echo = ac.createGain();
    const delay = ac.createDelay(1);
    delay.delayTime.value = 0.38;
    const fb = ac.createGain();
    fb.gain.value = 0.3;
    const damp = ac.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 900;
    echo.connect(delay);
    delay.connect(damp);
    damp.connect(fb);
    fb.connect(delay);
    damp.connect(master);
  } catch {
    master = null;
    return null;
  }
  return ac;
}

const noiseBuffer = (seconds) => makeNoise(ac, seconds, 'brown');

/** The constant hum: two slightly detuned low sines beating against each other, plus wind. */
function startDrone() {
  const hum = ac.createGain();
  hum.gain.value = 0.16;
  hum.connect(master);
  for (const [freq, type, g] of [
    [55, 'sine', 1],
    [55.35, 'sine', 0.8],
    [82.6, 'triangle', 0.18], // a dissonant fifth-ish overtone
  ]) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const og = ac.createGain();
    og.gain.value = g;
    o.connect(og);
    og.connect(hum);
    o.start();
  }
  // slow swell on the hum
  const lfo = ac.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoG = ac.createGain();
  lfoG.gain.value = 0.05;
  lfo.connect(lfoG);
  lfoG.connect(hum.gain);
  lfo.start();

  // wind through dead branches: brown noise, a lowpass whose cutoff drifts
  const wind = ac.createBufferSource();
  wind.buffer = noiseBuffer(6);
  wind.loop = true;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 380;
  lp.Q.value = 2;
  const windG = ac.createGain();
  windG.gain.value = 0.22;
  const gust = ac.createOscillator();
  gust.frequency.value = 0.11;
  const gustG = ac.createGain();
  gustG.gain.value = 180;
  gust.connect(gustG);
  gustG.connect(lp.frequency);
  wind.connect(lp);
  lp.connect(windG);
  windG.connect(master);
  wind.start();
  gust.start();
}

/** A voice that ends in `pan`, sent dry (quiet) + into the echo. Returns its input node. */
function voice(gain) {
  const env = ac.createGain();
  env.gain.value = 0;
  const pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
  const dry = ac.createGain();
  dry.gain.value = gain;
  const wet = ac.createGain();
  wet.gain.value = gain * 0.9;
  if (pan) {
    pan.pan.value = (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.5);
    env.connect(pan);
    pan.connect(dry);
    pan.connect(wet);
  } else {
    env.connect(dry);
    env.connect(wet);
  }
  dry.connect(master);
  wet.connect(echo);
  return env;
}

/** Owl: "hoo … hoo-hoo-hoooo", soft sines that dip in pitch. */
function owl(t0) {
  const base = 235 + Math.random() * 30; // low and hollow, like a great horned owl
  const hoots = [
    [0, 0.32],
    [0.75, 0.16],
    [1.0, 0.16],
    [1.25, 0.55],
  ];
  const out = voice(0.32);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 600;
  lp.connect(out);
  out.gain.setValueAtTime(1, t0);
  for (const [at, len] of hoots) {
    const t = t0 + at;
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(base * 1.06, t);
    o.frequency.exponentialRampToValueAtTime(base * 0.92, t + len);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + 0.08);
    g.gain.setValueAtTime(1, t + len * 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, t + len + 0.08);
    o.connect(g);
    g.connect(lp);
    o.start(t);
    o.stop(t + len + 0.1);
  }
}

/**
 * Wolf: a real howl (US Fish and Wildlife Service, public domain), fetched at runtime from the
 * Wikimedia Commons API; we play one ~5 s howl out of the 28 s recording.
 */
const WOLF_API_URL =
  'https://commons.wikimedia.org/w/api.php?' +
  new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    titles: 'File:Wolf howls.ogg',
    prop: 'videoinfo',
    viprop: 'url|derivatives',
  });
const WOLF_FROM = 8.0; // s into the recording: one rising, held howl
const WOLF_LEN = 4.8; // s
let wolfBuffer = null;
let wolfLoading = false;

async function loadWolf() {
  wolfLoading = true;
  try {
    const data = await (await fetch(WOLF_API_URL)).json();
    const info = data?.query?.pages?.[0]?.videoinfo?.[0];
    if (!info) return;
    // prefer the MP3 transcode (Safari can't always decode Ogg Vorbis), else the original
    const mp3 = (info.derivatives || []).find((d) => d.type === 'audio/mpeg');
    const buf = await (await fetch(mp3?.src || info.url)).arrayBuffer();
    wolfBuffer = await new Promise((ok, fail) => ac.decodeAudioData(buf, ok, fail));
  } catch {
    /* no wolf, just the owl and the hum */
  }
}

function wolf(t0) {
  if (!wolfBuffer) return;
  const len = Math.min(WOLF_LEN, wolfBuffer.duration - WOLF_FROM);
  if (len <= 0) return;
  const out = voice(0.75);
  out.gain.setValueAtTime(0, t0);
  out.gain.linearRampToValueAtTime(1, t0 + 0.3);
  out.gain.setValueAtTime(1, t0 + len - 0.9);
  out.gain.linearRampToValueAtTime(0, t0 + len);
  const src = ac.createBufferSource();
  src.buffer = wolfBuffer;
  src.connect(out);
  src.start(t0, WOLF_FROM, len);
}

/**
 * Dark woods ambience (shared across Stages).
 *   setLevel(0..1)  how present it should be; the volume eases toward it. 0 = silent.
 *   update(dt)      call once per tick from the Stage that owns the moment.
 */
export const darkWoods = {
  setLevel(v) {
    level = Math.max(0, Math.min(1, v));
  },

  update(dt) {
    if (level <= 0 && !started) return; // never needed yet: don't even make a context
    if (!ensureContext()) return;
    if (!started) {
      started = true;
      try {
        startDrone();
      } catch {
        /* stay silent */
      }
    }
    if (Math.abs(level - applied) > 0.01) {
      master.gain.setTargetAtTime(level * MASTER, ac.currentTime, RESPONSE / 3);
      applied = level;
    }
    if (!wolfLoading) loadWolf();
    if (level > 0.5 && ac.state === 'running') {
      owlTimer -= dt;
      wolfTimer -= dt;
      try {
        if (owlTimer <= 0) {
          owlTimer = CALL_EVERY;
          owl(ac.currentTime + 0.05);
        }
        if (wolfTimer <= 0) {
          wolfTimer = CALL_EVERY;
          wolf(ac.currentTime + 0.05);
        }
      } catch {
        /* ignore */
      }
    } else if (level <= 0) {
      owlTimer = FIRST_OWL;
      wolfTimer = FIRST_WOLF;
    }
  },
};
