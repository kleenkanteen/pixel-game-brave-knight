---
title: "Stage 5: Zoom-out, second gate and plaza"
label: wayfinder:task
status: open
assignee:
blocked_by: []
---

## Goal

Pass gate 2, have it close behind the party, zoom the view out with triple resolution, and build the plaza arena with its 10 platforms and balcony.

## Scope

- **Resolution triple.** The canvas internal resolution goes from 320×180 to **960×540** (`ZOOM = 3`) in this Stage. Integer scaling to the window stays crisp. Sprites, the knight and the allies keep their pixel size, so more world is visible, not a blurry upscale. The HUD still draws at 320×180 and scales ×3. Make this a small reusable option on the Stage contract in `src/core/` (for example a `resolution` field) so existing Stages are unaffected.
- **Zoom animation** (~2.4 s eased pull-back) triggered by `plaza-entered`; emits `zoom-done`.
- **Gate 2 closing:** the portcullis drops (~0.7 s) after the party is through. It stays shut.
- **Plaza scenery** (`src/stage-5/scenery/plaza.js`): outdoor night plaza of the castle, a ritual circle on the floor, braziers with purple fire, castle keep walls on the right with a **balcony at the top right** and a door onto it (about x 2040, y −230), and tall wall behind (the plaza view is three screens tall).
- **10 platforms**: static, one-way (jump up through). Stairs of steps climbing in from each side, five each, overlapping, plus open floor around the ritual circle. `PLATFORMS` and `floorAt(x, y)` live in `layout.js` (001). The player, allies and horse-free movement use it.
- The bow shoots harder in the plaza so shots reach the upper platforms and the boss.

## Acceptance

- Walk through gate 2: the gate shuts, the view zooms to 960×540 with crisp pixels, and the knight and allies look the same size as before.
- All 10 platforms are reachable by jumping. Allies follow onto platforms.
- Resizing the window keeps integer scaling.
- Stages 1–4 still render exactly as before.
