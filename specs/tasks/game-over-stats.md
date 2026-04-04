---
id: game-over-stats
status: not-started
area: web
priority: 60
depends_on: []
description: Track cumulative game stats and display them on an improved game over / win screen
---

# Game Over Stats Screen

## Goal

Replace the bare "Game Over" / "You Win!" overlay with a satisfying end-of-run
summary showing the player's stats. The screen should feel like a roguelike
death recap — informative, slightly dramatic, and in keeping with the existing
dark/retro aesthetic.

## Changes

### 1. Add Stat Tracking to Game State (`src/game.js`)

Add a `stats` object to the game state returned by `createGame()`:

```js
stats: {
  monstersKilled: 0,
  damageDealt: 0,
  damageTaken: 0,
  potionsUsed: 0,
  stepsTaken: 0,
  causeOfDeath: null,   // e.g. "Skeleton" or null if won
}
```

Increment these counters in the appropriate places inside `dispatch()` and
`runMonsterTurns()`:

- **monstersKilled** — increment when a monster's HP drops to 0 (combat
  resolution in `dispatch`, around line 337-356).
- **damageDealt** — add the damage value dealt to a monster each attack.
- **damageTaken** — add the damage value taken from a monster each hit in
  `runMonsterTurns()`.
- **potionsUsed** — increment in the `'potion'` action handler.
- **stepsTaken** — increment on each successful `'move'` action (only when
  the player actually changes position).
- **causeOfDeath** — set to the attacking monster's `name` when the player's
  HP drops to 0 in `runMonsterTurns()`.

These fields must be carried forward in every state update (they already will
be if they live on the `game` object that gets spread/returned).

### 2. Redesign the End Screen Overlay (`index.html`)

Replace the current overlay content (just `<h1>` + `<button>`) with a richer
layout. All changes are inside the existing `#overlay` div and its CSS.

**Structure:**

```
┌──────────────────────────────┐
│                              │
│      💀  Game Over           │  (or  🏆  You Win!)
│   "Slain by a Dragon        │  (or "Escaped the dungeon!")
│       on level 4"            │
│                              │
│   ── Stats ──────────────    │
│   Level reached ........ 4   │
│   Monsters slain ....... 12  │
│   Damage dealt ......... 87  │
│   Damage taken ......... 63  │
│   Potions used ......... 3   │
│   Steps taken .......... 94  │
│                              │
│        [ Restart ]           │
│                              │
└──────────────────────────────┘
```

**Epitaph line:**
- On death: `"Slain by a {monsterName} on level {level}"`.
- On win: `"Escaped the dungeon on level {level}"` (level will be 5).

**Styling guidelines** (keep consistent with existing overlay/HUD palette):
- Overlay background stays dark with high opacity (existing `rgba` is fine).
- Title: large, red (#ff4444) for death, green (#44ff44) for win — matches
  existing classes.
- Epitaph: smaller italic text, amber/gold (#ccaa44) — matches message color.
- Stats section: monospace, medium grey (#aaa) labels with brighter white
  values. Use dotted leaders or spacing to align label–value pairs.
- Stat labels left-aligned, values right-aligned within a fixed-width block
  (max-width ~300px, centered in overlay).
- Restart button: same style as current, no changes needed.
- Must look acceptable on mobile (≥320px width). The stat block should not
  overflow or wrap awkwardly. Use responsive font sizing if needed.

**Rendering logic** — update the `if (game.gameOver)` / `else if (game.won)`
block (around line 723-733) to populate the stat values from `game.stats` and
`game.level`. Build the stat rows via JS (innerHTML or DOM creation) rather
than hardcoding them in the HTML template.

### 3. Win Screen Gets the Same Treatment

The "You Win!" overlay should show the same stats panel. The only differences
are the title text/color and the epitaph line. Do not duplicate rendering
logic — use the same stat-display code for both outcomes.

## Files to Modify

- `src/game.js` — add `stats` to initial state; increment counters in
  `dispatch()` and `runMonsterTurns()`.
- `index.html` — overlay HTML structure, CSS for stat panel, JS rendering
  logic for populating stats.

## Files NOT to Modify

- `src/map.js`, `src/dungeon.js`, `src/fov.js`, `src/glyphs.js`,
  `src/audio.js` — unchanged.
- `cli.js` — terminal UI is out of scope for this task.

## Verification

- [ ] `game.stats` object exists on the state returned by `createGame()`.
- [ ] `monstersKilled` increments correctly when killing a monster.
- [ ] `damageDealt` accumulates total damage the player deals.
- [ ] `damageTaken` accumulates total damage the player receives.
- [ ] `potionsUsed` increments when using a potion.
- [ ] `stepsTaken` increments on each successful move.
- [ ] `causeOfDeath` is set to the monster name that kills the player.
- [ ] Game over overlay shows epitaph with monster name and level.
- [ ] Win overlay shows epitaph with level.
- [ ] Both overlays display all six stat rows with correct values.
- [ ] Stat panel is readable and well-aligned on desktop (≥1024px).
- [ ] Stat panel is readable and does not overflow on mobile (≥320px).
- [ ] Overlay visual style matches existing dark/retro aesthetic.
- [ ] Restart button still works on both game over and win screens.
- [ ] Existing HUD, messages, and gameplay are unaffected.
