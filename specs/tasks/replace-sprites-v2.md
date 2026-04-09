---
id: replace-sprites-v2
status: not-started
area: web
priority: 50
depends_on: []
description: Replace roguelike-sprites.png with the v2 sprite sheet
---

# Replace Sprites with V2

## Goal

Swap the current sprite sheet (`assets/roguelike-sprites.png`) with the updated
v2 version (`assets/roguelike-sprites-v2.png`). The new sheet has the same
dimensions (731x720), same 4x3 grid layout, and same sprite positions — it is a
pure visual refresh with no structural changes.

## Changes

### 1. Replace the Asset File

- Copy `assets/roguelike-sprites-v2.png` over `assets/roguelike-sprites.png`
- Delete `assets/roguelike-sprites-v2.png` (the old name is what the code references)

### 2. Verify — No Code Changes

The sprite sheet is loaded in `index.html` (~line 384) as `assets/roguelike-sprites.png`.
The grid is sliced dynamically based on image dimensions (4 cols, 3 rows). Since
the v2 file matches the original dimensions and layout exactly, no code changes
are required. The `SPRITE_MAP` in `index.html` (~lines 414-427) remains correct.

## Out of Scope

- Adding new sprites or changing the grid layout
- Modifying tile size, sprite cache, or rendering logic
- Updating fallback glyphs
