---
id: web-ui-polish
status: not-started
area: web
priority: 50
depends_on: []
description: Enlarge minimap, increase tile font size, add keyboard shortcuts for sound toggle and restart
---

# Web UI Polish: Minimap, Font Size, and Shortcuts

## Goal

Improve the web frontend's usability by making the minimap larger and more
readable, increasing the game tile size, and adding keyboard shortcuts for
sound toggle and restart.

## Changes

### 1. Larger Minimap

Scale each map cell from 1px to 3px on the minimap overlay. Update the
minimap rendering in `index.html` (around line 275-313):

- Introduce a `MINIMAP_SCALE = 3` constant.
- Multiply all per-tile `fillRect` sizes by `MINIMAP_SCALE`.
- Adjust position calculation so the scaled minimap still sits in the
  top-right corner with margin.
- Keep existing colors and toggle (`m`) behavior unchanged.

### 2. Increase Tile / Font Size

Bump `TILE_SIZE` from 24 to 28 in `index.html` (line 118). Everything that
derives from `TILE_SIZE` (canvas dimensions, glyph placement, viewport
calculations) will scale automatically.

### 3. Sound Toggle Shortcut (`n`)

Add `n` / `N` as a keyboard shortcut to mute/unmute sound. The logic should
mirror the existing mute button click handler (lines 449-462):

- If volume > 0, save current volume and set to 0; update mute button icon.
- If volume == 0, restore saved volume; update mute button icon.
- Works regardless of game-over/win state (place before the early-return
  guard, alongside the `m` and `Tab` handlers).

### 4. Restart Shortcut (`r`)

Add `r` / `R` as a keyboard shortcut to restart the game. Behavior:

- Dispatch `{ type: 'restart' }` and re-render, same as the restart button.
- Works in any game state (active, game-over, or win).
- Place before the game-over/win early-return guard.

## Files to Modify

- `index.html` — all four changes live here.

## Acceptance Criteria

- [ ] Minimap renders at 3x scale; still positioned top-right with margin.
- [ ] `TILE_SIZE` is 28; game renders correctly at the new size.
- [ ] Pressing `n` toggles mute; mute button icon stays in sync.
- [ ] Pressing `r` restarts the game from any state.
- [ ] Existing shortcuts (movement, descend, potion, wait, tab, minimap
      toggle) remain unaffected.
