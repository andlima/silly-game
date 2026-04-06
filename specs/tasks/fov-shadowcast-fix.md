---
id: fov-shadowcast-fix
status: not-started
area: engine
priority: 80
depends_on: []
description: Fix FOV shadowcasting bug where nearby tiles occasionally render 100% black due to algorithm edge cases
---

# Fix FOV Shadowcasting Artifacts

## Goal

Fix a bug where tiles near the hero occasionally render as 100% black (hidden)
even though they should be visible. The artifact appears with certain wall
configurations and self-corrects when the hero moves to a new position.

## Problem Analysis

The current recursive shadowcasting implementation in `src/fov.js` has two
related issues in `castOctant()`:

1. **Lost visible region on row-end walls**: When a wall is the last cell
   processed in a row, `blocked=true` causes the outer loop to `break`
   (line 87). The recursion (line 82) only covers the open region to the
   left of the wall. The open region to the right (lower slopes) is never
   processed for subsequent rows, leaving nearby floor tiles out of the FOV.

2. **Stale start-slope boundary**: Line 59 (`if (leftSlope > startSlope)`)
   uses the function parameter `startSlope` instead of the locally tracked
   `nextStartSlope`. After a wall narrows the visible region,
   subsequent rows don't respect the updated boundary.

These are well-known edge cases in this family of algorithms.

## Changes

### Replace shadowcasting variant (`src/fov.js`)

Replace the current `castOctant()` implementation with **symmetric
shadowcasting** (Albert Ford's variant). Symmetric shadowcasting guarantees
that if tile A sees tile B, then B also sees A, which eliminates the class
of artifacts where nearby visible tiles are missed.

Key constraints:
- Keep the public API unchanged: `computeFOV(map, ox, oy, radius)` returns
  `Map<string, number>` of `"x,y"` -> brightness (0.45-1.0)
- Keep `TORCH_RADIUS = 6`
- Keep the `brightness()` function and its curve unchanged
- Keep the `isOpaque()` function unchanged
- Keep the `transformOctant()` helper (or equivalent octant mapping)
- Keep the "max brightness wins" merge for tiles seen from multiple octants
- Export `TORCH_RADIUS` as before

The algorithm change is internal to `castOctant()` only. No other files
should need changes.

## Out of Scope

- FOV radius or brightness curve changes
- Rendering changes (index.html, cli.js)
- Revealed/hidden tile logic in game.js
- Monster FOV / awareness radius
- Any visual or gameplay tuning

## Verification

- Existing FOV tests in `src/game.test.js` must pass (wall blocking,
  brightness range, revealed persistence, visibility states)
- Walk around dungeon levels and confirm no black-tile artifacts appear
  near the hero in any wall configuration
- Verify the FOV shape still looks circular and natural at radius 6
