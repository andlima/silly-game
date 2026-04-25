---
id: final-boss-dragon
status: not-started
area: full-stack
priority: 50
depends_on: []
description: Repurpose the dragon as a single boss guarding the princess on level 5; introduce a troll to fill the dragon's old random-spawn slot at level 4+
---

# Final Boss Dragon (and Troll Replacement)

## Goal

Give the princess rescue a real climax. Today the dragon is just a tougher
random monster appearing from level 4 onward, and the level-5 last room is
guarded by nothing in particular. After this change:

- The dragon is removed from the random spawn pool entirely. It exists as a
  **single, beefier final boss** placed next to the princess on level 5.
- Rescuing the princess requires killing the boss first.
- A new **troll** enemy slots into the random pool at level 4+, taking the
  spawn rate the dragon used to have, so the level-4 difficulty curve is
  unchanged.

## Design

### Dragon as boss

- Remove `'dragon'` from `pickMonsterType` so it never appears as a random
  spawn.
- Boost the `dragon` entry in `MONSTER_TYPES` to boss-tier stats:
  `hp: 60, attack: 12, defense: 5, awareness: 8, minGold: 16, maxGold: 32`
  (was `30 / 8 / 4 / 6 / 8 / 16`). The high awareness ensures the dragon
  actively chases the player across the final room rather than sitting
  idly.
- A new helper `placeBoss(map, monsters)` runs from `newLevel` on
  `state.level === WIN_LEVEL` only. It places exactly one dragon adjacent to
  the princess (which is at the centre of the last room, `cx, cy`).
  - Try cardinal neighbours of `(cx, cy)` in fixed order N, E, S, W; place
    on the first one that is walkable and not already occupied by a
    monster.
  - Fall back to any walkable tile in the last room if no cardinal
    neighbour is available (defensive — the centre of a generated room
    should always have at least one walkable neighbour).
- The dragon is the only monster spawned in the last room on level 5.
  Update `spawnMonsters` so the last room is skipped on level 5; `placeBoss`
  is the sole source of monsters there.
  (Other rooms on level 5 still spawn random monsters — bears and trolls.)

### Troll enemy

- Add a `'troll'` entry to `MONSTER_TYPES`:
  `hp: 25, attack: 7, defense: 3, awareness: 5, minGold: 6, maxGold: 12`.
  Sized between bear and old-dragon so the level-4 curve is preserved.
- In `pickMonsterType`, the line that previously returned `'dragon'` at
  `level >= 4 && roll < 0.15` now returns `'troll'`. Same threshold, same
  probability — the dragon's slot becomes the troll's slot.
- Add glyphs:
  - `GLYPHS_ENHANCED.troll = { char: '🧌', wide: true }` (`🧌`)
  - `GLYPHS_ASCII.troll = { char: 't', wide: false }`
- Suggested color in `MONSTER_TYPES`: `'#669944'` (mossy green), distinct
  from bear's brown and dragon's magenta.

### Princess gating

- In `handleInteract`, the princess branch (currently sets `won: true`
  unconditionally) checks whether any dragon is still alive on the level
  before granting victory.
  - If a dragon is alive: append a message
    `"The dragon roars — you cannot rescue her yet!"` and return without
    setting `won`. Do **not** consume a turn (return early before any
    monster updates, matching how `merchant` and the existing princess
    branch already short-circuit).
  - If no dragon is alive: set `won: true` and append the victory message
    `"You slay the dragon and rescue the princess! The kingdom celebrates."`
    (replacing the current message).
- The check is `game.monsters.some(m => m.type === 'dragon')`. Since the
  dragon no longer spawns randomly, this is unambiguous: the dragon is the
  boss.

### Frontend

- No structural frontend work — the troll renders through the existing
  shared glyph table once the entries above are added, and the dragon is
  already a known type.
- The web win overlay already triggers on `won: true`; its copy can stay as
  is, since the in-game victory message already mentions slaying the
  dragon.

## Acceptance Criteria

### Shared game logic (`src/game.js`)

1. `MONSTER_TYPES.dragon` has `hp: 60, attack: 12, defense: 5, awareness: 8,
   minGold: 16, maxGold: 32`.
2. `MONSTER_TYPES.troll` exists with
   `name: 'Troll', char: 't', color: '#669944', hp: 25, attack: 7,
   defense: 3, awareness: 5, minGold: 6, maxGold: 12`.
3. `pickMonsterType` never returns `'dragon'`. The previous dragon line is
   replaced with the same threshold/probability for `'troll'`
   (`level >= 4 && roll < 0.15 → 'troll'`).
