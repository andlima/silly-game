---
id: core-engine
status: not-started
area: frontend
priority: 10
depends_on: []
description: Single-page HTML roguelike with canvas rendering, tile grid, and player movement
---

# Core Engine

## Goal

Create the foundational single-page HTML roguelike game. The player should be able
to move a character around a tile-based map rendered on an HTML5 canvas, with walls
blocking movement. Everything lives in a single `index.html` file (inline CSS/JS).

## Acceptance Criteria

1. A single `index.html` file that can be opened directly in a browser (no build step)
2. An HTML5 canvas renders a tile grid using a monospace-style aesthetic (colored rectangles with text characters)
3. The map uses a 2D array of tiles; each tile is either floor (`.`) or wall (`#`)
4. A hardcoded starter room (rectangular room with walls on all sides) is displayed on load
5. The player is represented by an `@` symbol and spawns on a floor tile
6. Arrow keys and WASD move the player one tile per keypress (turn-based, not real-time)
7. Wall tiles block player movement (collision detection)
8. The viewport is centered on the player if the map is larger than the visible canvas area
9. A minimal HUD below the canvas shows the player's position (x, y)
10. The page has a dark background with a retro/terminal color scheme

## Out of Scope

- Procedural dungeon generation (hardcoded room is fine)
- Enemies, combat, items, or inventory
- Multiple levels or stairs
- Sound or animations

## Design Notes

- Use a tile size of roughly 16-20px so the grid feels retro
- Suggested color scheme: black background, white/grey walls, green floor, yellow player
- The game state should be a plain JS object so future specs can extend it easily
- Keep rendering and game logic separated into distinct functions for maintainability

## Agent Notes

- This is the first spec — there is no existing code. Create `index.html` at the repo root.
- Keep all code in a single file. No modules, no bundler, no dependencies.
- Test by opening the file in a browser. Make sure keyboard input works immediately
  (no need to click the canvas first — use `window.addEventListener`).
