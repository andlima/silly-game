---
id: minimap
status: not-started
area: frontend
priority: 55
depends_on: []
description: Corner minimap overlay showing the full explored dungeon layout
---

# Minimap

## Goal

Add a small semi-transparent minimap to the top-right corner of the web canvas,
giving the player an at-a-glance view of explored dungeon layout, their current
position, and points of interest. This helps orientation in the procedurally
generated dungeon without needing to backtrack.

## Acceptance Criteria

### Web frontend minimap

1. A minimap is drawn as an overlay on the main game canvas, positioned in the
   top-right corner with a small margin (8–12 px).
2. Each map tile is rendered as a single pixel (1×1), so the full 80×50 dungeon
   fits in an 80×50 pixel minimap area. Add a 1 px dark border around it.
3. Tile colors on the minimap:
   - Hidden (unexplored): transparent / not drawn
   - Revealed floor: dark grey (`#333`)
   - Revealed wall: medium grey (`#666`)
   - Visible floor (in FOV): lighter grey (`#555`)
   - Visible wall (in FOV): light grey (`#999`)
   - Stairs: blue dot (`#5599dd`)
   - Player: bright yellow dot (`#ffcc00`)
   - Visible monsters: red dot (`#cc3333`)
4. The minimap updates every render frame alongside the main view.
5. The minimap has a semi-transparent dark background (`rgba(0,0,0,0.6)`) so
   it doesn't obscure the game too much.
6. A keyboard toggle (`Tab` key) shows/hides the minimap. Default: visible.

### CLI frontend minimap

7. No minimap for the CLI — terminal screen real estate is too limited.

### No new modules

8. The minimap rendering logic lives directly in the web frontend's render
   function (or a helper called from it) — no new `src/` module needed.
9. It reads from the same `game.revealed`, `game.fov`, `game.monsters`, and
   `game.map` state already available in the render scope.

## Out of Scope

- Clickable minimap (click-to-move)
- Minimap zoom or resize controls
- Item markers on minimap (potions, etc.)
- Minimap for the TUI/CLI frontend
- Fog-of-war animation on the minimap

## Design Notes

The minimap should be drawn *after* the main tile rendering pass, on top of
the existing canvas — no second canvas element needed. Use `ctx.fillRect` with
1×1 pixel fills for each explored tile.

Performance: iterating 80×50 = 4000 tiles per frame is trivial. No
optimization needed.

The toggle state (`minimapVisible`) is a simple boolean in the frontend script
scope. No need to persist it in game state.

## Agent Notes

- The render function in `index.html` already has access to `game.map`,
  `game.revealed`, `game.fov`, and `game.monsters` — use those directly.
- Draw the minimap at the end of the `render()` function, after the main tile
  loop, so it appears on top.
- For the border, draw a slightly larger filled rect behind the minimap area.
- Make sure the `Tab` key handler calls `e.preventDefault()` to prevent
  browser tab-focus behavior from interfering.
- The minimap pixel size (1×1 per tile) keeps it small enough to not obstruct
  gameplay. If 80×50 feels too small on high-DPI screens, the implementer may
  scale to 2×2, but 1×1 is the starting target.
