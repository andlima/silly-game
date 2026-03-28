---
id: core-engine
status: done
area: full-stack
priority: 10
depends_on: []
description: Roguelike core with shared game logic, browser canvas renderer, and Node.js CLI renderer
---

# Core Engine

## Goal

Create the foundational roguelike game with a shared game-logic layer and two
frontends: an HTML5 canvas renderer (browser) and an ANSI terminal renderer
(Node.js CLI). The player should be able to move a character around a tile-based
map with walls blocking movement, in either interface.

## Acceptance Criteria

### Project structure

1. Game logic lives in ES modules under `src/` (e.g., `src/game.js`, `src/map.js`)
2. `index.html` at the repo root loads the modules and renders via HTML5 canvas — openable directly in a browser with no build step (use `<script type="module">`)
3. `cli.js` at the repo root is the Node.js entry point — runnable with `node cli.js`
4. No external dependencies (no npm packages); use only built-in Node.js APIs and browser APIs

### Shared game logic (`src/`)

5. The map is a 2D array of tiles; each tile is either floor (`.`) or wall (`#`)
6. A hardcoded starter room (rectangular room with walls on all sides) is generated on init
7. The player is represented by an `@` symbol and spawns on a floor tile
8. A `movePlayer(direction)` function validates moves and updates game state
9. Wall tiles block player movement (collision detection)
10. Game state is a plain JS object so future specs can extend it easily

### Browser frontend (`index.html`)

11. Canvas renders a tile grid using a monospace-style aesthetic (colored rectangles with text characters)
12. Arrow keys and WASD move the player one tile per keypress (turn-based)
13. Viewport centers on the player if the map is larger than the visible canvas area
14. A minimal HUD below the canvas shows the player's position (x, y)
15. Dark background with a retro/terminal color scheme

### CLI frontend (`cli.js`)

16. Renders the map using ANSI escape codes in the terminal (colored characters)
17. Arrow keys and WASD move the player (using Node.js raw stdin mode)
18. Viewport centers on the player if the map is larger than the terminal window
19. A HUD line below the map shows the player's position (x, y)
20. `q` key quits the game
21. Same color scheme as browser (black bg, white/grey walls, green floor, yellow player)

## Out of Scope

- Procedural dungeon generation (hardcoded room is fine)
- Enemies, combat, items, or inventory
- Multiple levels or stairs
- Sound or animations

## Design Notes

- Browser tile size: roughly 16-20px so the grid feels retro
- Suggested color scheme: black background, white/grey walls, green floor, yellow player

### Interface boundary (action-based architecture)

The shared game module exposes a pure, action-based API. Frontends never call
domain functions (like `movePlayer`) directly — they translate platform input
into action objects and dispatch them.

```
createGame()                      → game state object
dispatch(game, { type, ... })     → updated game state
getVisibleTiles(game, w, h)       → 2D slice for rendering
```

Each frontend is responsible for exactly two things:
1. **Input adapter** — translate platform events (DOM keydown / Node stdin) into
   action objects (e.g., `{ type: 'move', dir: 'n' }`)
2. **Renderer** — read game state and draw it (canvas / ANSI); never mutate state

This keeps all game rules in `src/` and makes frontends thin, interchangeable shells.
As future specs add actions (attack, use-item, descend), only `dispatch` grows —
frontends just map new keys to new action types.

## Agent Notes

- This is the first spec — there is no existing code.
- Use ES module syntax (`import`/`export`) in `src/` files. The browser loads them
  via `<script type="module">` and Node.js supports them natively (use `.js` extension
  and ensure `package.json` has `"type": "module"` or use `.mjs`).
- Create a minimal `package.json` with `"type": "module"` so Node.js treats `.js`
  files as ESM.
- For the CLI renderer, use `process.stdin.setRawMode(true)` for keypress handling
  and `process.stdout.write` with ANSI escape codes for rendering.
- Test both interfaces: open `index.html` in a browser AND run `node cli.js` in a terminal.
