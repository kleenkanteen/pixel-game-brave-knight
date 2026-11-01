---
title: "Which free API supplies the birdsong?"
label: wayfinder:research
status: closed
assignee: claude-research
blocked_by: []
---

## Question

Which free API can a browser-only Vite game call at runtime to fetch and play **pleasant birdsong** (ambient chirping, not harsh calls) after the player clicks Play?

Must establish, from primary sources:
- No-cost access; whether an API key/account is needed, and if so whether a key can safely ship in client-side JS.
- **CORS**: can the JSON *and* the audio file be fetched/played directly from the browser (an `<audio>`/Web Audio source on another origin)?
- Audio format(s) and typical clip length; how to pick a calm, birdsong-only clip (query/filters/quality ratings).
- Licence/attribution terms for playing the audio in a game.
- Rate limits and reliability.

Candidates to check at minimum: xeno-canto, Freesound, Wikimedia Commons, Internet Archive. Recommend one, with a runner-up.

## Context pointer
Findings: [birdsong-api research](assets/research/birdsong-api.md)

## Resolution

**Wikimedia Commons** (no key, CORS `origin=*`, audio CORS-open). Resolve pinned calm titles at runtime via `titles=` (Bourne Woods birdsong clips); show a small CC BY-SA credit line. Runner-up: Internet Archive. xeno-canto/Freesound ruled out (key required). Detail: [birdsong-api research](assets/research/birdsong-api.md).
