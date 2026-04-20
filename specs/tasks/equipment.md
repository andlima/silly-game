---
id: equipment
status: not-started
area: full-stack
priority: 50
depends_on:
  - items-and-progression
description: Add weapons and armor that spawn on dungeon floors and auto-equip to boost combat stats
---

# Equipment: Weapons and Armor

## Goal

Add a equipment system with weapons and armor that spawn on dungeon floors.
Items auto-equip when picked up if the slot is empty or the new piece is
strictly better. Equipment modifies combat stats (attack and defense) through
bonuses applied on top of the player's base stats.

## Items

| Item   | Slot   | Stat bonus | ASCII | Emoji |
|--------|--------|------------|-------|-------|
| Dagger | weapon | +2 attack  | `\|`  | 🗡️    |
| Sword  | weapon | +4 attack  | `/`   | ⚔️    |
| Helmet | helmet | +1 defense | `^`   | 🪖    |
| Shield | shield | +2 defense | `]`   | 🛡️    |

## Acceptance Criteria

### Shared game logic (`src/`)

1. Define the four equipment items with name, slot, stat bonus, and glyphs.
2. Add an `equipment` object to game state: `{ weapon: null, helmet: null, shield: null }`.
3. Equipment items spawn on the floor like food — 1-2 pieces per level, placed
   in random rooms (not the spawn room). Item type should be weighted by dungeon
   level (daggers/helmets on early levels, swords/shields on deeper levels).
4. Walking onto an equipment tile auto-picks it up. If the slot is empty or the
   new item's bonus is strictly greater than the currently equipped item, it
   auto-equips and logs a message (e.g., "You equip a Sword (+4 attack).").
   If the current item is equal or better, the pickup is skipped and a message
   is logged (e.g., "You already have better equipment.").
5. Combat damage calculation uses equipment bonuses:
   - Player attack: `player.attack + (weapon bonus or 0)`
   - Player defense: `player.defense + (helmet bonus or 0) + (shield bonus or 0)`
6. Equipment persists across dungeon levels (like inventory).
7. Glyph entries added to both `GLYPHS_ENHANCED` and `GLYPHS_ASCII` in `glyphs.js`.

### Browser frontend (`index.html`)

8. Equipment items render on the map using the appropriate glyph and a distinct color.
9. HUD displays currently equipped gear (e.g., "Weapon: Sword +4atk | Helmet: — | Shield: 🛡️ +2def").

### CLI frontend (`cli.js`)

10. Equipment items render on the map as colored ASCII characters.
11. HUD line displays currently equipped gear.

### Tests (`src/game.test.js`)

12. Picking up equipment into an empty slot equips it.
13. Picking up a strictly better item replaces the equipped item.
14. Picking up an equal or worse item is skipped.
15. Combat damage correctly includes equipment bonuses (attack and defense).
16. Equipment persists across level transitions.

## Out of Scope

- Dropping or swapping equipment manually.
- Equipment with multiple stat effects (e.g., +atk and +hp).
- Monster equipment or loot drops from killed monsters.
- Equipment durability or degradation.
- Inventory screen or equipment management UI beyond the HUD line.

## Design Notes

- Equipment items are conceptually similar to food: they are entries in the
  `items` array on the map with a `type` field (e.g., `'dagger'`, `'sword'`,
  `'helmet'`, `'shield'`).
- The `checkPickup` function in `game.js` already handles food auto-pickup;
  extend it with an equipment branch.
- Keep the flat stat model — equipment bonuses are computed at combat time, not
  baked into `player.attack`/`player.defense`. This avoids bookkeeping when
  swapping gear.
- Spawn weighting suggestion: levels 1-2 favor daggers/helmets, levels 3+ add
  swords/shields to the pool.

## Agent Notes

- Read `src/game.js` lines 198-213 for the existing `checkPickup` function.
- Read `src/game.js` lines 263-281 for `playerAttack` and lines 283-324 for
  `runMonsterTurns` — these are where equipment bonuses need to be applied.
- The `initLevel` function (around line 54) sets up items and inventory — extend
  it to spawn equipment and carry the `equipment` object across levels.
- Both frontends need: (a) new glyph rendering for 4 item types on the map, and
  (b) an equipment section in the HUD.
- The existing test file at `src/game.test.js` has patterns for item pickup tests
  that can be extended for equipment.
