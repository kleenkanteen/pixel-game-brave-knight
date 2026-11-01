---
title: "Stage 5: Dark Lord boss"
label: wayfinder:task
status: open
assignee:
blocked_by: []
---

## Goal

The Dark Lord: his entrance, conversation, transformation and fight, ending in victory.

## Scope

Files: new slice `src/dark-lord/` (`index.js`, `art.js`), hooked into `battle.setBoss()` like the Hydra.

- **Look:** a dark purple cloak and a **staff** that casts purple magic (a glowing tip), not the Grim Reaper. Name shown as **Dark Lord**.
- **Entrance** (on `zoom-done`, after a short beat): he steps out of the door onto the **balcony** at the top right and stands there. Emit `boss-appeared`.
- **Dialogue** (multi-panel, positioned below the balcony):
  1. Dark Lord: *"More sacrifices for my rituals? My favorite."*
  2. Knight: *"We're taking you to the retirement home, gramps. We can do this the easy way or the hard way."*
  3. Dark Lord: *"Silence, fool! You interrupted me right before my bubble bath. Now you will pay."*
- **Transformation:** he turns into a **flying, shadowy creature** (emit `boss-phase-2`). He stays **at the top of the map** for the rest of the fight.
- **HP:** **30 hit points**, with a health bar. **Lightning Strike deals 4 hits.** Arrows, sword Strike, Arrow Storm and Blessed Touch bonus damage all count. The Potion of Rage multiplies as usual. Arrows can be aimed at anyone, so the arrow collider must include him.
- **Pulse beam:** he readies a **direct pulse beam** at a hero. **2 seconds before it fires**, a small purple glowing highlight shows the direction. Then the beam fires, **passing through everything in its path** (heroes, platforms don't block it). Dodgeable by leaving the line. Repeats about every 8 s. Normal damage.
- **Death:** emit `boss-dead`; fires die down; the victory banner is shown by ticket 001.
- Minions are ticket 006's job. This ticket only emits `boss-phase-2`, which 006 listens for.

## Acceptance

- A `shoot` step runs: appear → talk → transform → fight → death, with screenshots of the beam telegraph and the beam.
- The telegraph is visible for 2 s and the beam never fires without it.
- 30 HP, Lightning deals 4, win condition works.
