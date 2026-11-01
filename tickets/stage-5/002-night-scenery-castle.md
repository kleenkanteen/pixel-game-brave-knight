---
title: "Stage 5: Night scenery, approach to castle court"
label: wayfinder:task
status: open
assignee:
blocked_by: []
---

## Goal

Draw everything the player sees from the cave exit to gate 2, at night, entirely in code (no image assets).

## Scope

Files: `src/stage-5/scenery.js` and `src/stage-5/scenery/*` (reuse stage-1/2 sky and tree helpers where they fit).

- **Night sky:** dark gradient, drifting **clouds** (slow parallax), a **full moon**, and a cool moonlight tint over the whole scene. Exposes `renderSky`, `renderFar`, `renderWorld`, `renderMoonlight`. Torch and brazier light is drawn over the tint (`renderLights`).
- **Approach:** a full-map-width stretch from the cave exit (cliff at the left edge) to the moat.
- **Moat and drawbridge:** a long, detailed drawbridge: planks, chains, rails, supports, dark water below.
- **Gatehouse:** two towers with battlements, a walkway between them (the archers' perch), and a **portcullis** at gate 1. The portcullis has an open fraction `openAmount` (0 closed → 1 open) that the Stage animates.
- **Inner court:** a full map's width of castle background with varied shapes (walls, arches, windows, banners, stairs, torches). It ends at **gate 2**, drawn as an open arch with a portcullis that can be dropped (`openAmount` the same way).
- All of this must render correctly at both the 320×180 view and the 960×540 view (the court's right edge meets the plaza).

## Interfaces

- `prepareScenery()` pre-renders the static world layer once.
- Exposes `setGate1(amount)` and `setGate2(amount)`.
- Layout numbers come from `layout.js` (see the map's shared contract).

## Acceptance

- Screenshots from `npm run shoot` at the approach, mid-drawbridge, the gatehouse and the court. Night, moon and clouds are visible. The drawbridge and gatehouse read as "properly detailed".
- Gate 1 and gate 2 visibly open and close when `setGateN` is driven.
- No runtime asset fetches.
