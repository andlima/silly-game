---
id: sprite-web-ui
status: superseded
area: web
priority: 50
depends_on: []
description: New canvas-based web UI using sprite sheet images instead of text/emoji rendering
superseded_by: consolidate-html
---

# Sprite-Based Web UI

> **Superseded by `consolidate-html`.** `sprite.html` has been merged into
> `index.html` as a single entry point with sprite, emoji, and ASCII modes.

## Goal

Create a new standalone web page (`sprite.html`) that renders the game using
sprite images from a sprite sheet, functionally equivalent to the existing
emoji/ASCII canvas renderer in `index.html`.

## Sprite Sheet

The sprite sheet is `assets/roguelike-sprites.png` (copy from
`~/roguelike-sprites.png`). It is a 4x3 grid of equally-sized sprite cells:

| | Col 0 | Col 1 | Col 2 | Col 3 |
|---|---|---|---|---|
| **Row 0** | player (mage) | potion (apple) | rat | skeleton (skull) |
| **Row 1** | wall (dark stone) | bear | dragon | stair (stone steps) |
| **Row 2** | dagger | sword | helmet | shield |

Sprite cell size should be computed dynamically from the image dimensions
(width / 4, height / 3).

## Changes

### 1. Add Sprite Sheet Asset

- Create `assets/` directory.
- Copy `~/roguelike-sprites.png` into `assets/roguelike-sprites.png`.

### 2. Create `sprite.html`

A new standalone HTML file modeled on `index.html` with these differences:

**Rendering:**
- Load the sprite sheet image on startup.
- Define a sprite coordinate map: entity name to `{ col, row }` matching the
  grid above.
- Render each tile using `ctx.drawImage()` with source rectangles from the
  sprite sheet, scaled to `TILE_SIZE`.
- Floor tiles: fill with a dark background color (e.g. `#1a1a1a`), no sprite.
- FOV brightness: use `ctx.globalAlpha` set to the cell's brightness value
  before drawing sprites. Revealed-but-not-visible tiles should be drawn at
  low alpha (~0.3) and optionally desaturated (grayscale filter).
- Hidden tiles: draw nothing (leave as canvas background).

**Preserved from `index.html` (functionally equivalent):**
- HUD (HP bar, level, potions, equipment display).
- Message log with opacity fade.
- Minimap overlay (toggle with `m`).
- All keyboard input handling (movement, descend, potion, wait, restart,
  sound toggle, render mode toggle via Tab).
- Audio integration (move, attack, pickup, descend, hurt, die sounds).
- Game-over and win overlay screens.
- Responsive canvas sizing on window resize.

**Render mode toggle (Tab):**
- Cycle through: sprite -> emoji -> ASCII -> sprite.
- When in emoji/ASCII mode, fall back to text rendering (same as `index.html`).
- When in sprite mode, use `drawImage()`.

### 3. Import Structure

- Import game engine from `src/game.js` (`createGame`, `dispatch`,
  `getVisibleTiles`).
- Import glyphs from `src/glyphs.js` (for emoji/ASCII fallback modes).
- Import audio from `src/audio.js`.

## Files to Create

- `assets/roguelike-sprites.png` — sprite sheet (copied from user's file)
- `sprite.html` — new standalone renderer

## Files NOT to Modify

- `index.html` — existing renderer stays unchanged.
- `src/glyphs.js` — no changes to shared glyph system.
- `cli.js` — terminal UI stays unchanged.

## Acceptance Criteria

- [ ] Sprite sheet is committed at `assets/roguelike-sprites.png`.
- [ ] `sprite.html` loads and renders the game using sprites from the sheet.
- [ ] All 12 sprite types render at correct grid positions from the sheet.
- [ ] Floor tiles render as a solid dark background color.
- [ ] FOV lighting dims sprites via alpha; revealed tiles are dim; hidden
      tiles are not drawn.
- [ ] HUD, message log, minimap, overlays all work as in `index.html`.
- [ ] Keyboard input (movement, shortcuts) works identically to `index.html`.
- [ ] Audio plays on game events.
- [ ] Tab cycles through sprite/emoji/ASCII render modes.
- [ ] Window resize adjusts canvas and viewport correctly.
