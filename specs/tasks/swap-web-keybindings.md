---
id: swap-web-keybindings
status: not-started
area: frontend
priority: 80
depends_on: []
description: Swap minimap and render-mode keyboard shortcuts in the web frontend
---

# Swap Web Keybindings: Minimap and Render Mode

## Goal

Make the web frontend's keyboard shortcuts consistent with the TUI: Tab toggles
emoji/ASCII render mode, and M toggles the minimap overlay.

## Acceptance Criteria

1. In `index.html`, pressing **M** toggles minimap visibility (previously Tab).
2. In `index.html`, pressing **Tab** toggles emoji/ASCII render mode (previously M).
3. Both uppercase and lowercase **m** trigger the minimap toggle.
4. Tab's `e.preventDefault()` is preserved to avoid focus changes.
5. TUI (`cli.js`) is unchanged — it already uses Tab for render mode and has no minimap.

## Out of Scope

- Adding a minimap to the TUI.
- Changing any other keybindings.
- Adding user-configurable key remapping.

## Design Notes

The change is a swap of the two key handlers in `index.html` around lines 351-364:

- The `e.key === 'Tab'` block should call `toggleRenderMode()` + `render()`.
- The `e.key === 'm' || e.key === 'M'` block should toggle `minimapVisible` + `render()`.

## Agent Notes

- Read `index.html` lines 349-395 for the full keydown handler.
- This is a ~4-line change — just swap the bodies of the two `if` blocks.
