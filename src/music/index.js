// Music, looped with Web Audio:
//   bossMusic     HydroGene's "Boss Battle" (8-bit Music for GameDev, CC0, so no credit needed),
//                 fetched at runtime from the Wikimedia Commons API
//   victoryMusic  the Dark Lord's defeat → the dance party: StockTune's "Pixelated Dreamscape
//                 Quest", a local file in public/music/ (StockTune can't be fetched cross-origin)
// Each track:
//   preload()   start fetching it (call when its Stage starts)
//   play()      fade it in and loop it; already playing → keeps going (e.g. across a Restart).
//               Called before it has loaded → it starts as soon as it has.
//   stop(fade)  fade it out over `fade` s and stop
//   credit      the on-screen attribution line ('' when none is needed)
// Silent where Web Audio / the network is missing.

import { audioContext } from '../core/audio.js';

/** The boss fight. */
const BOSS = { title: 'File:8-bit Music for GameDev - 03. Boss Battle.opus', volume: 0.45, credit: '' };
/** The victory / dance party (a file served from public/). */
const VICTORY = {
  url: `${import.meta.env.BASE_URL}music/${encodeURIComponent('pixel victory music.mp3')}`,
  volume: 0.5,
  credit: 'Music: Pixelated Dreamscape Quest, StockTune',
};
const FADE_IN = 0.6; // s
const SILENT = 0.003; // below this the transcode's lead-in / tail counts as silence (trimmed from the loop)

/** Where the sound actually starts and ends, so the loop has no gap of silence at the seam. */
function trimmed(buf) {
  const d = buf.getChannelData(0);
  let a = 0;
  let b = d.length - 1;
  while (a < b && Math.abs(d[a]) < SILENT) a++;
  while (b > a && Math.abs(d[b]) < SILENT) b--;
  return { start: a / buf.sampleRate, end: (b + 1) / buf.sampleRate };
}

const safe = (fn) => (...args) => {
  try {
    fn(...args);
  } catch {
    /* stay silent */
  }
};

/** One looping track: a Commons file (`title`) or a plain `url`. */
function createTrack({ title, url, volume, credit }) {
  let buffer = null;
  let loop = { start: 0, end: 0 };
  let loading = false;
  let missing = false; // the file isn't there / won't decode: stay silent, don't keep asking
  let wanted = false; // play() was called and stop() hasn't been since
  let voice = null; // { src, g } while playing

  const apiUrl = () =>
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

  /** The audio file's URL: as given, or looked up on Commons. */
  async function source() {
    if (url) return url;
    const data = await (await fetch(apiUrl())).json();
    const info = data?.query?.pages?.[0]?.videoinfo?.[0];
    if (!info) return null;
    // the MP3 transcode decodes everywhere (Safari can't do Opus); else the original
    const mp3 = (info.derivatives || []).find((d) => d.type === 'audio/mpeg');
    return mp3?.src || info.url;
  }

  async function load(ac) {
    const src = await source();
    if (!src) return;
    const res = await fetch(src);
    if (!res.ok || (res.headers.get('content-type') || '').includes('text/html')) {
      missing = true; // e.g. the dev server's index.html fallback for a file not in public/
      return;
    }
    const bytes = await res.arrayBuffer();
    try {
      buffer = await ac.decodeAudioData(bytes);
    } catch {
      missing = true;
      return;
    }
    loop = trimmed(buffer);
    if (wanted) start();
  }

  function start() {
    const ac = audioContext();
    if (!ac || !buffer || voice) return;
    const t = ac.currentTime + 0.01;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(volume, t + FADE_IN);
    g.connect(ac.destination);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.loopStart = loop.start;
    src.loopEnd = loop.end;
    src.connect(g);
    src.start(t, loop.start);
    voice = { src, g };
  }

  const track = {
    credit,

    preload: safe(() => {
      if (loading || missing) return;
      const ac = audioContext();
      if (!ac) return;
      loading = true;
      load(ac).catch(() => {
        loading = false; // try again next time
      });
    }),

    play: safe(() => {
      wanted = true;
      track.preload();
      start();
    }),

    stop: safe((fade = 0.5) => {
      wanted = false;
      if (!voice) return;
      const ac = audioContext();
      const { src, g } = voice;
      voice = null;
      const t = ac.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + fade);
      src.stop(t + fade + 0.05);
    }),

    /** Debug / tools: true while it's audible. */
    get playing() {
      return voice !== null;
    },
  };
  return track;
}

export const bossMusic = createTrack(BOSS);
export const victoryMusic = createTrack(VICTORY);
