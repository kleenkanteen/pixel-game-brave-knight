# Stage 1 build spec (happy path)

Source of truth for the build. Everything in the map's **Notes** still applies; this file resolves the open tickets with the recommended defaults. Vocabulary: `/GLOSSARY.md`. Happy path only: no error handling beyond "don't crash".

## Constants (single source: `src/core/constants.js`)

| Name | Value |
|---|---|
| `VIEW_W`, `VIEW_H` | 320, 180 (internal resolution) |
| `GROUND_Y` | 150 (top of the walkable ground; feet stand here) |
| `KNIGHT_W` (Knight Width) | 16 px (body width; drawn figure ≈ 16×24) |
| `KNIGHT_H` | 24 |
| Walk speed | 70 px/s, instant start/stop |
| Jump | initial vy −190 px/s, gravity 600 px/s² (≈30 px apex), small air control (same walk speed) |

## Stage 1 layout (world x, px)

| Landmark | x |
|---|---|
| World start / left wall | 0 |
| Graveyard (several tombstones, iron fence bits) | 4 – 100 |
| Knight's grave (dirt mound) | centre 48 |
| Cross in front of the grave | x 60 (between grave and church side) |
| Sword lying on the ground | x 76 |
| Church (stone, steeple + cross, door, rose window), centred on first screen | centre 160, ~76 px wide |
| Fall trees: trunk forking into reaching branches, small leaf sprites (7 shapes) clustered on branch tips. 2 trees all-green (4 greens: x 96, 182), the rest yellow / red / dark red; drifting leaf particles | scattered 0–240 and behind the church |
| Wheat field: 10 Knight Widths = 160 px, starts at 236 so it's **cut off by the right edge (320)** | 236 – 396 |
| Farmer (stands just after wheat) | centre 416 |
| World end | `WORLD_W` = 448 |

Knight spawns from the grave at x≈48. Knight x is clamped to `[4, farmerLeft − KNIGHT_W]` — he cannot walk past/through the farmer. Church and trees are background (walk in front of them).

Camera: centred on the knight, clamped to `[0, WORLD_W − VIEW_W]`. Optional 0.5× parallax hills layer.

## Rendering

- `<canvas width=320 height=180>`; CSS scales it by the largest integer factor that fits the window, centred on a dark background, `image-rendering: pixelated`; `imageSmoothingEnabled = false`. Recompute on resize.
- **Everything is drawn in code**: integer-coordinate `fillRect`s / small pixel helpers. No images, no web fonts.
- Text uses a **pixel bitmap font defined in code** (5×7 glyphs, uppercase+lowercase, digits, `:?.,!→'`), drawn via `core/font.js` (`drawText(ctx, str, x, y, {color, align, shadow})`, `measureText(str)`).

## Flow (owned by `stage-1`, sequenced via events)

1. **Title**: scene rendered (knight not yet visible), dim overlay, pixel **PLAY** button centred. Hover highlight. Click → `title:play`.
2. On `title:play`: title hides; `birdsong.start()`; knight **climb** animation (~1.6 s: rises out of the grave mound, masked below ground line, final pull-up frame).
3. When climb finishes → `intro:knight-out`: **player control enabled** and Dialogue begins.
4. **Dialogue** (centred, upper-middle of screen, translucent dark panel): types at ~45 chars/s:
   - `Brave Knight: Huh? Where am I?`
   - (next line under it) `I thought I died in the war.`
   - then `Next →` (blinking) below. Click anywhere → dialogue closes → `dialogue:closed`.
5. On intro dialogue close: birdsong fades out over 2 s; **Objective** card: `Objective` with `Explore` beneath, centred, fade in 0.3 s / hold / fade out, total 5 s.
6. Free play. Clicks during an open Dialogue only advance/close it — never Strike.

## Prompts (`prompt` slice)

- Pixel-font text with a 1px dark outline/shadow, centred horizontally over a world x, drawn ~6 px above the target's head, follows the camera.
- Shown only while horizontal gap between knight body and the thing ≤ `KNIGHT_W` (`core/proximity.js: isNear(knight, targetX, targetW)`).
- Sword (not yet held): `Press space to pick up` above the **knight**.
- Farmer: `Press space to talk` above the **farmer** (hidden while his Dialogue is open).

## Sword

- On ground at x 76 (lying flat, ~14 px). Space when near → held (drawn in knight's hand, facing direction). Then `Click to strike sword` above the knight for 5 s.
- Click (sword held, no Dialogue open) → Strike: ~0.25 s swing arc animation. Nothing to hit.

## Farmer

- Drawn in code: straw hat, shirt, overalls, pitchfork; gentle idle bob.
- Space when near → Dialogue `Farmer: In progress` typed the same way, then `Next →`; click anywhere closes. Can be repeated. Nothing else happens. No end card.

## Birdsong

- `birdsong` slice fetches a calm birdsong clip from the **Wikimedia Commons API** (read `tickets/assets/research/birdsong-api.md` — use the pinned Bourne Woods titles resolved at runtime via `titles=` with `origin=*`, pick one at random), plays via `<audio>`/Web Audio at modest volume, looped while active; `fadeOut(seconds)`. Must be started from the Play click (autoplay policy). Happy path: if the fetch fails, stay silent. Show a tiny credit line (pixel font, bottom-left, dim) while birdsong plays: `Birdsong: <Artist>, <LicenseShortName>, Wikimedia Commons` (strip HTML from Artist).

## Architecture (vertical slices)

```
index.html  style.css  package.json  vite.config.js (if needed)
src/
  main.js                 boot: canvas, scaling, create game, register stages, start
  core/                   thin shared kernel — no game content
    constants.js loop.js input.js camera.js events.js font.js draw.js proximity.js stage.js game.js
  stage-1/                Stage 1: layout, scenery painting, flow wiring, composition
  title/  intro/  dialogue/  prompt/  objective/  player/  sword/  npc-farmer/  birdsong/
```

- **Slice shape**: each slice exports a factory `createX(world, opts?)` returning `{ update(dt), render(ctx) }` (+ slice-specific methods). It owns its state, logic and drawing. Slices never import another slice's internals — only its `index.js` public factory, and ideally not even that: `stage-1` composes them.
- **`world`** (built by the stage): `{ input, events, camera, knight, time, worldWidth }`. `knight` is the player slice's public state object (`x, y, facing, width, height, hasSword, controlsEnabled`).
- **Events** (`core/events.js`: `on/off/emit`): `title:play`, `intro:knight-out`, `dialogue:closed` (payload `{id}`), `sword:picked`, `sword:strike`.
- **Input** (`core/input.js`): `isDown(action)`, `wasPressed(action)` per frame, actions `left/right/jump/interact` (A/D/←/→, W/↑, Space), `wasClicked()` + mouse position in internal pixels. Prevent default on Space/arrows.
- **Stage contract** (`core/stage.js`): a Stage is `{ id, worldWidth, enter(game), update(dt), render(ctx), exit() }`. `core/game.js` holds a stage registry + `goTo(id)`; Stages 2–6 register later the same way. Only `stage-1` exists now.
- **Loop**: fixed 60 Hz update, render each rAF.
- Render order (stage-1): sky/far → scenery back (hills, trees, church) → graveyard/grave/cross → wheat back → sword(ground) → farmer → knight(+held sword) → wheat front tufts → leaves → prompts → dialogue → objective → title overlay.
