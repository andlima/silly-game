---
id: fov-contrast
status: not-started
area: rendering
priority: 70
depends_on: []
description: Improve FOV visibility radius contrast so the boundary between visible, revealed, and hidden tiles is easier to read
---

# FOV Visibility Contrast

## Goal

The current FOV brightness scaling (0.3–1.0) and revealed-tile desaturation
produce colors that clash with the dark map tiles, making it hard to distinguish:

- Dim visible tiles at the FOV edge from the black background
- Dim visible tiles from revealed (explored-but-not-visible) tiles

Fix the contrast in both the web renderer (`index.html`) and CLI renderer
(`cli.js`) so the FOV boundary is visually crisp.

## Problem Analysis

- **Floors at min brightness are invisible**: `#1a1a1a * 0.3 = rgb(8,8,8)` vs
  background `#0a0a0a` — effectively identical.
- **Walls at min brightness ≈ revealed walls**: visible `rgb(17,17,22)` vs
  revealed `rgb(30,35,53)` — both dark blue-grey, hard to tell apart.
- The `revealedColor()` blue-grey tint overlaps with the wall palette's
  blue-grey tones, reducing the distinction further.

## Changes

### 1. Raise the brightness floor (`src/fov.js`)

In the `brightness()` function (line 22), raise the minimum from `0.3` to
`0.45` so edge-of-FOV tiles stay readable:

```js
// Before
const b = 1.0 - (distance / radius) * 0.7;
return Math.max(0.3, Math.min(1.0, b));

// After
const b = 1.0 - (distance / radius) * 0.55;
return Math.max(0.45, Math.min(1.0, b));
```

This keeps center tiles at 1.0 and raises the dimmest visible tile to ~0.45,
giving floors `rgb(12,12,12)` — still dim but distinguishable from `#0a0a0a`.

### 2. Adjust `revealedColor()` in `index.html`

Make revealed tiles darker and more uniformly grey (less blue) to separate them
from dim-but-visible tiles:

```js
// Before
const rr = Math.round(grey * 0.15 + 20);
const gg = Math.round(grey * 0.15 + 25);
const bb = Math.round(grey * 0.2 + 40);

// After — darker, more neutral grey
const rr = Math.round(grey * 0.08 + 14);
const gg = Math.round(grey * 0.08 + 14);
const bb = Math.round(grey * 0.10 + 18);
```

This makes revealed tiles a subtle neutral dark grey instead of blue-grey,
creating a clear visual break from the warm/lit visible tiles.

### 3. Adjust CLI palettes (`cli.js`)

Update the CLI ANSI 256-color palettes to match the improved contrast:

- **`WALL_SHADES_DIM`**: Shift to slightly brighter values so dim-visible walls
  are readable (e.g. `[59, 60, 66, 67]` instead of `[23, 24, 59, 60]`).
- **`WALL_SHADES_REMEMBERED`**: Shift darker (e.g. `[234, 235, 236, 237]`)
  to separate from dim-visible walls.
- **`FLOOR_SHADES`**: Ensure the lowest index (`233`) is still distinguishable
  from terminal black.

### 4. Optional: Lighten base floor colors (`index.html`)

If the above changes aren't sufficient, bump floor shades slightly:

```js
// From
const FLOOR_SHADES = ['#1a1a1a', '#1c1c1c', '#1e1e1e'];
// To
const FLOOR_SHADES = ['#222222', '#242424', '#262626'];
```

This gives `scaleColor` more headroom at low brightness values.

## Out of Scope

- FOV algorithm (shadowcasting logic, radius size)
- New visibility states or mechanics
- Sprite-mode rendering changes (sprites use alpha/grayscale filter, not color math)
- Minimap colors

## Verification

- Walk around a dungeon level and confirm:
  - The FOV edge is clearly visible against the black background
  - Revealed tiles look distinct from both visible and hidden tiles
  - Wall and floor colors still feel cohesive within the lit area
- Test in both web (text mode) and CLI renderers
