---
title: "Where are the seams between slices, core, and Stages?"
label: wayfinder:grilling
status: closed
assignee: claude
blocked_by: []
---

## Question

Given the vertical-slice folders (`title`, `intro`, `dialogue`, `player`, `sword`, `npc-farmer`, `objective`, `stage-1`) and a thin `core`:

- What exactly belongs in `core` (loop, input, camera, scaling, asset/audio loading, pixel-drawing helpers?) and what must stay inside a slice?
- How do slices talk to each other without importing each other's internals — e.g. `sword` needs the knight's position; `dialogue` is used by `intro` and `npc-farmer`; Prompts are shown by both `sword` and `npc-farmer`. Events, a shared world state, or direct calls?
- Is the Stage 1 flow (Play → climb → Dialogue → Objective → free play) owned by `stage-1`, by `intro`, or by a sequence in `core`?
- What does a **Stage** expose so Stages 2–6 can plug in (enter/exit, world width, entities, transitions)?
- Where do the shared Prompt and proximity (≤ 1 Knight Width) rules live?

Consult `codebase-design` alongside `grilling` + `domain-modeling`.

## Resolution

Resolved on the happy path (user: "assume happy path for everything"), taking the recommended defaults. Answer: see the matching section of [build spec](assets/build-spec.md).
