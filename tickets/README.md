# tickets/ — local wayfinder tracker

No external issue tracker; this folder is the tracker.

- `000-map.md` — the map (label `wayfinder:map`). Start here.
- `NNN-<slug>.md` — child tickets of the map. Frontmatter carries the tracker fields:
  - `title` — the ticket's name (always refer to tickets by this)
  - `label` — `wayfinder:research | prototype | grilling | task`
  - `status` — `open` | `closed`
  - `assignee` — empty = unclaimed; set it **before** starting work (that's the claim)
  - `blocked_by` — list of ticket files; unblocked when all are `closed`
- Resolution is appended as a `## Resolution` section, then `status: closed`, then a line is added to the map's Decisions so far.
- Assets created while resolving (research notes, prototypes) live under `tickets/assets/` and are linked, not pasted.

**Frontier** = `status: open`, empty `assignee`, every `blocked_by` closed.
