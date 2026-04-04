---
id: mobile-ux-overhaul
status: not-started
area: web
priority: 60
depends_on: []
description: Reduce tile size 20%, reorganize HUD for mobile reachability, replace swipe controls with tap-quadrant movement
---

# Mobile UX Overhaul

## Goal

Improve mobile playability by (1) shrinking tiles 20% so more map is visible,
(2) moving HUD and interactive controls to the bottom of the screen so they are
thumb-reachable, and (3) replacing swipe-based movement with tap-quadrant
("invisible cross") movement for faster, more responsive input.

## Changes

All changes are in `index.html`.

### 1. Reduce Tile & Font Size by 20%

- Change `TILE_SIZE` from `56` to `45` (56 * 0.8 = 44.8, rounded to 45).
- Change `FONT_SIZE` from `44` to `35` (44 * 0.8 = 35.2, rounded to 35).
- No other scaling changes needed — `getViewSize()` already derives cols/rows
  from `TILE_SIZE` and window dimensions, so more tiles will be visible.

### 2. Mobile HUD Reorganization (pointer: coarse only)

On touch/coarse-pointer devices, restructure the bottom of the screen so
everything is thumb-reachable. Desktop layout stays unchanged.

**Move interactive buttons to the action bar:**
- Move the **mute button** (`#mute-btn`) and **help button** (`#help-btn`)
  into the `#action-bar` on mobile (via CSS or JS relocation when
  `pointer: coarse` matches).
- Keep them in the top HUD on desktop.

**Move HUD info to the bottom (above action bar):**
- On mobile, reposition the HUD (`#hud`) to `position: fixed; bottom` just
  above the action bar, so HP, level, food, and equipment info are all
  near the player's thumbs.
- Keep the HUD compact: the existing `@media (max-width: 600px)` styles
  already reduce font sizes; ensure nothing wraps awkwardly after relocation.

**Adjust `getViewSize()`:**
- Account for both the relocated HUD height and the action bar height when
  computing available rows on mobile. The current calculation subtracts 160px
  of fixed overhead plus action bar height — update the overhead constant to
  reflect the new layout (HUD at top is gone on mobile, but HUD at bottom +
  action bar now take space from the bottom).

### 3. Replace Swipe with Tap-Quadrant Movement

Replace the current swipe-based touch controls with a tap-quadrant system.
The canvas is conceptually divided into four triangular regions by its two
diagonals:

```
  ┌───────────────┐
  │ ╲     N     ╱ │
  │   ╲       ╱   │
  │     ╲   ╱     │
  │  W    ╳    E  │
  │     ╱   ╲     │
  │   ╱       ╲   │
  │ ╱     S     ╲ │
  └───────────────┘
```

**Implementation:**
- On `touchstart`, record the touch position.
- On `touchend`, check if the touch moved less than a small threshold (~15px)
  — this is a **tap** (not a drag/scroll).
- For a tap, compute the touch position relative to the canvas center.
- Determine the quadrant by comparing `|dx|` vs `|dy|`:
  - `|dy| > |dx|` and `dy < 0` → North
  - `|dy| > |dx|` and `dy > 0` → South
  - `|dx| > |dy|` and `dx > 0` → East
  - `|dx| > |dy|` and `dx < 0` → West
- Dispatch the corresponding `{ type: 'move', dir: ... }` action.
- Remove the old swipe detection logic (threshold=30, delta-based direction).
- Keep `e.preventDefault()` on touch events to prevent scrolling.
- Keep audio initialization on first touch.

### 4. Visual Tap Feedback (optional but recommended)

Briefly flash a subtle directional indicator (e.g., a translucent arrow or
highlight on the tapped quadrant) for ~150ms so the player gets visual
confirmation of their tap direction. Keep it minimal — a semi-transparent
overlay drawn on the canvas, not a DOM element.

## Files to Modify

- `index.html` — all changes (tile constants, CSS layout, JS touch handlers,
  HUD relocation logic).

## Files NOT to Modify

- `src/game.js`, `src/glyphs.js`, `src/audio.js`, `src/map.js` — unchanged.

## Verification

- [ ] Tiles render at 45x45 px (visually ~20% smaller than before).
- [ ] Emoji and ASCII render modes scale proportionally with new FONT_SIZE.
- [ ] More tiles are visible on screen compared to before.
- [ ] On mobile: HUD appears at the bottom, above the action bar.
- [ ] On mobile: mute and help buttons are in the action bar, thumb-reachable.
- [ ] On desktop: HUD and buttons remain in their original top position.
- [ ] Tapping a canvas quadrant moves the player in the correct direction.
- [ ] Taps near the center (ambiguous zone) still resolve to a direction.
- [ ] Old swipe logic is fully removed.
- [ ] Action bar buttons (Food, Descend, Wait, Mute, Help) all work on mobile.
- [ ] Canvas viewport correctly accounts for bottom HUD + action bar height.
- [ ] No layout overflow or wrapping on small screens (test ~375px width).
- [ ] All existing keyboard controls still work unchanged on desktop.
