---
id: remove-hero-bg-color
status: not-started
area: rendering
priority: 70
depends_on: []
description: Remove the dark amber background highlight from the hero's tile in both CLI and web renderers
---

# Remove Hero Background Color

## Goal

Remove the background color applied to the hero's tile so only the golden
foreground glyph is drawn, matching the style of other entities on the board.

## Changes

### 1. CLI renderer (`cli.js`)

- Remove the `PLAYER_BG` constant (line ~27).
- In the `isPlayer` branch (line ~175), stop emitting `PLAYER_BG` — render
  the player with `PLAYER_FG` only (the default black background is fine).

### 2. Web renderer (`index.html`)

- Remove `COLORS.playerBg` (line ~441).
- In the `isPlayer` branch (lines ~635-640), remove the `fillRect` call that
  draws the amber background rectangle behind the player glyph.

## Out of Scope

- Changing the player foreground color.
- Adding any replacement highlight (outline, pulse, etc.).
