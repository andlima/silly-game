---
id: visual-polish
status: not-started
area: full-stack
priority: 55
depends_on:
  - fov-and-lighting
description: Improved tile rendering, HP bar, refined color palette, and HUD layout
---

# Visual Polish

## Goal

Make the game more visually appealing with better tile rendering, a refined
color palette, an HP bar, and a structured HUD. These are cosmetic changes to
both frontends — no gameplay logic changes.

## Acceptance Criteria

### Browser frontend (`index.html`)

#### Tile rendering

1. Wall tiles render as solid filled rectangles (no `#` character) with subtle
   color variation — adjacent walls use slightly different shades (e.g.,
   alternate between 2-3 grey tones based on `(x + y) % 3`) to break up the
   monotonous grid
2. Floor tiles render as a subtle dot or nothing at all, with a very faint
   background color variation (e.g., two alternating dark green/dark-grey tones)
   to give a slight texture without visual noise
3. Corridor floor tiles and room floor tiles use the same rendering (no
   distinction needed)
4. The player `@` character is drawn on a softly glowing background
   (yellow/gold with a slight halo — can be a slightly larger filled circle or
   a brighter background rectangle behind the tile)

#### Color palette

5. Replace the current color scheme with a more cohesive palette:
   - Background: `#0a0a0a` (near-black, not pure black)
   - Walls: shades of `#3a3a4a` to `#4a4a5a` (blue-grey stone tones)
   - Floor: shades of `#1a1a1a` to `#1e1e1e` (very dark, subtle)
   - Player: `#ffcc00` character on `#44380a` background
   - Stair: `#5599dd` (soft blue)
   - Potion: `#dd55cc` (soft magenta)
   - Monsters keep their existing colors but rendered slightly brighter against
     the darker floor

#### HUD

6. HP is shown as a colored bar (not just text): a filled rectangle that
   shrinks proportionally, green when HP > 60%, yellow when 30-60%, red when
   < 30%, with the numeric value overlaid (e.g., `30/30`)
7. HUD is arranged in a horizontal strip below the canvas with clear visual
   separation (a thin dark border or 8px gap)
8. Message log lines have slight transparency fade — newest message is fully
   opaque, older messages progressively dimmer

### CLI frontend (`cli.js`)

#### Tile rendering

9. Wall tiles use `\u2588` (full block character) instead of `#`, in a dark
   grey color, creating a more solid visual wall
10. Floor tiles use `\u00b7` (middle dot) instead of `.`, in a very dark green,
    for a subtler look

#### HUD

11. HP is shown as a bracketed bar: `HP [##########..........] 15/30` where `#`
    characters represent remaining HP (colored green/yellow/red by percentage)
    and `.` characters represent lost HP (dark grey)
12. Bar width is 20 characters

## Out of Scope

- Animations or transitions (tile fade-in, smooth camera, etc.)
- Sound effects
- Custom fonts or sprite-based rendering
- Changes to game logic, FOV, or mechanics

## Design Notes

- Wall color variation: use a simple hash like `(x * 7 + y * 13) % 3` to pick
  from a small palette of wall shades. This creates a natural-looking stone
  texture without any randomness per frame.
- For the HP bar in the browser, draw a filled rect behind text. The bar
  container can be a `<div>` with a colored inner `<div>` sized by percentage,
  or drawn directly on a small HUD canvas.
- Message fade: use CSS `opacity` on each message line, or set the color alpha
  channel progressively (newest = 1.0, oldest = 0.4).
- The CLI HP bar is a fixed 20-char wide string. Fill
  `Math.round(hp/maxHp * 20)` characters with `#` and the rest with `.`.

## Agent Notes

- This spec only touches the renderers (`index.html` and `cli.js`) and their
  color/drawing logic. No changes to `src/` game logic files should be needed.
- Read `index.html` and `cli.js` carefully before starting — the rendering
  loops are the main targets.
- For wall color variation, the coordinates used should be the *map* coordinates
  (not view coordinates) so the pattern stays stable as the player moves.
- Test at various HP levels to verify the HP bar color transitions work.
- The FOV brightness from `fov-and-lighting` interacts with these colors —
  brightness scaling should apply on top of the new palette. Make sure the
  visual-polish colors look good both at full brightness and at the dimmed
  "revealed" level.
