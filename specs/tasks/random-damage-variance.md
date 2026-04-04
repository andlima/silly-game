---
id: random-damage-variance
status: not-started
area: gameplay
priority: 60
depends_on: []
description: Add ±1 random variance to all damage rolls for both player and monster attacks
---

# Random Damage Variance

## Goal

Combat is currently deterministic — the same attacker vs the same defender
always deals identical damage. Adding a small random variance (±1) makes
fights feel less predictable and more engaging without disrupting game balance.

## Changes

All changes are in `src/game.js` unless noted otherwise.

### 1. Add a `rollVariance` helper

Add a small utility function that returns -1, 0, or +1 with equal probability:

```js
function rollVariance() {
  return Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
}
```

Place it near the existing `getEquipmentBonus` helper (around line 353).

### 2. Apply variance to player attacks

**Where:** `playerAttack()` (line 363)

```js
// Before
const damage = Math.max(0, game.player.attack + atkBonus - target.defense);

// After
const base = game.player.attack + atkBonus - target.defense;
const damage = Math.max(0, base + rollVariance());
```

### 3. Apply variance to monster attacks

**Where:** `runMonsterTurns()` (line 407)

```js
// Before
const damage = Math.max(0, m.attack - (currentPlayer.defense + defBonus));

// After
const base = m.attack - (currentPlayer.defense + defBonus);
const damage = Math.max(0, base + rollVariance());
```

### 4. Make randomness injectable for testing

To keep tests deterministic, accept an optional `rng` parameter on the game
state (or as a module-level override). The simplest approach: make
`rollVariance` read from a `_rollOverride` module-level variable when set:

```js
let _rollOverride = null;

export function setRollOverride(fn) { _rollOverride = fn; }

function rollVariance() {
  if (_rollOverride) return _rollOverride();
  return Math.floor(Math.random() * 3) - 1;
}
```

Tests can call `setRollOverride(() => 0)` in a `beforeEach` to neutralize
variance for existing deterministic assertions, and use specific overrides
(e.g. `() => 1` or `() => -1`) to test variance behavior.

## Test Updates

Update tests in `src/game.test.js`:

1. **Existing combat tests** — add `setRollOverride(() => 0)` in setup to
   preserve their current deterministic behavior. Reset with
   `setRollOverride(null)` in teardown.

2. **New test: "damage variance adds to base damage"** — override roll to +1,
   verify damage is base + 1.

3. **New test: "damage variance subtracts from base damage"** — override roll
   to -1, verify damage is base - 1.

4. **New test: "damage floor is zero with negative variance"** — set up a
   scenario where base damage is 0, override roll to -1, verify damage is
   still 0 (not negative).

## Acceptance Criteria

1. Player attack damage varies by ±1 from the base calculation each hit
2. Monster attack damage varies by ±1 from the base calculation each hit
3. Damage is always floored at 0 (never negative)
4. Combat log messages reflect the actual (varied) damage dealt
5. All existing tests pass (using roll override to stay deterministic)
6. New tests cover +1, -1, and floor-at-zero variance scenarios

## Out of Scope

- Critical hits or miss mechanics
- Per-weapon or per-monster variance ranges
- Damage type system (elemental, etc.)
- UI changes to indicate high/low rolls
- Changes to stats tracking formula

## Agent Notes

- The key files are `src/game.js` (combat logic) and `src/game.test.js`
- `rollVariance` must be testable — the `setRollOverride` export is the
  simplest seam; alternatives (passing rng on game state, dependency injection)
  are fine too as long as tests stay clean
- Keep the `Math.max(0, ...)` wrapping the final damage to ensure the floor
- Run `node --test src/game.test.js` to verify
