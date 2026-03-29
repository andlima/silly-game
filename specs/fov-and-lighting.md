---
id: fov-and-lighting
status: not-started
area: full-stack
priority: 50
depends_on:
  - items-and-progression
description: Field of view with torchlight radius, tile memory, and brightness falloff
---

# Field of View and Lighting

## Goal

Add a field-of-view (FOV) system so the player only sees tiles within line of
sight. Explored-but-not-visible tiles are rendered dimmed ("memory"), and
unexplored tiles are completely hidden. A brightness falloff around the player
creates a torchlight atmosphere. This is purely a rendering change driven by
shared FOV state — no gameplay mechanics change.

## Acceptance Criteria

### Shared game logic (`src/`)

1. A `computeFOV(map, x, y, radius)` function returns the set of tiles visible
   from (x, y) within the given radius, blocked by wall tiles (use a
   shadowcasting or raycasting algorithm)
2. Torch radius is 8 tiles by default
3. Game state includes a `revealed` 2D boolean array (same dimensions as the
   map) tracking which tiles the player has ever seen
4. After every player action, FOV is recomputed and newly visible tiles are
   marked as revealed
5. `revealed` resets when the player descends to a new level (new dungeon, fresh
   exploration)
6. `getVisibleTiles` is extended: each cell gains a `visibility` field with one
   of three values — `"visible"`, `"revealed"`, or `"hidden"`
7. Visible cells also get a `brightness` value from 0.0 to 1.0, based on
   distance from the player (1.0 at the player, fading toward 0.3 at the edge
   of the torch radius)
8. Monsters and items are only included in cells with `visibility: "visible"`
   (not in revealed/hidden cells)

### Browser frontend (`index.html`)

9. Visible tiles are drawn with brightness-scaled colors (multiply RGB channels
   by the brightness value)
10. Revealed tiles are drawn in desaturated, dark tones (e.g., 20-30% brightness,
    blue-grey tint) — walls and floor are distinguishable but muted
11. Hidden tiles are rendered as pure black (background color)
12. The overall effect: a bright circle around the player fading into dim memory
    and darkness

### CLI frontend (`cli.js`)

13. Visible tiles use their normal ANSI colors
14. Revealed tiles use dark grey (`\x1b[90m`) for all tile types
15. Hidden tiles are rendered as spaces (empty)
16. Monsters and items only appear in visible cells

## Out of Scope

- Dynamic light sources (torches on walls, glowing items)
- Transparent or semi-transparent tiles (glass, water)
- Light color variations (everything uses the same white torchlight)
- Stealth or monster FOV

## Design Notes

- **Algorithm**: recursive shadowcasting (one octant at a time, mirrored 8 ways)
  is the standard roguelike approach. A simpler raycasting approach (cast rays to
  each perimeter cell of the radius) is also acceptable — the map is small enough
  that performance is not a concern.
- **Brightness curve**: `brightness = 1.0 - (distance / radius) * 0.7` gives a
  nice falloff from 1.0 at center to 0.3 at edge. Clamp to [0.3, 1.0].
- The FOV module should live in `src/fov.js` and be a pure function — it takes
  the tile grid, origin, and radius, and returns visible tile coordinates.
- `revealed` should be allocated once per level (in `newLevel`) as a 2D array of
  `false`, then updated in-place (or via immutable copy) after each dispatch.

## Agent Notes

- Read `src/game.js` carefully — `getVisibleTiles` is the bridge between game
  state and renderers. Extending its return cells with `visibility` and
  `brightness` is the key integration point.
- The FOV computation should happen inside `dispatch` (after the player acts),
  not in the renderers. Store the current FOV set in game state so
  `getVisibleTiles` can check membership.
- For the browser renderer, scaling colors by brightness can be done by parsing
  hex colors to RGB, multiplying, and converting back — or by using
  `ctx.globalAlpha` as a simpler approximation.
- For the CLI, ANSI 256-color or 24-bit escape codes can approximate brightness,
  but the simpler approach (full color for visible, dark grey for revealed, space
  for hidden) is fine and matches the spec.
- Test by moving around: new rooms should be dark until entered, and previously
  visited rooms should appear dimmed when the player leaves.
