# tools

## `npm run shoot` — scripted playthrough + screenshots

```
npm run shoot                          # tools/steps/happy-path.mjs (one PNG per Stage 1 beat)
npm run shoot -- tools/steps/zoom.mjs  # close-ups for art review
npm run shoot -- tools/steps/stage-2.mjs  # Stage 1 exit → Stage 2: bow, targets, sign, rotted woods
npm run shoot -- tools/steps/stage-3.mjs  # Stage 2 exit → Stage 3: the battle, sword + bow, victory
npm run shoot -- tools/steps/stage-3-abilities.mjs  # after the battle: allies follow, abilities 1–3
npm run shoot -- tools/steps/stage-4.mjs  # the Lord's Lair: sign, cave monsters, Hydra, ladder, potion
npm run shoot -- tools/steps/stage-4-hydra.mjs  # straight to the Hydra: charge-up, blast, ledge view
npm run shoot -- tools/steps/stage-4-hydra-bite.mjs  # up close: sword "Too tough!", the head's bite + knockback
npm run shoot -- tools/steps/stage-4-hydra-death.mjs  # platforms, lightning in its mouth, the explosion, gore, floating potion
npm run shoot -- tools/steps/skip.mjs  # easter egg: 8 rides on to the next Stage, mounted
```

- Starts its own vite dev server on a free port (a running `npm run dev` is untouched), drives the
  system Chrome headless over the DevTools Protocol (no extra deps; Node ≥ 22 for the built-in
  `WebSocket`), viewport 960×540 = 3× the 320×180 canvas.
- PNGs go to `tickets/assets/screens/<shot>.png`.
- Prints the page console afterwards; exits 1 if the page logged an error or threw.
- Chrome path: `/Applications/Google Chrome.app/...` by default; override with `CHROME_PATH=...`.

### Steps

A steps file default-exports an array; each step may combine (applied in this order):

| field | meaning |
|---|---|
| `label` | printed to the terminal |
| `move: [x, y]` / `click: [x, y]` | mouse, in **internal 320×180 game pixels** |
| `press: [x, y]` / `drag: [x, y]` / `release: true` | hold the left button, drag with it held, let go (the bow's aim) |
| `key: 'Space'` | tap a key (`Space`, `ArrowLeft/Right/Up`, `KeyA/D/W/B/Q/V`, `Digit1/2/3/4/8`, `Escape`) |
| `down` / `up` | press / release without waiting |
| `hold: 'ArrowRight', ms` | hold for `ms`, or with `until` until the expression is truthy |
| `until: 'js expr'` | (alone) wait until truthy, `timeout` ms (default 10000) |
| `eval: 'js expr'` | print the result with the console log |
| `run: async ({ evaluate, cdp, sleep }) => {}` | escape hatch |
| `wait: ms` | sleep |
| `shot: 'name'` | screenshot; add `zoom: [x, y, w, h]` (internal px) + `scale` for a close-up |

Dev builds expose `window.__game` (e.g. `__game.current.world.knight.x`) for `until` / `eval`.
