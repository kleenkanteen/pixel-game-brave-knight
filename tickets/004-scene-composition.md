---
title: "How is the Stage 1 world laid out and painted?"
label: wayfinder:prototype
status: closed
assignee: claude
blocked_by: [003-character-art.md]
---

## Question

What does the Stage 1 world look like, drawn in code at 320×180, and how long is it?

Prototype to react to:
- First screen: graveyard at the far left with the knight's grave and the **cross in front of it**, sword beside it; **church centred**; fall trees with red, yellow and green leaves (drifting leaves?); the **wheat field cut off by the right edge**.
- Beyond: the rest of the wheat field (10 Knight Widths), then the farmer, then the world's end.
- Sky/time of day, ground line, parallax layers (or none), palette.
- Total world width in pixels and where each landmark sits.

Blocked by the character art ticket because the Knight Width fixes the wheat field length and the scale of everything around the knight.

## Resolution

Resolved on the happy path (user: "assume happy path for everything"), taking the recommended defaults. Answer: see the matching section of [build spec](assets/build-spec.md).
