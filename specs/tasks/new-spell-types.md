---
id: new-spell-types
status: not-started
area: full-stack
priority: 50
depends_on:
  - spell-firebolt
description: Add three new spell types — Lightning Bolt (AoE burst), Frost (freeze + light damage), and Whirlwind (knockback + light damage) — and randomize scroll spawns
---

# New Spell Types: Lightning Bolt, Frost, Whirlwind

## Goal

Expand the spell system from a single spell (Firebolt) to four distinct spells, each
with a unique mechanic that creates meaningful tactical choices. Scrolls now spawn
randomly from the full spell pool, and picking up a new scroll always replaces the
current spell.

## New Spells

### Lightning Bolt ⚡

- **Mechanic:** Area-of-effect burst — hits all enemies within 2–3 tiles of the
  player (Chebyshev distance, i.e., a square area). No direction choice needed.
- **Damage:** Light (4–5). Balanced by hitting multiple targets.
- **Charges:** 3.
- **Color:** `'#ffff00'` (yellow).
- **ASCII char:** `'*'`.
- **Emoji:** ⚡.
- **Description:** "Unleashes a burst of lightning that strikes all nearby enemies."
- **Casting flow:** When the player presses `f` with Lightning Bolt equipped, skip
  the `castPending` direction-selection step entirely — resolve immediately,
  hitting all monsters within range. If no enemies are in range, log a fizzle
  message ("Your Lightning Bolt crackles but finds no target.").

### Frost ❄️

- **Mechanic:** Straight-line projectile (same as Firebolt) — hits the first enemy
  in the chosen direction. On hit, deals light damage AND freezes the target for
  3 turns.
- **Damage:** Light (3–4). The value is in the freeze, not the damage.
- **Freeze effect:** A frozen monster skips its turn for 3 consecutive turns. Track
  this with a `frozenTurns` field on the monster object. Decrement each time
  `runMonsterTurns()` processes that monster. While frozen, the monster's glyph
  color shifts to light blue (`'#88ccff'`).
- **Charges:** 3.
- **Color:** `'#00ccff'` (cyan).
- **ASCII char:** `'*'`.
- **Emoji:** ❄️.
- **Description:** "Fires a freezing bolt that damages and immobilizes an enemy."
- **Casting flow:** Same as Firebolt — `castPending` → direction → resolve.

### Whirlwind 🌪️

- **Mechanic:** Pushes ALL enemies currently within the player's field-of-view
  (FOV) away from the player. Each affected enemy is pushed along the line from
  the player to that enemy, moving tile by tile until blocked by a wall or another
  monster. Deals light damage to each affected enemy.
- **Damage:** Light (2–3). The value is in repositioning, not damage.
- **Wall collision bonus:** If an enemy is pushed into a wall (can't move the full
  distance), deal 1–2 extra damage and log "The [monster] slams into the wall!"
- **Charges:** 3.
- **Color:** `'#aaddaa'` (pale green).
- **ASCII char:** `'*'`.
- **Emoji:** 🌪️.
- **Description:** "Summons a whirlwind that pushes all visible enemies away."
- **Casting flow:** Like Lightning Bolt, no direction needed — resolve immediately
  using the player's current FOV to determine affected enemies. If no enemies are
  in FOV, log a fizzle ("Your Whirlwind howls but finds nothing to push.").

## Scroll Pickup Change

Currently, picking up a scroll of a different spell type is refused. Change this:

- **New behavior:** Picking up any scroll ALWAYS replaces the current spell,
  regardless of type or remaining charges. Log: "You discard your [old spell]
  scroll and pick up a [new spell] scroll ([N] charges)."
- **Empty slot:** Same as before — auto-equip.
- **Same spell type with fewer/equal charges:** Same as before — swap to fresher.

## Scroll Spawn Randomization

Currently `spawnScrolls()` always creates a Firebolt scroll. Change it to pick a
random spell type from `Object.keys(SPELL_TYPES)`.

## Implementation Details

### SPELL_TYPES constant (`src/game.js`)

Add three new entries alongside `firebolt`. Each entry needs a `mechanic` field to
differentiate casting behavior:

