---
id: throwing-dagger
status: not-started
area: full-stack
priority: 50
depends_on: []
description: Add throwing daggers — consumable ranged weapon the player throws in a cardinal direction to damage the first monster in line
---

# Throwing Daggers

## Goal

Give the player a non-magical ranged option. Throwing daggers are stackable
consumables found on the dungeon floor: press `t`, choose a direction, and the
dagger flies in a cardinal line until it hits the first monster (dealing
damage) or a wall (landing on the floor, recoverable). This parallels the
existing Firebolt bolt mechanic but is a mundane, finite-supply weapon instead
of a spell.

## Design

### Item

- New item type: `throwing_dagger`.
- Stacks in the existing `inventory` object under a new field:
  `inventory.throwingDaggers: 0` (initial state).
- Spawning:
  - Added to the standard per-level item pass alongside food/equipment/scrolls.
  - 0–2 throwing daggers per level, starting from level 1.
  - Each spawned entity represents a single dagger (no multi-dagger stacks on
    the floor). Placed in a random non-spawn room on a free walkable tile,
    using the same placement rules as existing items.
- Pickup: walking onto the tile auto-adds one dagger to the stack and logs
  `"You pick up a throwing dagger (N total)."` where N is the new count.

### Throw action

Modeled closely on the spell-cast flow:

1. Player presses `t` (throw key).
2. If `inventory.throwingDaggers <= 0`, log `"You have no throwing daggers."`
   and return without consuming a turn.
3. Otherwise set `throwPending: true`. HUD shows
   `"Throw dagger — choose direction (←↑↓→)."`. No turn consumed yet.
4. Next keypress:
   - Direction key → dispatch `{ type: 'throwDir', dir }`.
   - Any other key (including `t` again) → dispatch `{ type: 'throwCancel' }`,
     clear `throwPending`, log `"Throw cancelled."`, do NOT consume a turn and
     do NOT run monster turns.
5. `throwPending` interlocks with `castPending` the same way any two modal
   states would: pressing `t` while `castPending` is active cancels the cast
   first (or is ignored — see below); pressing a cast key while throw-pending
   is active cancels the throw. Concretely: the input handlers already treat
   `castPending` as an early-return branch; add a symmetric branch for
   `throwPending` immediately after it, and let any non-direction key cancel.

### Resolution (`throwDir`)

- From the player's position, step one tile at a time in the chosen cardinal
  direction:
  - If the tile contains a monster → the dagger hits. Compute damage:
    `max(0, DAGGER_THROW_DAMAGE - target.defense + rollVariance())`
    using the existing `rollVariance()` helper so throws feel like melee
    rather than spells. `DAGGER_THROW_DAMAGE = 4` (tune during playtest).
    Apply damage. On kill, drop gold and increment `monstersKilled` using
    the exact same pattern as `playerAttack`. The dagger is **consumed**
    (destroyed on impact — no recovery).
  - If the tile is not walkable (wall) → the dagger strikes the wall. The
    dagger lands on the **last walkable tile the dagger passed through**
    and becomes a `throwing_dagger` item on that tile (recoverable by
    walking over it). Log `"Your throwing dagger clatters to the floor."`
  - If the line reaches the map edge without hitting anything → same as
    hitting a wall; drops on the last walkable tile.
- In all cases: decrement `inventory.throwingDaggers` by 1, clear
  `throwPending`, and run monster turns (a throw consumes a turn).
- If the player throws from a position where the immediate adjacent tile in
  the chosen direction is a wall, the dagger drops on the **player's own
  tile** (no travel occurred) — this avoids losing the dagger entirely in
  that edge case.

### Stats

- Add `daggersThrown` to `DEFAULT_STATS` and the initial stats objects in
  `createGame` and `newLevel`.
- Increment on every successful throw (hit or miss), including the "drops at
  feet" edge case.
- Surface `daggersThrown` in the game-over stats display in both frontends,
  alongside `spellsCast`.

### Audio

- On throw: play `playAttack()` (existing) — the attack swoosh reads well for
  a thrown weapon and avoids needing a new sound. This is a frontend concern
  only.

## Acceptance Criteria

### Shared game logic (`src/game.js`)

1. Add `DAGGER_THROW_DAMAGE = 4` constant.
2. Add `throwingDaggers: 0` to the initial `inventory` in `createGame` and
   preserve it across `newLevel` transitions (like `gold` and `food`).
3. Add `throwPending: false` to initial state; persist across levels like
   `castPending`.
4. New `spawnThrowingDaggers(map, monsters, items, level)` function —
   0–2 per level, level-gated `>= 1`, same placement rules as
   `spawnFood`/`spawnEquipment`. Called from `newLevel`.
5. Each spawned dagger is `{ x, y, type: 'throwing_dagger', char, color }`
   using the throwing-dagger glyph.
6. `checkPickup` handles `type: 'throwing_dagger'`: removes the item from
   `items`, increments `inventory.throwingDaggers`, logs the pickup message
   with the new count.
7. Add `'throw'` action to `dispatch`: if stack empty, log no-daggers message
   and return without consuming a turn; otherwise set `throwPending: true`
   and log the direction prompt. No turn consumed, no monster turns.
8. Add `'throwDir'` action to `dispatch`: resolves the throw per rules above,
   decrements the stack, sets `throwPending: false`, and runs monster turns.
9. Add `'throwCancel'` action to `dispatch`: clears `throwPending`, logs the
   cancel message, does NOT consume a turn.
10. On hit: damage calculation uses `target.defense` and `rollVariance()`,
    matching `playerAttack`. Gold drop and `monstersKilled` increment follow
    the same pattern.
