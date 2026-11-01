// The Hydra's voice and fire: real recordings fetched at runtime from the Wikimedia Commons API
// (all public domain, so no on-screen credit is needed), shaped with Web Audio.
//   roar()   it wakes: a long, deep monster roar          (stilgar, "Monster growls")
//   whoosh() a spat fireball: a short swept burst of flame  (gregoryweir, "Pressurized fire")
//   blast()  the floor-wide fire blast: an intense roaring flame + a boom + a second roar
//            (the same flame, slowed; tcpp, "Explosion 10"; stilgar, "Monster growls 2")
// Fire-and-forget; silent until the clips have loaded, or where Web Audio / the network is missing.

import { audioContext } from '../core/audio.js';

const VOLUME = 0.9;

/** Commons file → which slice of it we play (s). */
const CLIPS = {
  roar: { title: 'File:Monster growls.ogg', from: 0.2, len: 2.6 },
  roar2: { title: 'File:Monster growls 2.ogg', from: 19.6, len: 3.2 },
  flame: { title: 'File:Pressurized fire.ogg', from: 0.06, len: 1.8 },
  boom: { title: 'File:Explosion 10.ogg', from: 0, len: 2.7 },
};

const buffers = {}; // name → AudioBuffer
let loading = false;
let out = null;

const apiUrl = (title) =>
  'https://commons.wikimedia.org/w/api.php?' +
  new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    titles: title,
    prop: 'videoinfo',
    viprop: 'url|derivatives',
  });

async function load(ac, name) {
  const data = await (await fetch(apiUrl(CLIPS[name].title))).json();
  const info = data?.query?.pages?.[0]?.videoinfo?.[0];
  if (!info) return;
  // the MP3 transcode decodes everywhere (Safari included); else the original
  const mp3 = (info.derivatives || []).find((d) => d.type === 'audio/mpeg');
  const buf = await (await fetch(mp3?.src || info.url)).arrayBuffer();
  buffers[name] = await new Promise((ok, fail) => ac.decodeAudioData(buf, ok, fail));
}

function ready() {
  const ac = audioContext();
  if (!ac) return null;
  if (!out) {
    out = ac.createGain();
    out.gain.value = VOLUME;
    out.connect(ac.destination);
  }
  return ac;
}

/**
 * Play a slice of clip `name` starting `delay` s from now. `gain`, `rate` (playback speed),
 * `fadeIn` / `fadeOut` s, `len` (s of the recording, default the clip's), `filter` (a node to pass
 * through first). Returns {src, g, t} or null.
 */
function play(name, { gain = 1, rate = 1, fadeIn = 0.02, fadeOut = 0.4, len, delay = 0, filter = null } = {}) {
  const ac = ready();
  const buf = buffers[name];
  if (!ac || !buf) return null;
  const clip = CLIPS[name];
  const from = Math.min(clip.from, buf.duration);
  const slice = Math.min(len ?? clip.len, buf.duration - from);
  if (slice <= 0) return null;
  const dur = slice / rate; // real seconds it lasts
  const t = ac.currentTime + 0.01 + delay;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + fadeIn);
  g.gain.setValueAtTime(gain, t + Math.max(fadeIn, dur - fadeOut));
  g.gain.linearRampToValueAtTime(0, t + dur);
  g.connect(out);
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  if (filter) {
    src.connect(filter);
    filter.connect(g);
  } else src.connect(g);
  src.start(t, from, slice);
  src.stop(t + dur + 0.05);
  return { src, g, t, dur };
}

const safe = (fn) => (...args) => {
  try {
    fn(...args);
  } catch {
    /* stay silent */
  }
};

export const hydraSounds = {
  /** Start fetching the recordings (call when the Hydra's Stage starts). */
  preload() {
    if (loading) return;
    const ac = ready();
    if (!ac) return;
    loading = true;
    for (const name of Object.keys(CLIPS)) load(ac, name).catch(() => {});
  },

  /** Debug / tools: names of the clips decoded so far. */
  get loaded() {
    return Object.keys(buffers);
  },

  /** It wakes and sees the party: a long, deep roar. */
  roar: safe(() => {
    play('roar', { gain: 1.1, rate: 0.85, fadeIn: 0.05, fadeOut: 0.8 });
  }),

  /** A spat fireball: a short burst of flame, its brightness sweeping down as it flies off. */
  whoosh: safe(() => {
    const ac = ready();
    if (!ac || !buffers.flame) return;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.8;
    const len = 0.85; // s of the recording
    const rate = 1.25 + Math.random() * 0.15;
    const p = play('flame', { gain: 1.3, rate, fadeIn: 0.06, fadeOut: 0.45, len, filter: bp });
    if (!p) return;
    bp.frequency.setValueAtTime(900, p.t);
    bp.frequency.linearRampToValueAtTime(3200, p.t + 0.1);
    bp.frequency.exponentialRampToValueAtTime(400, p.t + p.dur);
  }),

  /** The floor-wide fire blast: a deep, intense rush of flame, a boom, and a roar over it. */
  blast: safe(() => {
    const ac = ready();
    if (!ac) return;
    // the flame, slowed down so it's deeper and lasts the whole sweep, with a low-shelf boost
    const shelf = ac.createBiquadFilter();
    shelf.type = 'lowshelf';
    shelf.frequency.value = 400;
    shelf.gain.value = 8;
    play('flame', { gain: 1.2, rate: 0.75, fadeIn: 0.08, fadeOut: 0.8, filter: shelf });
    // a second, brighter layer just behind it so it sounds huge
    play('flame', { gain: 0.6, rate: 1.05, fadeIn: 0.15, fadeOut: 0.6, delay: 0.12 });
    play('boom', { gain: 1.0, rate: 0.9, fadeIn: 0.005, fadeOut: 1.2 });
    play('roar2', { gain: 1.0, rate: 0.9, fadeIn: 0.1, fadeOut: 0.9 });
  }),
};