4. A new `placeBoss(map, monsters)` helper is invoked from `newLevel` only
   when `state.level === WIN_LEVEL`. It places exactly one monster of type
   `'dragon'` (using the standard monster shape produced by `spawnMonsters`)
   on a cardinal neighbour of the princess centre, falling back to any
   walkable tile in the last room.
5. On level 5, `spawnMonsters` skips the last room (`map.rooms[length-1]`)
   so only the boss occupies it. Other rooms still spawn normally.
6. `handleInteract`'s princess branch checks
   `game.monsters.some(m => m.type === 'dragon')`:
   - Dragon alive → append the "roars" message, return without setting
     `won` and without running monster turns.
   - Dragon dead → set `won: true`, append the new combined victory
     message.

### Glyphs (`src/glyphs.js`)

7. `GLYPHS_ENHANCED.troll` is `{ char: '🧌', wide: true }`.
8. `GLYPHS_ASCII.troll` is `{ char: 't', wide: false }`.
9. `dragon` glyphs are unchanged (🐉 / `d`).

### Tests (`src/game.test.js`)

10. On level 5, `newLevel` produces exactly one dragon monster, and that
    dragon is in the last room (preferably adjacent to the princess
    coordinates). No dragons on levels 1–4.
11. `pickMonsterType` (or whatever surface tests use today for spawn
    distribution) never produces `'dragon'`. With `level >= 4`, `'troll'`
    appears within the expected probability band; with `level < 4`, no
    trolls.
12. Standing on the princess and interacting while a dragon is alive does
    not set `won`, appends the "roars" message, and does not advance
    monster turns.
13. After the dragon is killed (e.g. remove it from `game.monsters` in a
    test), interacting on the princess sets `won: true` and appends the
    new victory message.
14. Existing princess-rescue tests are updated to either kill the dragon
    first or stub it out, so the win path still passes.

## Out of Scope

- Special boss abilities (breath weapon, multi-tile body, phases, ranged
  attacks, summons).
- A boss healthbar or any boss-specific UI affordance.
- Custom boss death animation, sfx, or screen effects.
- Boss loot beyond the gold drop the standard combat path already produces.
- A unique troll behavior (regen, throwing rocks, etc.) — for now it's a
  stat block in the existing AI shape.
- Renaming the existing `dragon` type or splitting it from a hypothetical
  generic dragon — there is exactly one dragon, and it's the boss.

## Design Notes

- Keeping the dragon as a single shared `MONSTER_TYPES` entry (rather than
  a separate `boss_dragon` type) is the smallest change consistent with
  "one dragon, and it's the boss." The check
  `game.monsters.some(m => m.type === 'dragon')` is correct precisely
  because the random pool no longer produces dragons.
- Placing the boss adjacent to the princess (not on her tile) preserves the
  existing princess placement and `checkPickup`/interact code untouched —
  the player still walks onto the princess tile and presses interact, the
  only new logic is the gate.
- Skipping the last room in `spawnMonsters` on level 5 prevents a random
  bear/troll from also spawning in the boss room and crowding the encounter.
- The troll fills the difficulty slot the dragon vacated, so level-4
  encounters feel the same to playtesters: same probability, comparable
  threat level (HP/atk/def all sit between bear and old-dragon).

## Agent Notes

- `src/game.js:13-18` — `MONSTER_TYPES`. Adjust dragon stats; add troll.
- `src/game.js:121-125` — `newLevel`'s level-5 branch. Add a
  `placeBoss(map, monsters)` call on the `WIN_LEVEL` branch (after
  `placePrincess`, since boss placement reads princess coordinates from
  the centre of the last room, or recomputes them the same way).
- `src/game.js:357-381` — `spawnMonsters`. On level 5, skip the last room
  index. Easiest shape: pass `level` (already available) and check
  `if (level === WIN_LEVEL && i === map.rooms.length - 1) continue;`.
- `src/game.js:383-388` — `pickMonsterType`. Swap `'dragon'` for `'troll'`
  on the level-4 line.
- `src/game.js:591-600` — `handleInteract`'s princess branch. Wrap the
  win in a "boss alive?" check and return the gated message early.
- `src/glyphs.js:5-29` and `:32-56` — add troll entries to both glyph
  tables.
- Tests live in `src/game.test.js`. The existing princess suite at
  `:1147-1205` is the closest reference for how to assert against
  `won`/messages on level 5; write new spawn-distribution and gating
  tests in the same file.
- After all changes, run `npm run stamp` if `src/version.js` is part of
  your workflow, then `npx jest`.
