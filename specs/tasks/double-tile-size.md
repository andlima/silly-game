---
id: double-tile-size
status: not-started
area: web
priority: 50
depends_on: []
description: Double the sprite tile size from 28px to 56px so sprites are 2x larger in each direction
---

# Double Sprite Tile Size

## Goal

Make rendered sprites 2× larger in each direction (4× area) in `sprite.html`.

## Changes

In `sprite.html`:

1. Change `TILE_SIZE` from `28` to `56`.
2. Change `FONT_SIZE` from `22` to `44` to keep emoji/ASCII text modes proportional.

No other changes needed — the viewport column/row calculation already derives from
`TILE_SIZE` and window dimensions, so fewer tiles will be visible on screen but
everything scales correctly. The minimap, HUD, and all other layout elements are
unaffected.

## Verification

- Open `sprite.html` in a browser.
- Sprites render at 56×56 px per tile (visually ~2× larger than before).
- Emoji and ASCII render modes also scale proportionally.
- Viewport adjusts to show fewer tiles without overflow or layout breakage.