```js
const SPELL_TYPES = {
  firebolt: {
    name: 'Firebolt', char: '~', color: '#ff6600',
    damage: 8, charges: 3, mechanic: 'bolt',
    description: 'Hurls a bolt of fire in a straight line.',
  },
  lightning: {
    name: 'Lightning Bolt', char: '*', color: '#ffff00',
    damage: 4, charges: 3, mechanic: 'burst', range: 3,
    description: 'Unleashes a burst of lightning that strikes all nearby enemies.',
  },
  frost: {
    name: 'Frost', char: '*', color: '#00ccff',
    damage: 3, charges: 3, mechanic: 'bolt', freezeDuration: 3,
    description: 'Fires a freezing bolt that damages and immobilizes an enemy.',
  },
  whirlwind: {
    name: 'Whirlwind', char: '*', color: '#aaddaa',
    damage: 2, charges: 3, mechanic: 'fov_push', wallDamage: 2,
    description: 'Summons a whirlwind that pushes all visible enemies away.',
  },
};
```

### Mechanic-based casting dispatch

The `'cast'` action handler should check `spellDef.mechanic`:

- **`'bolt'`** (Firebolt, Frost): Set `castPending: true` and wait for direction
  input, then resolve via `handleCastDir()`.
- **`'burst'`** (Lightning Bolt): Resolve immediately — find all monsters within
  `spellDef.range` Chebyshev distance, deal damage to each, consume a charge.
- **`'fov_push'`** (Whirlwind): Resolve immediately — find all monsters in
  the player's current FOV, push each one away from the player, deal damage,
  consume a charge.

### Frost: `frozenTurns` on monsters

- When Frost hits a monster, set `monster.frozenTurns = spellDef.freezeDuration`.
- In `runMonsterTurns()`, before a monster acts: if `frozenTurns > 0`, decrement
  it by 1 and skip that monster's turn. Log "The [monster] is frozen!" on the
  first frozen turn only (when `frozenTurns === freezeDuration`), or simply skip
  silently on subsequent turns.
