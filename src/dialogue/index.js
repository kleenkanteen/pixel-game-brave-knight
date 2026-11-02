import { VIEW_W } from '../core/constants.js';
import { drawText, measureText, LINE_H } from '../core/font.js';
import { rect, px, withAlpha } from '../core/draw.js';

const CHARS_PER_SEC = 45;
const PANEL_Y = 26;
const PAD_X = 10;
const PAD_Y = 8;
const MIN_W = 120;
const NEXT = 'Next →';
const NEXT_GAP = 4; // extra px between the last line and "Next →"
const MAX_TEXT_W = VIEW_W - 40 - PAD_X * 2; // lines wider than this wrap onto the next line

const BG = '#120e1a';
const BORDER = '#8a7aa8';
const BORDER_DK = '#2b2340';
const GOLD = '#e8c547';
const TEXT = '#f4efe2';
const HEADING = '#e0533e';

/** Split "Speaker: text" → {speaker:'Speaker:', rest:' text'} (speaker null if none). */
function splitSpeaker(line) {
  const i = line.indexOf(': ');
  return i > 0 ? { speaker: line.slice(0, i + 1), rest: line.slice(i + 1) } : { speaker: null, rest: line };
}

/** Word-wrap one line to MAX_TEXT_W (the speaker prefix stays on the first row). */
function wrap(line) {
  if (measureText(line) <= MAX_TEXT_W) return [line];
  const out = [];
  let row = '';
  for (const word of line.split(' ')) {
    const next = row ? `${row} ${word}` : word;
    if (row && measureText(next) > MAX_TEXT_W) {
      out.push(row);
      row = word;
    } else row = next;
  }
  if (row) out.push(row);
  return out;
}

/**
 * Dialogue slice: translucent dark panel with a pixel border, centred in the upper-middle.
 * Lines are typed one character at a time (~45 chars/s); line 2 stacks under line 1 and is
 * typed after line 1 finishes. "Speaker:" (first line) in gold. Then a blinking "Next →".
 * A click or any key while open is CONSUMED (input.consumeClick / consumeKeys) so it never becomes
 * a Strike, jump or interact: still typing → reveal everything; fully shown → close and emit
 * 'dialogue:closed' {id}. Its first tick ignores (and swallows) input: the press that opened it.
 * Must be updated BEFORE slices that read clicks (sword).
 * open(id, lines, {align:'center', heading:true}) centres every line (a sign); heading colours
 * the first line red, as a title.
 * Long lines word-wrap. play(id, panels) shows several panels in a row (a conversation):
 * each click / key past a finished panel opens the next; 'dialogue:closed' {id} fires after the last.
 *
 * @param {import('../core/stage.js').World} world
 * @returns {{
 *   open(id:string, lines:string[], opts?:{align?:'left'|'center', heading?:boolean, y?:number}):void,
 *     // e.g. open('intro', ['Brave Knight: Huh? Where am I?', '...']); y: the panel's top (default 26)
 *   play(id:string, panels:string[][], opts?:{y?:number}):void,  // conversation: one panel after another
 *   isOpen():boolean,
 *   update(dt:number):void,
 *   render(ctx:CanvasRenderingContext2D):void,  // SCREEN coordinates
 * }}
 */
