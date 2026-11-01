---
title: "Stage 5: Gate guards (archers, reptilians, werewolves)"
label: wayfinder:task
status: open
assignee:
blocked_by: []
---

## Goal

The eight guards that hold the drawbridge and gatehouse, and the `guards-down` event.

## Scope

Files: new kinds in `src/battle/` (`castle-monsters.js` and `art-castle.js` for **skeleton** and **reptile**; reuse the existing **Werewolf**). All art is drawn in code.

- **Skeleton Archer ×3**, standing on top of the gatehouse (spec has `air` px above the ground): when a hero comes within range, it draws and shoots arrows down at them every few seconds, a lobbed shot at where the hero stood (can be dodged). **1 hit** kills it; it topples off the battlements into a bone heap.
- **Reptilian ×3**: alien, reptilian four-legged creatures. They skitter toward the party, coil (frill flares), lunge with their jaws, and back off to come again. Health bar. Give them a distinct palette and a melee-damage constant.
- **Werewolf ×2** on the drawbridge (the ones from Stage 3).
- Spawn list for the Stage: 3 archers on the gatehouse (two on towers, one on the walkway) and 3 reptiles + 2 werewolves along the drawbridge.
- **Arrows can be aimed at anyone**, including archers above. Their colliders must work with the bow and with Arrow Storm and Lightning Strike.
- Emit **`guards-down`** once all eight are dead.

## Interfaces

- Monsters are created by the existing `battle` slice from spec objects (`{ kind, x, air? }`). Follow how Stage 4's cave monsters are registered.
- Do not edit the Shadow code; that's ticket 006.

## Acceptance

- A standalone test Stage or `shoot` step spawns all eight guards; each attacks, takes damage and dies.
- `guards-down` fires exactly once.
- No console errors.