- `frozenTurns` persists across level transitions only if monsters persist (they
  don't currently, so no special handling needed).
- Rendering: when `frozenTurns > 0`, override the monster's color to `'#88ccff'`
  in `getVisibleTiles()` or at render time.

### Whirlwind: push resolution

For each monster in FOV:
1. Compute direction vector from player to monster: `dx = sign(mx - px)`,
   `dy = sign(my - py)`.
2. Move monster tile-by-tile in that direction. Stop if the next tile is not
   walkable or occupied by another monster.
3. If the monster couldn't move at all (already against a wall), apply wall
   damage bonus.
4. Update monster position.

Process monsters from farthest to nearest (to avoid collisions where a closer
monster blocks a farther one that hasn't moved yet).

### handleCastDir changes for Frost

Extend the existing bolt resolution in `handleCastDir()` (line 519):
- After dealing damage, if `spellDef.freezeDuration` exists and the monster
  survived, set `frozenTurns` on the monster.

### Glyphs (`src/glyphs.js`)

Add entries for new spell types:

```js
// Enhanced
lightning: { char: '⚡', wide: true },
frost:     { char: '❄️', wide: true },
whirlwind: { char: '🌪️', wide: true },

// ASCII
lightning: { char: '*', wide: false },
frost:     { char: '*', wide: false },
whirlwind: { char: '*', wide: false },
```

Update `scroll` glyph logic: the scroll item on the map should render using the
glyph of its `spellType` rather than always showing 🔥.

### Browser frontend (`index.html`)

- HUD spell display should use the correct emoji for each spell type.
- For `burst` and `fov_push` mechanic spells, pressing `f` resolves immediately
  (no `castPending` prompt). Update input handler accordingly.

### CLI frontend (`cli.js`)

- Same casting flow changes as browser.
- HUD displays correct spell name and charges.

## Acceptance Criteria

### Shared game logic (`src/game.js`)

1. `SPELL_TYPES` has four entries: `firebolt`, `lightning`, `frost`, `whirlwind`
   with `mechanic` field on each.
2. `'cast'` action dispatches based on `mechanic`: bolt spells enter `castPending`,
   burst/fov_push spells resolve immediately.
3. Lightning Bolt hits all monsters within `range` tiles (Chebyshev distance) of
   the player, dealing `damage` to each. Kills award gold and increment stats.
4. Frost bolt hits the first monster in a line, deals damage, and sets
   `frozenTurns` on the surviving monster.
5. Frozen monsters (`frozenTurns > 0`) skip their turn in `runMonsterTurns()` and
   decrement `frozenTurns` by 1 each turn.
6. Whirlwind pushes all FOV-visible monsters away from the player, deals `damage`
   to each, and deals bonus `wallDamage` if a monster hits a wall.
7. Whirlwind processes monsters farthest-first to prevent blocking issues.
8. Scroll pickup always replaces the current spell (no more refusal for different
   spell types).
9. `spawnScrolls()` picks a random spell type from the pool.
10. Charges decrement and scroll clears at 0 for all spell types.

### Glyphs (`src/glyphs.js`)

11. New glyph entries for `lightning`, `frost`, `whirlwind` in both enhanced and
    ASCII sets.
12. Scroll map items render with the glyph matching their `spellType`.

### Browser frontend (`index.html`)

13. Burst/fov_push spells resolve on `f` press without direction prompt.
14. HUD shows correct emoji and name for each spell type.

### CLI frontend (`cli.js`)

15. Same casting flow changes as browser.
16. HUD shows correct spell name.

### Rendering

17. Frozen monsters display with light blue color override (`'#88ccff'`).

### Tests (`src/game.test.js`)

18. Lightning Bolt hits multiple enemies within range and misses those outside.
19. Frost bolt freezes a surviving monster for 3 turns (monster skips turns).
20. Frozen monster resumes acting after `frozenTurns` reaches 0.
21. Whirlwind pushes enemies away from player; wall collision deals bonus damage.
22. Whirlwind with no enemies in FOV logs a fizzle.
23. Picking up a scroll of a different type replaces the current spell.
24. Scroll spawning produces varied spell types (statistical test or seeded RNG).

## Out of Scope

- Damage variance within spells (flat damage for now, calibration deferred).
- Spell upgrades or spell leveling.
- Multiple spell slots or spell inventory.
- Monsters casting spells.
- Dedicated spell sound effects (reuse existing `playAttack()`).
- Spell animations in game logic (frontends may add visual flair independently).

## Design Notes

- **Lightning Bolt** is the "panic room clearer" — low per-target damage but hits
  everything nearby. Best when surrounded.
- **Frost** is the "tactical control" spell — freeze a dangerous enemy (dragon,
  bear) to buy time for melee or escape. Low damage is offset by 3 turns of
  safety.
- **Whirlwind** is the "escape button" — push everything away when cornered.
  Wall collision damage is a nice bonus in tight corridors.
- **Firebolt** remains the "sniper" — highest single-target damage at range.
- Each spell has 3 charges to keep things simple and balanced for now. Tuning
  damage numbers can happen in a follow-up task.
- The `mechanic` field on `SPELL_TYPES` keeps the casting dispatch clean and
  extensible for future spell types.

## Agent Notes

- `handleCastDir()` (line 519 of `src/game.js`) is the main bolt resolution
  function. Frost extends this with freeze logic. Lightning and Whirlwind need
  their own resolution functions (e.g., `handleBurstCast()`,
  `handleFovPushCast()`).
- `handleCast()` (line 510) currently just sets `castPending: true`. It needs
  branching: for bolt spells, keep current behavior; for burst/fov_push, resolve
  in-place and return the updated state (including `runMonsterTurns()`).
- `runMonsterTurns()` (line 644) is where frozen-turn skipping goes — add the
  check at the top of the per-monster loop.
- `checkPickup()` scroll branch (line 391) needs the replacement logic change.
- `spawnScrolls()` (line 199) needs random spell type selection.
- `getVisibleTiles()` or the render path in `index.html`/`cli.js` needs the
  frozen-color override for monsters.
- FOV computation: the game already uses shadowcasting for monster awareness.
  Reuse the same FOV function for Whirlwind targeting. Check how monsters
  determine visibility (search for `awareness` or `shadowcast`).
- Chebyshev distance for Lightning: `Math.max(Math.abs(dx), Math.abs(dy)) <= range`.
