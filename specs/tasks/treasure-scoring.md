---
id: treasure-scoring
status: not-started
area: gameplay
priority: 50
depends_on: []
description: Gold rewards from killing monsters plus floor treasure, with score tracking and HUD display
---

# Treasure & Scoring

## Goal

Give the player a reason to fight and explore by awarding gold for killing
monsters and placing treasure on dungeon floors. Gold is auto-collected (no
floor drops from monsters) and displayed as a score in the HUD and end-game
summary.

## Design

### Gold from monsters

When a monster is defeated, the player receives gold automatically. Amount is
random within a range that scales with monster type:

| Monster  | Gold range |
|----------|-----------|
| Rat      | 0-1       |
| Skeleton | 2-4       |
| Bear     | 4-8       |
| Dragon   | 8-16      |

Add a `gold` field to each entry in `MONSTER_TYPES`.
Use `{ minGold, maxGold }` so the range is data-driven.

### Floor treasure

Spawn 0-1 gold piles per level (not in room 0, same placement rules as food).
Each pile is worth `2 * level` gold (so level 1 = 2g, level 5 = 10g).
Item type: `'gold'`, char: `'$'`, color: `'#ffcc00'`.

### Inventory & stats

- Add `gold: 0` to `game.inventory` in `createGame()`.
- Gold persists across levels (same as food/equipment).
- Add `goldCollected: 0` to `game.stats` for the end-game summary.

### Pickup

- Monster kill gold: add directly in `playerAttack()` when `newHp <= 0`.
  Log message: `"The Rat dropped 1 gold."` (skip message if 0 gold).
- Floor gold: handle in `checkPickup()` following the food pattern.
  Log message: `"You pick up 4 gold."`.

### HUD display

- **Web (`index.html`)**: show gold count near the food/equipment area.
- **CLI (`cli.js`)**: show gold count in the status line.
- **End-game**: include "Gold collected: N" in the stats summary.

### Glyphs & rendering

Add a gold entry to `src/glyphs.js` (char `'$'`, emoji `🪙`).

**Sprite mode:** The current sprite sheet (`assets/roguelike-sprites.png`) is a
full 4x3 grid with no empty slots. For sprite mode, fall back to drawing the
gold glyph as text (same approach the renderer already uses for text modes).
Add `SPRITE_MAP.gold = null` or omit it so `drawSprite` gracefully falls back.
A dedicated gold sprite can be added later when the sheet is expanded.

## Files to change

| File | What |
|------|------|
| `src/game.js` | `MONSTER_TYPES` gold ranges, `createGame` inventory/stats, `playerAttack` gold award, `spawnTreasure` function, `checkPickup` gold case |
| `src/glyphs.js` | Gold glyph entry |
| `index.html` | HUD gold display, end-game gold stat, sprite-mode text fallback for gold item |
| `cli.js` | HUD gold display |
| `src/game.test.js` | Tests for gold drop amounts, floor pickup, stat tracking |

## Out of scope

- Shops or spending gold
- Gold affecting gameplay (purely a score)
- Leaderboard / persistent run history
