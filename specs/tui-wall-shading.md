---
id: tui-wall-shading
status: not-started
area: frontend
priority: 63
depends_on:
  - visual-polish-v2
description: Per-tile wall shade variation in the TUI for a natural stone texture
---

# TUI Wall Shading

## Goal

Give TUI walls a natural stone texture by varying their shade per-tile, similar
to the web renderer's wall color variation. Currently all TUI walls use a single
flat grey, which looks monotonous. This spec adds position-based shade variation
using ANSI 256-color codes so walls feel like rough-hewn stone rather than a
uniform grid.

## Acceptance Criteria

### CLI frontend (`cli.js`)

1. Visible wall tiles cycle through 3-4 blue-grey shades based on map
   coordinates — e.g., pick shade index from `(x * 7 + y * 13) % 4` — so
   adjacent walls differ subtly. Suggested ANSI 256-color values:
   `59`, `60`, `66`, `67` (blue-grey range).

2. The shade variation is stable: the same map coordinate always produces the
   same shade regardless of player position or FOV state.

3. FOV brightness falloff (from `visual-polish-v2`) stacks with shade variation.
   Tiles near the torch radius edge use darker variants of their assigned shade.
   Implementation: maintain a parallel dim-shade palette (e.g., `23`, `24`,
   `59`, `60`) and pick based on brightness level + position hash.

4. Remembered (explored but not visible) walls also use shade variation, but
   mapped to a very dark range (e.g., `236`, `237`, `238`, `239`) so the
   texture is faintly visible even in the fog of memory.

5. Floor tiles are not affected — they remain uniform dark (this spec is
   walls only).

## Out of Scope

- Web renderer changes (already has shade variation)
- Glyph or emoji changes
- Floor shade variation
- Changes to game logic, FOV radius, or mechanics

## Design Notes

- The hash `(x * 7 + y * 13) % N` is the same one used by the web renderer
  for wall variation. Reusing it ensures visual consistency if a player
  compares both frontends side by side.
- ANSI 256-color blue-grey range reference:
  - Bright: `60`–`67` (blue-grey)
  - Mid: `23`–`24`, `59`–`60` (darker blue-grey)
  - Dim: `236`–`239` (very dark grey, for remembered tiles)
- With FOV brightness from `visual-polish-v2`, you'll have roughly 3 tiers
  per wall tile: full brightness, edge-of-torch, and remembered. Each tier
  picks from its own shade palette, offset by the position hash.

## Agent Notes

- This spec only touches `cli.js` — specifically the wall rendering branches
  around lines 105-137.
- Read the `visual-polish-v2` implementation first to understand how FOV
  brightness levels are mapped to ANSI colors. This spec layers shade
  variation on top of that system.
- The position hash must use **map coordinates** (`c.x`, `c.y`), not screen
  coordinates, so the pattern stays fixed as the viewport scrolls.
- Test by walking around a large room — the walls should have a subtle but
  noticeable texture. If the variation is too strong (looks like a
  checkerboard), tighten the shade range.
