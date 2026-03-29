---
id: unicode-tiles
status: not-started
area: full-stack
priority: 60
depends_on:
  - visual-polish
description: Replace ASCII glyphs with Unicode symbols and emoji for richer tile rendering
---

# Unicode Tiles

## Goal

Replace plain ASCII characters with Unicode symbols and emoji to give the game
a richer visual identity. Both the TUI and web renderers get upgraded glyphs,
with the TUI using a 3-column-per-tile layout to accommodate double-width
emoji.

## Acceptance Criteria

### Glyph mapping

1. A shared glyph table maps logical tile/entity types to display characters.
   At minimum:

   | Entity       | Current | New glyph | Notes                  |
   |--------------|---------|-----------|------------------------|
   | Player       | `@`     | `@`       | Keep — it's iconic     |
   | Wall         | `#`     | `█` or connected box-drawing | Single-width block |
   | Floor        | `.`     | `·` (middle dot U+00B7) | Single-width       |
   | Stair down   | `>`     | `▼` or `🪜` | Prefer single-width `▼` in TUI |
   | Rat          | `r`     | `🐀`      | Emoji, double-width    |
   | Goblin       | `g`     | `👺`      | Emoji, double-width    |
   | Orc          | `o`     | `👹`      | Emoji, double-width    |
   | Troll        | `T`     | `🧌`      | Emoji, double-width    |
   | Potion       | `!`     | `🧪`      | Emoji, double-width    |

   The exact emoji choices may be adjusted during implementation as long as
   each entity has a distinct, recognizable glyph.

2. The glyph table lives in a shared module (e.g., `src/glyphs.js`) so both
   renderers use the same mapping and it can be extended easily.

3. Each entry in the glyph table includes a `wide: true/false` flag indicating
   whether the glyph occupies two terminal columns.

### TUI renderer (`cli.js`)

4. Every tile cell is rendered as exactly 2 terminal columns:
   - Single-width glyph: ` X` (leading space + char)
   - Double-width (emoji) glyph: `🐀` (emoji fills both columns)

   This keeps the grid perfectly aligned regardless of glyph width.

5. The viewport tile count is recalculated based on the 2-column cell width
   (roughly `floor(columns / 2)` tiles across).

6. Colors still apply — ANSI color codes wrap the glyph as before. Emoji
   render in their native colors (no ANSI color override needed for them).

### Web renderer (`index.html`)

7. The canvas renders the new glyphs using the same `fillText` approach.
   Tile size may be increased (e.g., from 18 to 24 px) if emoji render too
   small at the current size.

8. Emoji are centered within their tile rect. If the default monospace font
   renders emoji poorly, a fallback font stack can be specified (e.g.,
   `"Segoe UI Emoji", "Noto Color Emoji", monospace`).

### Rendering mode toggle (stretch goal)

9. A toggle between "classic" (ASCII) and "enhanced" (Unicode/emoji) mode,
   stored in a simple config or query param for web / command-line flag for
   CLI. If not implemented, default to enhanced mode.

## Out of Scope

- Sprite-based or image-based tile rendering
- Animated emoji or tile transitions
- Changes to game logic, FOV, or combat mechanics
- Adding new entity types — this spec only re-skins existing ones

## Design Notes

- The 2-column TUI layout is compact and clean: single-width chars get a
  leading space (` X`) while emoji fill both columns naturally (`🐀`).
- At 80 columns, the TUI viewport is ~40 tiles wide. At 120 columns, ~60
  tiles. Both are more than sufficient for the existing dungeon sizes.
- `visual-polish` already changes wall tiles to `█` and floors to `·` in the
  CLI. This spec extends that by moving the glyph table to a shared module,
  adding emoji for entities, and adopting the 3-column grid.
- For the web canvas, emoji font rendering varies by OS. The font stack
  fallback ensures coverage on Windows (Segoe UI Emoji), Linux (Noto Color
  Emoji), and macOS (Apple Color Emoji — usually automatic).

## Agent Notes

- Read `visual-polish` spec and its implementation first — the wall/floor
  glyphs there overlap with this spec. Extend rather than duplicate that work.
- The key TUI change is the cell-width logic. Search for where the output
  string is built character by character in `cli.js` and replace direct char
  concatenation with a helper that pads to 2 columns based on the `wide` flag.
- Test in a real terminal (not just the web preview). Verify alignment with
  mixed emoji and single-width chars on the same row.
- The `getVisibleTiles` function in `src/game.js` returns tile/entity data —
  it does not need to change. Only the rendering layer maps entities to glyphs.
