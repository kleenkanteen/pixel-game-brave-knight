---
title: "Stage 5: Stage shell, layout and flow"
label: wayfinder:task
status: open
assignee:
blocked_by: []
---

## Goal

Create Stage 5 as a registered Stage that composes the other slices and drives the phase flow from cave exit to victory.

## Scope

- `src/stage-5/layout.js`: all constants from the map's shared contract (section x ranges, `ZOOM`, `PLAZA_VIEW_X`, `TOP_Y`, `WORLD_W`, gate rects, `BALCONY`, `GUARDS` spawn list, `PLATFORMS`, `floorAt(x, y)`). Platform data is owned by ticket 004 but the export lives here.
- `src/stage-5/index.js`: `createStage5()` via `defineStage`, composing player, horse, allies, bow, sword, battle, abilities, rage, dialogue, prompts, objective.
- Register Stage 5 in `src/main.js` after Stage 4. Stage 4's exit hands the party, horse, weapons and Potion of Rage on through `carry`.
- Entry: the party walks out of the cave mouth at the left edge onto the approach, with an "exit to the cave" at the left edge of the full-width approach.

## Phase flow

`approach` → `guards` (gate closed, can't pass x < gate 1) → `gate1-open` (after `guards-down`, knight says *"Those were some weak guards for the world's most evil person."*, portcullis lifts) → `court` → `gate2` (knight passes, gate 2 shuts, `plaza-entered`) → `zoom` → `plaza` → `talk` → `fight` → `won`.

- Before `guards-down` the knight is stopped at gate 1.
- The horse can be ridden until the second gate; the player is told to dismount ("Press v to get off. The horse waits here.") and the horse stays outside.
- Falling or dying in the plaza restarts at the plaza (checkpoint in `carry`), not at the start of the Stage.
- `won`: a short victory banner.

## Acceptance

- Playable from Stage 4's exit through every phase, with placeholder art/enemies if the other tickets haven't merged.
- Phases advance only on the contract events. No phase logic lives in other slices.
- `npm run build` passes, and `npm run shoot` has a step that reaches each phase with no console errors.
