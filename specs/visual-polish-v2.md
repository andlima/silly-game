---
id: visual-polish-v2
status: not-started
area: full-stack
priority: 62
depends_on:
  - visual-polish
description: TUI color parity with web — blue-grey walls, FOV brightness falloff, remembered tiles
---

# Visual Polish v2

## Goal

Bring the TUI renderer's color palette and FOV rendering closer to the web
version's aesthetic. The web version already has blue-grey stone walls, smooth
FOV brightness, and dim remembered tiles — this spec adds equivalent effects
to the TUI using ANSI 256-color codes.

## Acceptance Criteria

### CLI frontend (`cli.js`)

#### Color palette

1. Wall tiles use blue-grey tones (ANSI 256-color, e.g., `\x1b[38;5;60m` to
   `\x1b[38;5;67m`) to match the web version's stone palette, instead of plain
   white/grey.
2. Floor tiles use a very dark color (e.g., `\x1b[38;5;236m`) or are left
   blank — matching the web version's near-invisible dark floors.
3. Remembered (explored but not currently visible) tiles render in very dark
   blue-grey (e.g., `\x1b[38;5;237m` to `\x1b[38;5;239m`), giving the same
   "fog of memory" effect as the web version.
4. FOV brightness falloff is approximated using ANSI 256-color shades —
   tiles at the edge of the torchlight radius are dimmer than tiles near
   the player. Use 3-4 brightness levels rather than a smooth gradient.

## Out of Scope

- Web renderer changes (already looks good)
- Animations or transitions
- Changes to game logic, FOV radius, or mechanics
- Glyph/emoji changes (covered by `unicode-tiles-v2`)

## Design Notes

- For TUI FOV brightness, map the brightness float (0.0–1.0) from
  `fov-and-lighting` to 3-4 ANSI 256-color shades per tile type. For example,
  walls: `60 → 61 → 66 → 67` (dark to bright blue-grey). Clamp rather than
  interpolate — discrete steps look fine in a terminal.
- Remembered tiles (visible=false, explored=true) should use a single very
  dark shade per tile type, dimmer than the dimmest FOV level.

## Agent Notes

- This spec only touches `cli.js` rendering logic.
- Read the `fov-and-lighting` implementation to understand how brightness
  values and tile memory (explored/visible) are exposed to the renderer.
- Test at various distances from the player to verify the brightness steps
  look natural and don't create jarring bands.
