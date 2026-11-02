#!/usr/bin/env node
// Scripted playthrough + screenshots. Zero dependencies beyond vite: drives the system Chrome
// over the DevTools Protocol using Node's built-in WebSocket (Node ≥ 22).
//
//   npm run shoot                       # runs tools/steps/happy-path.mjs
//   npm run shoot -- tools/steps/foo.mjs
//
// Starts its own vite dev server on a free port (never touches a running `npm run dev`),
// opens the game in headless Chrome at 960×540 (3× the 320×180 canvas), runs the steps,
// writes PNGs to tickets/assets/screens/, prints the page console, and exits non-zero if the
// page logged an error or threw.
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { createServer as netServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer as viteServer } from 'vite';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'tickets/assets/screens');
const VIEW = { width: 960, height: 540 };
const CHROME_PATHS = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function freePort() {
  return new Promise((ok, fail) => {
    const s = netServer();
    s.unref();
    s.on('error', fail);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => ok(port));
    });
  });
}

// --------------------------------------------------------------------------- CDP client

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { ok, fail } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? fail(new Error(`${msg.error.message} ${msg.error.data ?? ''}`)) : ok(msg.result);
    } else if (msg.method) {
      for (const fn of listeners) fn(msg.method, msg.params);
    }
  };
  return new Promise((ok, fail) => {
    ws.onerror = () => fail(new Error('CDP websocket error'));
    ws.onopen = () =>
      ok({
        send(method, params = {}) {
          const mid = ++id;
          ws.send(JSON.stringify({ id: mid, method, params }));
          return new Promise((res, rej) => pending.set(mid, { ok: res, fail: rej }));
        },
        on: (fn) => listeners.push(fn),
        close: () => ws.close(),
      });
  });
}

// --------------------------------------------------------------------------- keys

const KEYS = {
  Space: { key: ' ', keyCode: 32 },
  ArrowLeft: { key: 'ArrowLeft', keyCode: 37 },
  ArrowUp: { key: 'ArrowUp', keyCode: 38 },
  ArrowRight: { key: 'ArrowRight', keyCode: 39 },
  ArrowDown: { key: 'ArrowDown', keyCode: 40 },
  KeyA: { key: 'a', keyCode: 65 },
  KeyD: { key: 'd', keyCode: 68 },
  KeyW: { key: 'w', keyCode: 87 },
  KeyB: { key: 'b', keyCode: 66 },
  KeyQ: { key: 'q', keyCode: 81 },
  KeyV: { key: 'v', keyCode: 86 },
  Digit1: { key: '1', keyCode: 49 },
  Digit2: { key: '2', keyCode: 50 },
  Digit3: { key: '3', keyCode: 51 },
  Digit4: { key: '4', keyCode: 52 },
  Digit5: { key: '5', keyCode: 53 },
  Digit8: { key: '8', keyCode: 56 },
  Escape: { key: 'Escape', keyCode: 27 },
};

// --------------------------------------------------------------------------- main

