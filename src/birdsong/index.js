import { VIEW_H, VIEW_W } from '../core/constants.js';
import { drawText, measureText } from '../core/font.js';

/** Calm Bourne Woods recordings (Robert EA Harvey, CC BY-SA 4.0), 31–105 s. Resolved at runtime. */
const PINNED_TITLES = [
  'File:Birdsong Bourne Woods 2020-04-27 0722.mp3',
  'File:Bourne Woods Birdsong 2020-04-27 0751.mp3',
  'File:Bourne woods Birdsong 2020-06-25 0745.mp3',
  'File:Bourne woods Birdsong 2020-06-30 0811.mp3',
];

/** Exported for verification (curl the same URL). */
export const COMMONS_API_URL =
  'https://commons.wikimedia.org/w/api.php?' +
  new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    titles: PINNED_TITLES.join('|'),
    prop: 'imageinfo',
    iiprop: 'url|mime|size|extmetadata',
    iiextmetadatafilter: 'LicenseShortName|Artist|LicenseUrl',
  });

const VOLUME = 0.5;
const FADE_IN = 1.5; // s
const CREDIT_COLOR = '#b9b2c8';
const CREDIT_ALPHA = 0.55;

/** HTML → plain text (Artist is an <a> tag with entities). */
function stripHtml(html) {
  try {
    return (new DOMParser().parseFromString(html, 'text/html').body.textContent || '').trim();
  } catch {
    return String(html).replace(/<[^>]*>/g, '').trim();
  }
}

/**
 * Birdsong slice: on start() fetches a calm birdsong clip from the Wikimedia Commons API
 * (pinned titles, one picked at random), loops it at ~0.5 volume with a short fade-in, and
 * shows a dim credit line bottom-left while it plays. fadeOut(s) ramps to silence and stops.
 * Playback is Web Audio (fetch → decodeAudioData → looped buffer source → gain). The
 * AudioContext is created/resumed SYNCHRONOUSLY inside the user gesture (a capture-phase
 * pointer/key listener installed here, plus start() itself), so the autoplay policy allows
 * the clip that arrives later. Any failure → silent, no credit.
 *
 * @param {import('../core/stage.js').World} world
 * @returns {{
 *   start():void,                 // call from the Play click (autoplay policy)
 *   fadeOut(seconds:number):void, // fade volume to 0, then stop; credit hides
 *   update(dt:number):void,
 *   render(ctx:CanvasRenderingContext2D):void,  // SCREEN coordinates: credit line
 * }}
 */
export function createBirdsong(world) {
  let ac = null; // AudioContext
  let gain = null;
  let source = null;
  let started = false;
  let stopped = false; // fadeOut requested
  let playing = false; // audio actually audible
  let credit = ''; // credit text while playing
  let creditAlpha = 0; // 0..1, follows the volume envelope
  let fade = null; // {from, to, t, dur, stopAfter}
  let level = 0; // current envelope level 0..1 (mirrors the gain ramp, for the credit)

  /** Create + resume the AudioContext. Must run inside a user gesture the first time. */
  function unlock() {
    try {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ac = new AC();
        gain = ac.createGain();
        gain.gain.value = 0;
        gain.connect(ac.destination);
        // Classic iOS/Safari unlock: play a 1-sample silent buffer within the gesture.
        const b = ac.createBuffer(1, 1, 22050);
        const s = ac.createBufferSource();
        s.buffer = b;
        s.connect(ac.destination);
        s.start(0);
      }
      if (ac.state === 'suspended') ac.resume().catch(() => {});
    } catch {
      /* stay silent */
    }
  }

  // The Play click is handled in the next fixed update tick, outside the DOM event. Unlock
  // audio synchronously in the gesture itself (capture phase, before anything else).
  const GESTURES = ['pointerdown', 'mousedown', 'touchend', 'keydown'];
  const onGesture = () => unlock();
  GESTURES.forEach((g) => window.addEventListener(g, onGesture, { capture: true }));
  const removeGestures = () => GESTURES.forEach((g) => window.removeEventListener(g, onGesture, { capture: true }));

  function rampTo(to, dur, stopAfter = false) {
    fade = { from: level, to, t: 0, dur: Math.max(0.001, dur), stopAfter };
    if (!ac || !gain) return;
    const now = ac.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(to * VOLUME, now + dur);
  }

  async function load() {
    const res = await fetch(COMMONS_API_URL);
    const data = await res.json();
    const pages = (data?.query?.pages || []).filter((p) => p.imageinfo?.[0]?.url);
    if (!pages.length) return;
    const info = pages[Math.floor(Math.random() * pages.length)].imageinfo[0];
    const audioRes = await fetch(info.url);
    const buf = await audioRes.arrayBuffer();
    if (stopped || !ac) return;
    const audio = await new Promise((ok, fail) => ac.decodeAudioData(buf, ok, fail));
    if (stopped) return;
    if (ac.state === 'suspended') await ac.resume();
    source = ac.createBufferSource();
    source.buffer = audio;
    source.loop = true;
    source.connect(gain);
    source.start();
    const meta = info.extmetadata || {};
    const artist = stripHtml(meta.Artist?.value || '') || 'Unknown';
    const license = stripHtml(meta.LicenseShortName?.value || '') || 'see Commons';
    credit = `Birdsong: ${artist}, ${license}, Wikimedia Commons`;
    playing = true;
    rampTo(1, FADE_IN);
  }

  function stopSource() {
    try {
      source?.stop();
      source?.disconnect();
    } catch {
      /* ignore */
    }
    source = null;
    playing = false;
  }

  return {
    start() {
      if (started) return;
      started = true;
      removeGestures();
      unlock(); // in case start() is called directly inside a gesture
      load().catch(() => {
        playing = false; // happy path: stay silent
      });
    },

    fadeOut(seconds) {
      stopped = true;
      if (!playing) return;
      rampTo(0, seconds, true);
    },

    update(dt) {
      if (fade) {
        fade.t += dt;
        const k = Math.min(1, fade.t / fade.dur);
        level = fade.from + (fade.to - fade.from) * k;
        if (k >= 1) {
          if (fade.stopAfter) stopSource();
          fade = null;
        }
      }
      creditAlpha = playing ? Math.min(1, level * 1.5) : 0;
    },

    render(ctx) {
      if (!playing || !credit || creditAlpha <= 0) return;
      // Shorten if it would overflow the screen (keeps the licence + source visible).
      let text = credit;
      const maxW = VIEW_W - 6;
      if (measureText(text) > maxW) text = text.replace(', Wikimedia Commons', ', Commons');
      const prev = ctx.globalAlpha;
      ctx.globalAlpha = prev * CREDIT_ALPHA * creditAlpha;
      drawText(ctx, text, 3, VIEW_H - 10, { color: CREDIT_COLOR, shadow: true });
      ctx.globalAlpha = prev;
    },
  };
}
