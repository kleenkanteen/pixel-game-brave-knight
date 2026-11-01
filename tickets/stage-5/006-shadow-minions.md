---
title: "Stage 5: Shadow minions"
label: wayfinder:task
status: open
assignee:
blocked_by: []
---

## Goal

Seven smaller flying shadow creatures that swarm the plaza during the boss fight.

## Scope

Files: the **shadow** kind in `src/battle/castle-monsters.js` and `art-castle.js` (a separate section from the guards in ticket 003), plus a small spawner the Stage calls.

- **Look:** similar to the Dark Lord's shadow form but smaller; flying, with a purple glow.
- **Count:** **7** minions in total.
- **Swoops:** every **15 seconds**, one random minion enters the arena from a **random side: top, left or right**, then flies around the map (inside the plaza bounds, over the platforms) for the rest of the fight. The first starts when the boss turns into the shadow creature (`boss-phase-2`).
- **Attack:** each active minion shoots a **purple pulse fireball** at a hero every **5–10 seconds** (random). Normal damage, like any fireball. The pulse is dodgeable and visible.
- **Health:** the same as a Pterodactyl (health bar); killed ones don't respawn. If all seven are killed before they've all entered, the remaining ones still come on the 15 s timer.
- Arrows can be aimed at them. Lightning Strike and Arrow Storm hit them like other monsters.
- Spawner API for the Stage: `startMinions(battle, bounds)` / `stopMinions()`. It stops on `boss-dead` and removes the survivors.

## Acceptance

- A `shoot` step triggers `boss-phase-2` and shows a minion entering from each side over the first 45 s.
- Pulse intervals stay within 5–10 s.
- No more than 7 minions ever exist.
