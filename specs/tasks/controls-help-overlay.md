---
id: controls-help-overlay
status: not-started
area: web
priority: 50
depends_on: []
description: Add a toggleable help overlay showing all keyboard/touch controls so players can discover how to play
---

# Controls Help Overlay

## Goal

Players currently have no way to discover keyboard controls in-game. Add a
help overlay that lists all controls, toggled by pressing `?` or `H`, with a
`?` button in the HUD. Also show a brief first-load hint so new players know
help exists.

## Changes

### 1. Help overlay (`index.html`)

Add a new `#help-overlay` div, styled as a semi-transparent centered panel
(similar to the existing game-over overlay but with a darker semi-opaque
background). Contents:

**Movement**
- Arrow keys or WASD

**Actions**
- `P` — Use potion
- `.` or `>` — Descend stairs
- `5` — Wait a turn

**Toggles**
- `Tab` — Cycle render mode
- `M` — Toggle minimap
- `N` — Toggle sound
- `R` — Restart game

**Touch controls** (show this section on touch devices):
- Swipe to move
- Use the action buttons at the bottom

Style the overlay content as a simple two-column layout (key on left,
description on right) using monospace font, matching the game's dark theme.

### 2. Toggle behavior

- Pressing `?` or `h`/`H` toggles the overlay on/off.
- Clicking/tapping outside the content area (on the backdrop) dismisses it.
- The overlay should appear above the game-over/win overlay (use a higher
  `z-index`, e.g., 20).
- While the help overlay is visible, game input (movement, actions) should be
  suppressed — only `?`, `H`, and `Escape` should work to dismiss it.

### 3. HUD help button

Add a `?` button in the `#hud` bar (next to the existing mute button). Style
it consistently with the mute button. Clicking it toggles the help overlay.

### 4. First-load hint

On the very first page load, show a small translucent hint text near the
bottom of the canvas area: "Press ? for help". Auto-dismiss it after 4
seconds or on any keypress/touch. Use `localStorage` key
`sillyRoguelike.helpHintShown` to only show it once per browser.

### 5. CLI version (`cli.js`)

Add `?` and `h`/`H` key bindings that print a controls summary to the
terminal (below the game map), similar to the existing game-over text style.
Show it inline (not a modal) — pressing any other key dismisses it and
resumes normal play.

## Files to modify

- `index.html` — add overlay HTML/CSS, help button, keyboard handler, hint
- `cli.js` — add help key binding and inline help text

## Out of scope

- Gamepad/controller help
- Rebindable keys
- Tutorial or interactive walkthrough
