---
title: "What do the knight, farmer and sword look like, drawn in code?"
label: wayfinder:prototype
status: closed
assignee: claude
blocked_by: []
---

## Question

At 320×180, what do the **Brave Knight**, the **farmer**, and the **sword** look like when drawn purely with the Canvas API — and how do the knight's animations read?

Prototype to react to:
- Knight size in pixels (this fixes the **Knight Width**, which sizes the wheat field and every Prompt distance).
- Knight frames: climbing out of the grave, idle, walk, jump, with/without sword, Strike swing.
- Farmer: recognisably a farmer (hat? pitchfork?), idle.
- Sword: lying on the ground beside the grave, and held.
- Palette.

Resolution records the chosen pixel dimensions and links the prototype.

## Resolution

Resolved on the happy path (user: "assume happy path for everything"), taking the recommended defaults. Answer: see the matching section of [build spec](assets/build-spec.md).
