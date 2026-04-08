---
id: gold-emoji-moneybag
title: Use 💰 emoji for gold
type: enhancement
---

# Use 💰 emoji for gold

## What

Change the gold emoji from 🪙 to 💰 in enhanced/emoji mode. This also serves as the
text fallback in sprite mode (since there is no gold sprite in `SPRITE_MAP`).

## Why

Better visual representation of gold pickups.

## Changes

- `src/glyphs.js`: In `GLYPHS_ENHANCED`, replace the gold entry's char from `\ud83e\ude99` (🪙) to `💰` (U+1F4B0). Keep `wide: true`.

## Acceptance criteria

- Emoji mode renders 💰 for gold items.
- Sprite mode falls back to 💰 for gold items (no sprite exists).
- ASCII mode still renders `$`.
- No layout shifts (emoji remains `wide: true`).
