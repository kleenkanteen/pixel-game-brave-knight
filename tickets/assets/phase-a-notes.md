# Phase A notes (foundation)

Built per `build-spec.md`. The whole happy path plays end-to-end with placeholder scenery:
Play → climb → intro Dialogue → Objective (5 s) → walk/jump → Space picks up the sword → click to Strike → walk right (camera scrolls) → Space by the farmer → "Farmer: In progress".

Old diorama moved to `/legacy` (its own package.json; not part of the build). Root `vite.config.js` limits dep-scan to the root `index.html` and stops the dev server watching `legacy/`.

## Conventions every slice follows

- `knight.x` = **left edge** of his body, `knight.y` = **feet** (`GROUND_Y` when standing). Width/height 16×24.
- Layout x values in `stage-1/layout.js` are **centres** (except ranges `*_X0/*_X1`).
- `isNear(knight, targetCentreX, targetW)` (`core/proximity.js`): horizontal gap between bodies ≤ `KNIGHT_W`.
- **World-space** renders (`sword`, `npc-farmer`, `player`, `prompt`) draw in world coords; `stage-1` wraps them in `ctx.translate(-camera.x, 0)`. **Screen-space** renders (`title`, `dialogue`, `objective`, `birdsong`) draw in 320×180 screen coords. `scenery` gets the camera and translates itself (so it can parallax).
- **Clicks**: `input.consumeClick()` lets an earlier slice swallow a click. Update order in `stage-1`: title → dialogue → intro → player → sword → farmer → objective → birdsong → prompts. So clicks on PLAY or in a Dialogue never become a Strike.
- Events (per-Stage bus, `world.events`): `title:play`, `intro:knight-out`, `dialogue:closed` `{id}`, `sword:picked`, `sword:strike`.

## Core (`src/core/`)

| File | Exports |
|---|---|
| `constants.js` | `VIEW_W 320, VIEW_H 180, GROUND_Y 150, KNIGHT_W 16, KNIGHT_H 24, WALK_SPEED 70, JUMP_VY −190, GRAVITY 600, STRIKE_TIME 0.25, STEP 1/60` |
| `loop.js` | `createLoop({update(dt), render()}) → {start(), stop()}` — fixed 60 Hz update, render per rAF |
| `input.js` | `createInput(canvas) → {mouse:{x,y}, isDown(action), wasPressed(action), wasClicked(), consumeClick(), endFrame()}`; actions `left right jump interact`; mouse in internal px; preventDefault on Space/arrows; `endFrame()` called by game after each update tick |
| `camera.js` | `createCamera({worldWidth}) → {x, y, follow(targetX), toScreenX(x), toWorldX(x)}` — centred, clamped, integer x |
| `events.js` | `createEvents() → {on(name, fn) → unsubscribe, off, emit(name, payload), clear()}` |
| `font.js` | `drawText(ctx, str, x, y, {color, align:'left'|'center'|'right', shadow, outline, scale}) → width`, `measureText(str, scale=1)`, `hasGlyph(ch)`, `GLYPH_H 7`, `LINE_H 10`. 5×7 proportional glyphs: A–Z a–z 0–9 space `:?.,!'-→>/()`; `y` = top of cell, descenders (g j p q y ,) hang 2 px below |
| `draw.js` | `rect, px, strokeRect, line(…, size), disc, withAlpha(ctx, a, fn)` — integer-snapped |
| `proximity.js` | `isNear(knight, targetX, targetW)` |
| `stage.js` | JSDoc typedefs `Stage`, `Game`, `World`; `defineStage(def) → Stage` (fills no-op defaults, keeps getters) |
| `game.js` | `createGame({canvas, ctx}) → {input, register(stage), goTo(id), current, start()}` |

`src/main.js`: canvas setup, integer CSS scaling on resize, registers Stage 1, `goTo('stage-1')`, start.

## Slices — public interfaces (final; Phase B fills internals only)

- **player** `createPlayer(world, {spawnX, maxX}) → {knight, startClimb(onDone), update(dt), render(ctx)}`
  `knight = {x, y, vx, vy, onGround, facing (1|−1), width, height, hasSword, controlsEnabled, strikeT, handX, handY, swordAngle, visible}`.
  `handX/handY` = world pixel of the front hand each tick; `swordAngle` = held-sword angle (rad, facing-relative, 0 = forward, negative = up). Sword slice sets `strikeT = STRIKE_TIME`; player counts it down and swings the arm. Climb 1.6 s, masked below `GROUND_Y`, last phase = pull-up with hands on the ground + dirt particles. COMPLETE.
- **title** `createTitle(world) → {active (getter), update, render}` — emits `title:play` on PLAY click. Working.
- **dialogue** `createDialogue(world) → {open(id, lines[]), isOpen(), update, render}` — types at 45 chars/s, speaker in gold, blinking `Next →`; click while typing = reveal all, click after = close + `dialogue:closed {id}`. Working (Phase B may polish look).
- **prompt** `createPrompts(world) → {show(text, worldX, topY), update, render}` — call `show()` every update tick it should be visible; `update()` runs LAST and commits that tick's requests; `render()` draws them centred ~6 px above `topY`, outlined, nudged to stay on screen. COMPLETE.
- **objective** `createObjective(world) → {show(title, goal, seconds), update, render}` — fade 0.3 s in/out. Working.
- **intro** `createIntro(world, {player, dialogue, objective, birdsong}) → {update, render}` (no-ops; event-driven). COMPLETE.
- **birdsong** `createBirdsong(world) → {start(), fadeOut(seconds), update(dt), render(ctx)}` — **STUB (no-op)**.
- **sword** `createSword(world, {x, prompts}) → {update, render, renderHeld}` — `render` = on ground, `renderHeld` = in hand (after `player.render`) + strike trail. Working.
- **npc-farmer** `createFarmer(world, {x, prompts, dialogue}) → {left (getter), update, render}` — working talk; **placeholder art**.
- **stage-1** `createStage1() → Stage {id:'stage-1', worldWidth:448, world (debug getter), enter, update, render, exit}`; `layout.js` constants; `scenery.js` `renderBack(ctx, camera, t)` / `renderFront(ctx, camera, t)`.

## Files

```
index.html  style.css  package.json  vite.config.js
src/main.js
src/core/{constants,loop,input,camera,events,font,draw,proximity,stage,game}.js
src/player/{index,art}.js
src/title/index.js  src/dialogue/index.js  src/prompt/index.js  src/objective/index.js
src/intro/index.js  src/birdsong/index.js  src/sword/index.js  src/npc-farmer/index.js
src/stage-1/{index,layout,scenery}.js
```

## Still placeholder (Phase B)

- `stage-1/scenery.js`: flat sky, flat ground, grey-box church, 3 grey tombstones, brown mound, wooden cross, flat wheat rect + tufts. Missing: hills parallax, fall trees, church details (stone, rose window), iron fence, drifting leaves, proper wheat.
- `npc-farmer` art: block figure + pitchfork (no proper shading/idle animation beyond a 1 px bob).
- `birdsong`: no audio, no credit line.
- `dialogue` / `objective` / `title`: functional, plain styling.
- Sword art is basic (lying sword + pixel-line held sword + faint trail).
