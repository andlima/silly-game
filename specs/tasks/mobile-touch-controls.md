---
id: mobile-touch-controls
status: not-started
area: web
priority: 50
depends_on: [sprite-web-ui]
description: Add touch controls to sprite.html so the game is playable on mobile phones
---

# Mobile Touch Controls

## Goal

Make `sprite.html` playable on mobile phones by adding touch-based input
(swipe gestures for movement, action buttons for other commands) and
preventing common mobile annoyances (accidental zoom, scroll bounce).

## Changes

### 1. Swipe Gestures on the Canvas

- Listen for `touchstart` / `touchend` events on the canvas element.
- Track the start position on `touchstart` and compute the delta on `touchend`.
- If the swipe distance exceeds a minimum threshold (~30px), determine the
  dominant axis (horizontal vs vertical) and dispatch a move action:
  - Swipe up -> `{ type: 'move', dir: 'n' }`
  - Swipe down -> `{ type: 'move', dir: 's' }`
  - Swipe left -> `{ type: 'move', dir: 'w' }`
  - Swipe right -> `{ type: 'move', dir: 'e' }`
- Short taps (below threshold, minimal movement) should be ignored — they
  are not a directional input.
- Call `e.preventDefault()` on touch events on the canvas to prevent
  scrolling during swipes.
- Initialize audio on first touch interaction (same pattern as first keydown).

### 2. Action Button Bar

- Add a fixed-position action bar at the bottom of the screen, visible only
  on touch-capable devices (detect via `'ontouchstart' in window` or
  media query `(pointer: coarse)`).
- The bar should contain three buttons:
  - **Potion** — dispatches `{ type: 'usePotion' }`. Label: a potion/heal
    icon or the text "Potion".
  - **Descend** — dispatches `{ type: 'descend' }`. Label: a stairs/down
    icon or the text "Descend".
  - **Wait** — dispatches `{ type: 'wait' }`. Label: an hourglass icon or
    the text "Wait".
- Style the buttons for easy tapping: minimum 44x44px touch targets, clear
  contrast against the dark background, consistent with the existing HUD
  aesthetic (dark theme, monospace, muted colors).
- Each button should call `dispatchAndPlay()` with the appropriate action.

### 3. Prevent Mobile Browser Annoyances

- Add `touch-action: none` CSS on the canvas to prevent browser gestures
  (scroll, pinch-zoom) while swiping on the game area.
- Add `overflow: hidden` on `body` / `html` to prevent scroll bounce.
- The existing viewport meta tag (`width=device-width, initial-scale=1.0`)
  is already present; optionally add `user-scalable=no, maximum-scale=1` to
  prevent accidental zoom.
- Prevent double-tap zoom on the action buttons (CSS `touch-action:
  manipulation` on the buttons).

### 4. Responsive Layout Adjustments

- When the viewport width is below 600px (mobile breakpoint):
  - Hide the minimap by default (user can still toggle with keyboard if
    connected, but it saves screen space).
  - Reduce HUD font sizes and shorten equipment labels if needed so the HUD
    doesn't wrap awkwardly.
  - Account for the action bar height when computing the canvas viewport
    size (`getViewSize()` should subtract the action bar height from
    available space).

## Files to Modify

- `sprite.html` — all changes are in this file (touch handlers, action bar
  HTML/CSS, responsive tweaks).

## Files NOT to Modify

- `index.html` — not in scope.
- `src/game.js` — game engine is unchanged; all existing actions are reused.
- `src/glyphs.js`, `src/audio.js`, `src/map.js` — no changes needed.

## Acceptance Criteria

- [ ] Swiping on the canvas moves the player in the correct direction.
- [ ] Swipes below the minimum threshold are ignored (no accidental moves).
- [ ] Action bar with Potion, Descend, and Wait buttons is visible on
      touch devices.
- [ ] Action bar is hidden on desktop (keyboard-only) devices.
- [ ] Each action button dispatches the correct game action and plays audio.
- [ ] The canvas does not scroll or zoom on touch interactions.
- [ ] The page does not exhibit scroll bounce or accidental zoom on mobile.
- [ ] Audio initializes on first touch (not just first keydown).
- [ ] Minimap is hidden by default on narrow viewports (<600px).
- [ ] Canvas viewport accounts for action bar height on mobile.
- [ ] All existing keyboard controls still work unchanged.