11. On miss: the dagger lands on the last walkable tile traversed and is
    added back to `items` as a fresh `throwing_dagger` entity at that tile.
12. Add `daggersThrown` to `DEFAULT_STATS` and increment on every throw.
13. Export `DAGGER_THROW_DAMAGE` if the tests need to reference it.

### Glyphs (`src/glyphs.js`)

14. Add `throwing_dagger` to `GLYPHS_ENHANCED` — suggest 🔪
    (`\ud83d\udd2a`, wide). Must be visibly distinct from the melee
    `dagger` (🗡️) so players can tell the two items apart on the floor.
15. Add `throwing_dagger` to `GLYPHS_ASCII` — suggest `-` (not wide), to
    contrast with `|` (dagger).

### Browser frontend (`index.html`)

16. `t` key dispatches `{ type: 'throw' }`; while `throwPending`, direction
    keys dispatch `{ type: 'throwDir', dir }` and any other key dispatches
    `{ type: 'throwCancel' }`.
17. HUD shows `"Daggers: N"` (or similar compact label) alongside existing
    inventory counters, hidden or shown as `—` when N is 0 (match existing
    HUD conventions).
18. While `throwPending`, the message area shows the direction prompt
    (parallel to the cast prompt).
19. Thrown-dagger items on the map render with the throwing-dagger glyph and
    a distinct colour from the melee dagger.
20. On throw resolution, call `playAttack()` (existing audio helper).
21. Game-over overlay includes `daggersThrown` in the stats list.

### CLI frontend (`cli.js`)

22. `t` key dispatches `{ type: 'throw' }`; `throwPending` direction handling
    and cancel behavior mirror the web frontend and the existing
    `castPending` branch.
23. HUD line shows the dagger count.
24. `renderStats` includes `daggersThrown` (next to `spellsCast`).
25. Include throw controls in the help overlay.

### Tests (`src/game.test.js`)

26. Picking up a throwing dagger adds one to the stack and removes the item
    from `items`.
27. Throwing with a zero stack logs the empty message and does not consume a
    turn.
28. Throwing with a stack > 0 sets `throwPending` without running monster
    turns.
29. `throwDir` at a monster in the chosen direction deals damage using the
    melee-style defense/variance formula, decrements the stack, and runs
    monster turns.
30. `throwDir` into an open corridor with a wall at the end drops a
    `throwing_dagger` item on the last walkable tile.
31. `throwDir` where the adjacent tile is a wall drops the dagger on the
    player's tile.
32. Killing a monster with a thrown dagger drops gold and increments
    `monstersKilled`.
33. `throwCancel` clears `throwPending` and does not consume a turn.
34. `daggersThrown` increments on every successful throw (hit and miss).
35. `throwingDaggers` stack and `throwPending` flag persist across level
    transitions.

## Out of Scope

- Dagger mid-air interactions with other monsters (it always stops on the
  first target).
- Knockback, poison, or any status effect on hit.
- Diagonal throws (cardinal only, matching movement and spells).
- Throwing other weapons (swords, etc.) — only `throwing_dagger`.
- Thrown-dagger animations in the game loop; frontends may add visual flair
  independently of game logic.
- Enemies throwing anything back.
- Combining with spells (e.g., cast then throw same turn) — each is its own
  action.

## Design Notes

- Throws mirror `Firebolt`'s bolt resolution intentionally — reusing the
  straight-line traversal keeps the codebase consistent and the mental model
  tight. The key behavioral differences are: (a) throws respect defense and
  use melee variance, making them less reliable than a spell but less
  scarce; (b) misses are partially recoverable, giving throws a different
  risk/reward curve; (c) they cost from a counted stack, not scroll charges.
- Base damage of 4 sits between a bare fist (`player.attack = 5`) and a
  Firebolt (8). A dagger-equipped player hitting melee will usually out-DPS a
  thrown dagger; throws are for kiting rats/skeletons at range or softening
  a bear before melee. Tune if playtests show this is too strong against
  dragons.
- The "drop on miss" rule is the main reason to prefer throwing over
  Firebolt in early levels — scroll charges vanish on fizzle, throws you can
  mostly walk over and pick back up. This makes throws the entry-level
  ranged option while scrolls remain the burst option.
- Modeling throwing daggers separately from the melee `dagger` equipment
  avoids the "do I throw my only weapon?" ambiguity and keeps the equipment
  system untouched. Two distinct glyphs (🔪 vs 🗡️) signal this clearly.

## Agent Notes

- `src/game.js:703` — `handleCastDir` is the closest structural precedent
  for `handleThrowDir`. Copy the straight-line traversal scaffolding but
  swap the damage formula (use the melee pattern in `playerAttack` at
  `src/game.js:798`) and implement the miss-drops-on-floor branch.
- `src/game.js:531`, `handleCast`; `src/game.js:775`, `handleCastCancel` —
  mirror for `handleThrow` and `handleThrowCancel`.
- `src/game.js:377` — `checkPickup`. Add a `throwing_dagger` branch after
  food/gold, before equipment.
- `src/game.js:148` — `spawnFood`. Use as the template for
  `spawnThrowingDaggers`; wire it into `newLevel` at `src/game.js:96`.
- Both frontends have a `castPending` early-return branch in their input
  handlers (`cli.js:414`, `index.html:1026`). Add a sibling
  `throwPending` branch right next to it.
- `src/game.js:61` — `DEFAULT_STATS`. Add `daggersThrown: 0` in both this
  constant and the two literal stat objects in `createGame` and
  `newLevel`.
- When writing the recoverable-miss logic, track the last walkable tile
  visited during the traversal loop — append a new item object to `items`
  with that coordinate after the loop terminates.