async function main() {
  const stepsPath = resolve(process.argv[2] ?? join(ROOT, 'tools/steps/happy-path.mjs'));
  const { default: steps } = await import(pathToFileURL(stepsPath).href);
  const chrome = CHROME_PATHS.find((p) => existsSync(p));
  if (!chrome) throw new Error('Chrome not found; set CHROME_PATH');
  mkdirSync(OUT_DIR, { recursive: true });

  const port = await freePort();
  const vite = await viteServer({
    root: ROOT,
    logLevel: 'warn',
    server: { port, strictPort: true, host: '127.0.0.1', hmr: false },
  });
  await vite.listen();

  const profile = mkdtempSync(join(tmpdir(), 'shoot-chrome-'));
  const proc = spawn(
    chrome,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      `--window-size=${VIEW.width},${VIEW.height}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--autoplay-policy=no-user-gesture-required',
      '--mute-audio',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  const logs = [];
  let errors = 0;
  let cdp = null;
  try {
    // Chrome writes its debugging port to DevToolsActivePort once ready.
    let devPort = null;
    for (let i = 0; i < 100 && !devPort; i++) {
      await sleep(100);
      const f = join(profile, 'DevToolsActivePort');
      if (existsSync(f)) devPort = readFileSync(f, 'utf8').split('\n')[0].trim() || null;
    }
    if (!devPort) throw new Error('Chrome did not start');
    const targets = await (await fetch(`http://127.0.0.1:${devPort}/json/list`)).json();
    const page = targets.find((t) => t.type === 'page');
    cdp = await connect(page.webSocketDebuggerUrl);

    cdp.on((method, p) => {
      if (method === 'Runtime.consoleAPICalled') {
        const text = p.args.map((a) => a.value ?? a.description ?? a.type).join(' ');
        logs.push(`[console.${p.type}] ${text}`);
        if (p.type === 'error' || p.type === 'assert') errors++;
      } else if (method === 'Runtime.exceptionThrown') {
        const d = p.exceptionDetails;
        logs.push(`[exception] ${d.exception?.description ?? d.text}`);
        errors++;
      } else if (method === 'Log.entryAdded') {
        logs.push(`[log.${p.entry.level}] ${p.entry.text} ${p.entry.url ?? ''}`);
        if (p.entry.level === 'error') errors++;
      }
    });
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { ...VIEW, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/` });

    const evaluate = async (expression) => {
      const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(`eval failed: ${expression}: ${r.exceptionDetails.text}`);
      return r.result.value;
    };
    // Wait for the game to boot.
    for (let i = 0; i < 100; i++) {
      if (await evaluate('!!window.__game').catch(() => false)) break;
      await sleep(100);
    }

    /** Internal 320×180 pixel → page CSS pixel. */
    const toPage = async ([x, y]) => {
      const r = await evaluate(
        'JSON.stringify(document.getElementById("game").getBoundingClientRect())',
      ).then(JSON.parse);
      return { x: r.left + ((x + 0.5) / 320) * r.width, y: r.top + ((y + 0.5) / 180) * r.height };
    };
    const key = (type, code) =>
      cdp.send('Input.dispatchKeyEvent', {
        type,
        code,
        key: KEYS[code]?.key ?? code,
        windowsVirtualKeyCode: KEYS[code]?.keyCode ?? 0,
      });

    const ctx = { evaluate, cdp, sleep };
    let pointer = null; // last pressed / dragged page position
    for (const step of steps) {
      if (step.label) console.log(`· ${step.label}`);
      if (step.move) {
        const p = await toPage(step.move);
        await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p });
      }
      if (step.click) {
        const p = await toPage(step.click);
        await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p });
        await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount: 1 });
        await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', clickCount: 1 });
      }
      if (step.press) {
        pointer = await toPage(step.press);
        await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...pointer });
        await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...pointer, button: 'left', clickCount: 1 });
      }
      if (step.drag) {
        // move in a few steps with the button held
        const to = await toPage(step.drag);
        const from = pointer ?? to;
        for (let i = 1; i <= 6; i++) {
          const p = { x: from.x + ((to.x - from.x) * i) / 6, y: from.y + ((to.y - from.y) * i) / 6 };
          await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p, button: 'left', buttons: 1 });
          await sleep(20);
        }
        pointer = to;
      }
      if (step.release && pointer) {
        await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...pointer, button: 'left', clickCount: 1 });
      }
      if (step.key) {
        await key('keyDown', step.key);
        await sleep(40);
        await key('keyUp', step.key);
      }
      if (step.down) await key('keyDown', step.down);
      if (step.up) await key('keyUp', step.up);
      if (step.hold) {
        await key('keyDown', step.hold);
        if (step.until) {
          const t0 = Date.now();
          while (!(await evaluate(step.until)) && Date.now() - t0 < (step.timeout ?? 10000)) await sleep(16);
        } else await sleep(step.ms ?? 500);
        await key('keyUp', step.hold);
      } else if (step.until) {
        const t0 = Date.now();
        while (!(await evaluate(step.until))) {
          if (Date.now() - t0 > (step.timeout ?? 10000)) throw new Error(`timeout waiting for: ${step.until}`);
          await sleep(16);
        }
      }
      if (step.eval) logs.push(`[eval] ${step.eval} → ${JSON.stringify(await evaluate(step.eval))}`);
      if (step.run) await step.run(ctx);
      if (step.wait) await sleep(step.wait);
      if (step.shot) {
        const params = { format: 'png' };
        if (step.zoom) {
          // zoom: [x, y, w, h] in internal pixels → enlarged crop (scale × the on-page size)
          const [zx, zy, zw, zh] = step.zoom;
          const a = await toPage([zx - 0.5, zy - 0.5]);
          const b = await toPage([zx + zw - 0.5, zy + zh - 0.5]);
          params.clip = { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y, scale: step.scale ?? 2 };
        }
        const { data } = await cdp.send('Page.captureScreenshot', params);
        const file = join(OUT_DIR, `${step.shot}.png`);
        writeFileSync(file, Buffer.from(data, 'base64'));
        console.log(`  saved ${file.slice(ROOT.length + 1)}`);
      }
    }
  } finally {
    cdp?.close();
    proc.kill();
    await vite.close();
    await sleep(200);
    rmSync(profile, { recursive: true, force: true });
  }

  console.log(`\nPage console (${logs.length} entries, ${errors} errors):`);
  for (const l of logs) console.log('  ' + l);
  if (errors) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
