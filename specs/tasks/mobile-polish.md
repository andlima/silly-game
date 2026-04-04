---
id: mobile-polish
status: not-started
area: web
priority: 70
depends_on: []
description: Shrink tiles 10%, add minimap/render-mode buttons to mobile action bar, remove triangle tap feedback
---

# Mobile Polish

## Goal

Three small mobile-focused improvements: slightly smaller tiles for more map
visibility, expose minimap and render-mode toggles on mobile, and remove the
distracting triangle flash on tap.

## Changes

All changes are in `index.html`.

### 1. Reduce Tile & Font Size by ~10%

- Change `TILE_SIZE` from `45` to `40` (line 268).
- Change `FONT_SIZE` from `35` to `32` (line 269).
- No other scaling changes needed — `getViewSize()` derives cols/rows from
  `TILE_SIZE` and window dimensions, so more tiles will automatically be visible.
- The minimap scale (`MINIMAP_SCALE = 3`) stays the same.

### 2. Add Minimap & Render-Mode Buttons to Mobile Action Bar

Currently minimap toggle (M) and render-mode cycling (Tab) are keyboard-only.
Add two buttons to the `#action-bar` so mobile users can access them.

**Minimap toggle button:**
- Label: "Map" (text, not emoji).
- On tap: toggle `minimapVisible` and re-render (same logic as the M key handler
  at lines 821-827).

**Render-mode cycle button:**
- Label: show current mode — "Emoji", "Sprite", or "ASCII".
- On tap: call `cycleRenderMode()` and re-render (same logic as the Tab key
  handler at lines 813-819).
- Update button label after each cycle to reflect the new mode.

**Placement:** insert both buttons into the action bar alongside the existing
buttons. Add them via JS in the existing `if (isCoarsePointer)` block
(around line 894) — same pattern used for mute/help button relocation. Style
them identically to the other action-bar buttons (min 44px touch target, same
colors/border/padding).

### 3. Remove Triangle Tap Feedback

Delete the triangle-shape directional overlay that flashes on mobile taps.

**Remove:**
- The `tapFeedback` variable declaration (search for `let tapFeedback`).
- The rendering block at lines 687-708 (the `if (tapFeedback) { ... }` canvas
  drawing code).
- The feedback assignment and setTimeout in the touch handler (lines 952-954):
  ```js
  tapFeedback = { dir, startTime: performance.now() };
  render();
  setTimeout(() => { tapFeedback = null; render(); }, 150);
  ```
  Remove all three lines. The `render()` call after `dispatchAndPlay` (if any)
  handles redraw; if there is no subsequent render call, add one after
  `dispatchAndPlay`.

## Files to Modify

- `index.html` — all changes (tile constants, action bar buttons, tap feedback removal).

## Files NOT to Modify

- `src/game.js`, `src/glyphs.js`, `src/audio.js`, `src/map.js`, `src/dungeon.js`, `src/fov.js` — unchanged.

## Verification

- [ ] Tiles render at 40x40 px; font size is 32px.
- [ ] Sprite and emoji render modes scale correctly with the new sizes.
- [ ] More tiles are visible on screen compared to before (was 45px).
- [ ] On mobile: "Map" button in action bar toggles minimap on/off.
- [ ] On mobile: render-mode button shows current mode and cycles through emoji/sprite/ASCII on tap.
- [ ] Render-mode button label updates to reflect the active mode after each tap.
- [ ] Triangle tap feedback overlay no longer appears on mobile taps.
- [ ] `tapFeedback` variable and related code are fully removed (no dead code).
- [ ] All existing keyboard controls (M, Tab, etc.) still work on desktop.
- [ ] No layout overflow or wrapping on small screens (~375px width).
- [ ] Action bar buttons all have consistent styling and min 44px touch targets.