export function createDialogue(world) {
  let current = null; // {id, lines, shown, total, t, doneT}
  let queue = []; // panels still to show in the current conversation
  let playOpts = {}; // the conversation's options (its panel position)

  function show(id, rawLines, opts = {}) {
    const lines = rawLines.flatMap(wrap);
    const total = lines.reduce((n, l) => n + [...l].length, 0);
    const center = opts.align === 'center';
    current = { id, lines, shown: 0, total, t: 0, doneT: -1, center, heading: !!opts.heading, y: opts.y ?? PANEL_Y, fresh: true };
  }

  function open(id, lines, opts) {
    queue = [];
    playOpts = {};
    show(id, lines, opts);
  }

  function play(id, panels, opts = {}) {
    queue = panels.slice(1);
    playOpts = opts;
    show(id, panels[0], opts);
  }

  function update(dt) {
    if (!current) return;
    current.t += dt;
    current.shown = Math.min(current.total, current.shown + CHARS_PER_SEC * dt);
    if (current.shown >= current.total) current.doneT = current.doneT < 0 ? 0 : current.doneT + dt;
    const { input } = world;
    if (current.fresh) {
      // the press that opened it (Space at a sign) doesn't also move it on, nor act elsewhere
      current.fresh = false;
      input.consumeClick();
      input.consumeKeys();
      return;
    }
    if (input.wasClicked() || input.wasAnyKey()) {
      input.consumeClick();
      input.consumeKeys(); // the key only moves the dialogue on: no jump, Strike or interact from it
      if (current.shown < current.total) {
        current.shown = current.total;
      } else if (queue.length) {
        show(current.id, queue.shift(), playOpts);
      } else {
        const { id } = current;
        current = null;
        world.events.emit('dialogue:closed', { id });
      }
    }
  }

  function drawPanel(ctx, x, y, w, h) {
    // translucent body
    withAlpha(ctx, 0.78, () => rect(ctx, x + 2, y + 2, w - 4, h - 4, BG));
    // outer dark frame (clipped corners)
    rect(ctx, x + 2, y, w - 4, 1, BORDER_DK);
    rect(ctx, x + 2, y + h - 1, w - 4, 1, BORDER_DK);
    rect(ctx, x, y + 2, 1, h - 4, BORDER_DK);
    rect(ctx, x + w - 1, y + 2, 1, h - 4, BORDER_DK);
    px(ctx, x + 1, y + 1, BORDER_DK);
    px(ctx, x + w - 2, y + 1, BORDER_DK);
    px(ctx, x + 1, y + h - 2, BORDER_DK);
    px(ctx, x + w - 2, y + h - 2, BORDER_DK);
    // light inner border
    rect(ctx, x + 2, y + 1, w - 4, 1, BORDER);
    rect(ctx, x + 2, y + h - 2, w - 4, 1, BORDER);
    rect(ctx, x + 1, y + 2, 1, h - 4, BORDER);
    rect(ctx, x + w - 2, y + 2, 1, h - 4, BORDER);
    // gold corner studs
    for (const [cx, cy] of [
      [x + 1, y + 1],
      [x + w - 2, y + 1],
      [x + 1, y + h - 2],
      [x + w - 2, y + h - 2],
    ])
      px(ctx, cx, cy, GOLD);
  }

  function render(ctx) {
    if (!current) return;
    const { lines } = current;
    const textW = Math.max(...lines.map((l) => measureText(l)), measureText(NEXT));
    const width = Math.max(MIN_W, textW + PAD_X * 2);
    const height = PAD_Y * 2 + lines.length * LINE_H + NEXT_GAP + LINE_H - 2;
    const x = Math.round((VIEW_W - width) / 2);
    const y = current.y;
    drawPanel(ctx, x, y, width, height);

    let budget = Math.floor(current.shown);
    lines.forEach((line, i) => {
      if (budget <= 0) return;
      const chars = [...line];
      const visible = chars.slice(0, budget).join('');
      budget -= chars.length;
      const ly = y + PAD_Y + i * LINE_H;
      if (current.center) {
        // centred rows: each row is centred on its FULL width so it doesn't shift while typing
        const lx = Math.round(x + width / 2 - measureText(line) / 2);
        const color = current.heading && i === 0 ? HEADING : TEXT;
        drawText(ctx, visible, lx, ly, { color, shadow: true });
        return;
      }
      let lx = x + PAD_X;
      const { speaker } = i === 0 ? splitSpeaker(line) : { speaker: null };
      if (speaker) {
        const sp = visible.slice(0, speaker.length);
        lx += drawText(ctx, sp, lx, ly, { color: GOLD, shadow: true });
        if (visible.length > speaker.length) drawText(ctx, visible.slice(speaker.length), lx + 1, ly, { color: TEXT, shadow: true });
      } else {
        drawText(ctx, visible, lx, ly, { color: TEXT, shadow: true });
      }
    });

    // blinking "Next →" bottom-right once everything is typed (visible immediately, then blinks)
    if (current.doneT >= 0 && Math.floor(current.doneT * 2.2) % 2 === 0) {
      const nudge = Math.floor(current.doneT * 4) % 2; // arrow nudges right
      const ny = y + PAD_Y + lines.length * LINE_H + NEXT_GAP;
      const nx = x + width - PAD_X - measureText(NEXT);
      drawText(ctx, 'Next', nx, ny, { color: GOLD, shadow: true });
      drawText(ctx, '→', nx + measureText('Next ') + nudge, ny, { color: GOLD, shadow: true });
    }
  }

  return { open, play, isOpen: () => current !== null, update, render };
}
