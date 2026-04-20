---
id: rescue-the-princess
status: not-started
area: full-stack
priority: 50
depends_on: []
description: Replace the final staircase with a captive princess the player must reach to win the game
---

# Rescue the Princess

## Goal

Give the game a narrative win condition. On the final dungeon level (level 5),
the downward staircase is replaced with a captive princess. Reaching her and
interacting triggers the victory state, reframing the descent as a rescue
rather than an escape.

## Design

- Today, `placeStair` (in `src/game.js`) drops a `>` tile in the last room of
  every level. `handleInteract` then advances the player to the next level, or
  — on `level >= WIN_LEVEL` — sets `won: true`.
- New behavior on level 5 (`WIN_LEVEL`):
  - No staircase tile is placed.
  - A **princess** entity is placed instead, at the same location the
    staircase would have occupied (centre of the last room).
  - The princess is modeled as an item with `type: 'princess'` so she renders
    through the existing item pipeline. She does NOT auto-pickup (handled the
    same way `idol` is already skipped in `checkPickup`).
  - The princess tile is walkable — the player stands on it, then presses
    `interact` (`.` or `>`) to rescue her.
  - On rescue: set `won: true`, log a victory message such as
    `"You rescue the princess! The kingdom celebrates."`, and stop.
- Rescue replaces — it does not supplement — the staircase win path on level 5.
- Levels 1–4 are unchanged.

## Acceptance Criteria

### Shared game logic (`src/game.js`)

1. On level `WIN_LEVEL`, `newLevel` does NOT call `placeStair`. Instead, a new
   `placePrincess(map, items)` places a princess item at the centre of the last
   room (same `cx, cy` the stair would occupy) with
   `{ x, y, type: 'princess', char, color }`.
2. `placePrincess` is only invoked on level `WIN_LEVEL`.
3. `checkPickup` skips `type: 'princess'` (no auto-pickup), mirroring the
   existing `idol` skip.
4. `handleInteract` handles a princess tile when the player stands on one:
   set `won: true`, append a victory message, and return. This branch takes
   priority over the staircase branch.
5. The existing staircase win path (`level >= WIN_LEVEL && tile === '>'`) is
   removed — level 5 no longer has a staircase to stand on.
6. The princess is visible on the map (visibility rules identical to other
   items — revealed-but-not-visible should still show her glyph, consistent
   with how the staircase renders today).

### Glyphs (`src/glyphs.js`)

7. Add `princess` to `GLYPHS_ENHANCED` as 👸 (`\ud83d\udc78`, wide).
8. Add `princess` to `GLYPHS_ASCII` as `P` (not wide).

### Browser frontend (`index.html`)

9. The princess renders on the canvas using the `princess` glyph, distinct
   from every other entity.
10. The existing win overlay triggers on `won: true` and its heading/copy is
    updated to reflect a rescue (e.g. "Princess Rescued!" instead of
    "Dungeon Escaped!") — keep whatever stats are already shown.

### CLI frontend (`cli.js`)

11. The princess renders with the ASCII glyph `P` in a pink/magenta hue
    (suggested: `#ff88cc`).
12. The win screen copy is updated to mention the rescue.

### Tests (`src/game.test.js`)

13. On level 5, `newLevel` places a princess item and no staircase tile.
14. Levels 1–4 still place a staircase and no princess.
15. Interacting while standing on the princess sets `won: true` and adds the
    rescue message.
16. The princess does not auto-pickup when walked onto.

## Out of Scope

- Any narrative around how the princess got there, dialogue, or follow-up
  cutscenes.
- A princess sprite distinct from the emoji glyph (sprite sheet work is
  handled by other specs).
- Extending the rescue to multiple levels or multiple princesses.
- Gating rescue on any item, gold threshold, or quest condition.
- Victory audio changes (the existing `playVictory` stays as-is).

## Design Notes

- Modeling the princess as an item (rather than a tile or a monster) keeps her
  inside the existing spawn/render pipeline and avoids touching the map layer.
  The `idol` already demonstrates this "non-pickup, interact-to-trigger" shape.
- Reuse the exact coordinates `placeStair` would have produced, so maps remain
  legible and testable. Centre of the last room is the simplest mapping.
- The staircase code path for level 5 is removed rather than kept as a
  fallback — there is no reason to carry both endings.

## Agent Notes

- `src/game.js:140` — `placeStair`. Model `placePrincess` after it, but write
  into `items`, not `map.tiles`.
- `src/game.js:96` — `newLevel`. Guard the `placeStair` call behind
  `state.level < WIN_LEVEL`; add `placePrincess` on the `===` branch.
- `src/game.js:377` — `checkPickup`. Add a `princess` skip alongside the
  existing `idol` skip at line 381.
- `src/game.js:458` — `handleInteract`. Add a princess branch at the top of
  the function, before the staircase tile check. Remove the
  `level >= WIN_LEVEL` branch from the staircase path.
- Both frontends already render items through the shared glyph table, so the
  only frontend work is the win-overlay copy change.
- `WIN_LEVEL` is defined at `src/game.js:57`.
