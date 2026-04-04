---
id: unicode-tiles-v2
status: not-started
area: full-stack
priority: 65
depends_on:
  - unicode-tiles
  - visual-polish-v2
description: Revised emoji glyphs, seamless walls, new monster roster, runtime ASCII/emoji toggle
---

# Unicode Tiles v2

## Goal

Refine the Unicode/emoji tile rendering with better glyph choices, seamless
wall rendering, a new monster roster, and a runtime toggle between ASCII and
emoji modes.

## Acceptance Criteria

### Glyph mapping updates

1. Update the shared glyph table with revised mappings:

   | Entity       | Current | New glyph | Notes                  |
   |--------------|---------|-----------|------------------------|
   | Player       | `@`     | `@`       | Keep — dark bg, golden fg |
   | Wall         | `█`     | `██`      | Two consecutive full blocks, no gap |
   | Floor        | `·`     | ` ` (blank) | Empty space — walls define the shape |
   | Rat          | `r`     | `🐀`      | Emoji, double-width    |
   | Skeleton     | `s`     | `💀`      | Emoji, double-width    |
   | Bear         | `b`     | `🐻`      | Emoji, double-width    |
   | Dragon       | `d`     | `🐉`      | Emoji, double-width    |
   | Food         | `%`     | `🍎`      | Emoji, double-width    |

### Monster roster

2. Replace the monster types (Goblin/Orc/Troll → Skeleton/Bear/Dragon).
   Update monster definitions in `src/game.js` — names, ASCII chars, colors,
   and stats should scale similarly to the old set (Rat weakest, Dragon
   strongest). Keep the same spawn logic and stat progression curve.

### TUI renderer (`cli.js`)

3. The player `@` renders with a dark/muted background (e.g., dark brown or
   dark amber) and a golden/yellow foreground — not the current bright yellow
   background which is too loud.

4. Wall tiles render as `██` (two full-block characters) filling the entire
   2-column cell with no gaps, creating seamless solid walls.

5. Floor tiles render as blank space (two spaces) — walls already define
   room and corridor shapes clearly.

### Web renderer (`index.html`)

6. Tile size is increased from 18px to 24px (font from 16px to 22px) so
   emoji render clearly.

### Runtime rendering mode toggle

7. Pressing `Tab` (or another unbound key) toggles between "classic" (ASCII,
   1-column cells) and "enhanced" (Unicode/emoji, 2-column cells) at runtime.
   The toggle re-renders immediately with no restart required.

8. The TUI recalculates viewport tile count on toggle (1-col vs 2-col).
   The web canvas re-renders with the alternate glyph set at the same tile
   size.

9. Default mode is "enhanced" (emoji). The current mode is shown in the HUD
   (e.g., `[ASCII]` or `[emoji]`).

## Out of Scope

- Sprite-based or image-based tile rendering
- Animated emoji or tile transitions
- Changes to FOV or combat mechanics
- Adding new entity types beyond the four listed

## Design Notes

- The 2-column TUI layout is compact and clean: single-width chars get a
  leading space (` X`) while emoji fill both columns naturally (`🐀`).
- At 80 columns, the TUI viewport is ~40 tiles wide. At 120 columns, ~60
  tiles. Both are more than sufficient for the existing dungeon sizes.
- Walls use `██` (two full blocks) to fill the 2-column cell completely,
  creating seamless walls with no visible gaps between adjacent wall tiles.
- Floors are blank — the walls already define room/corridor shapes clearly,
  and empty floors let emoji monsters and items stand out better.
- The player `@` uses a dark background (e.g., `\x1b[48;5;94m` dark amber)
  with golden foreground — visible but not glaring.
- For the web canvas, emoji font rendering varies by OS. The font stack
  fallback ensures coverage on Windows (Segoe UI Emoji), Linux (Noto Color
  Emoji), and macOS (Apple Color Emoji — usually automatic).

## Agent Notes

- Read the `unicode-tiles` implementation first to understand the current
  glyph table and rendering approach. This spec modifies those choices.
- The key TUI change is wall rendering (`██` instead of `█` + space) and
  the mode toggle. The toggle swaps the active glyph table and recalculates
  viewport width.
- The monster roster change touches `src/game.js` — update the monster type
  definitions (names, chars, colors, stats). Keep the same spawn and
  progression logic.
- Test in a real terminal. Verify alignment with mixed emoji and single-width
  chars on the same row, and test the toggle in both directions.
