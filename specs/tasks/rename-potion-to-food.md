---
id: rename-potion-to-food
status: not-started
area: ui
priority: 40
depends_on: []
description: Rename all "potion" terminology to "food" to match the apple visual (emoji and sprite)
---

# Rename Potion to Food

## Goal

The healing item is visually represented as an apple (🍎 emoji, apple sprite)
but called "potion" everywhere in code, UI, and docs. Rename all references
to use "food" terminology so the name matches the visual.

## Changes

This is a rename/refactor with one small visual change (ASCII glyph).
The `p` key binding is kept — no control changes.

### 1. `src/game.js` — core logic

| Old | New |
|-----|-----|
| `POTION_HEAL` constant | `FOOD_HEAL` |
| `spawnPotions()` function | `spawnFood()` |
| `handleUsePotion()` function | `handleUseFood()` |
| `inventory.potions` field | `inventory.food` |
| `stats.potionsUsed` field | `stats.foodUsed` |
| `type: 'potion'` item type | `type: 'food'` |
| Item `char: '!'` | `char: '%'` (roguelike convention for food) |
| Action type `'usePotion'` | `'useFood'` |
| Message `'You pick up a health potion.'` | `'You pick up some food.'` |
| Message `'You have no potions.'` | `'You have no food.'` |
| Message `'You drink a potion and restore N HP.'` | `'You eat food and restore N HP.'` |
| Message `'Already at full health.'` | (keep as-is) |

### 2. `src/game.test.js` — tests

Update all references to match the new identifiers:

- `inventory: { potions: N }` → `inventory: { food: N }`
- `stats.potionsUsed` → `stats.foodUsed`
- Action `{ type: 'usePotion' }` → `{ type: 'useFood' }`
- Describe block `'items and potions'` → `'items and food'`
- Test names mentioning "potion" → use "food"
- Message assertions (e.g., `'no potions'` → `'no food'`)
- Item `char: '!'` → `char: '%'`

### 3. `src/glyphs.js` — glyph key

- `potion:` key → `food:` (both emoji and ASCII objects)
- ASCII char `'!'` → `'%'`

### 4. `index.html` — web UI

| Old | New |
|-----|-----|
| CSS class `.potions` | `.food` |
| Element id `hud-potions` | `hud-food` |
| HUD text `Potions: N` | `Food: N` |
| Help text `Use potion` | `Use food` |
| Help desc `Potion / Descend / Wait` | `Food / Descend / Wait` |
| Button id `btn-potion`, label `Potion` | `btn-food`, label `Food` |
| Sprite map key `potion:` | `food:` |
| Color map key `potion:` | `food:` |
| JS dispatching `{ type: 'usePotion' }` | `{ type: 'useFood' }` |
| Pickup flash condition referencing `potions` | reference `food` |

### 5. `cli.js` — terminal UI

- HUD text `Potions: N` → `Food: N`
- Key hint `p:potion` → `p:food`
- Help text `Use potion` → `Use food`

### 6. `README.md` — docs

- `Use potion` → `Use food`
- `health potions` → `food` (in features list)
- `potions used` → `food eaten` (in stats description)

### 7. Spec files (non-task specs only if they reference potion in ways that would confuse future readers)

Update references in these completed/reference specs only where they describe
current game behavior (not historical context):

- `specs/unicode-tiles.md`, `specs/unicode-tiles-v2.md` — table row
- `specs/visual-polish.md` — color entry
- `specs/items-and-progression.md` — item descriptions
- `specs/monsters-and-combat.md` — item list
- `specs/minimap.md` — item mention
- `specs/web-audio.md` — action description

Also update references in task specs under `specs/tasks/` that describe
current behavior or UI elements.

## Verify

```bash
node --test src/game.test.js
```

All existing tests must pass with the renamed identifiers. No new tests needed.

Additionally, confirm no stale "potion" references remain in source files:

```bash
grep -ri 'potion' src/ cli.js index.html
```

This should return zero matches.
