---
id: fov-floor-wall-shading
status: not-started
area: rendering
priority: 65
depends_on: []
description: Swap floor/wall brightness so floors are lighter than walls in FOV, matching roguelike convention
---

# FOV Floor/Wall Shading Fix

## Goal

Visible floors should be **lighter** than visible walls, matching the standard
roguelike convention where walkable space feels "lit" and walls feel like dark
boundaries. Currently the shading is inverted — walls are more prominent than
floors, making the map harder to read at a glance.

## Problem Analysis

### Web renderer (`index.html`)

- `WALL_SHADES`: `['#3a3a4a', '#40405a', '#4a4a5a']` — mid-grey with blue tint,
  relatively bright
- `FLOOR_SHADES`: `['#222222', '#242424', '#262626']` — very dark neutral grey

Walls are significantly brighter than floors. After `scaleColor()` applies the
brightness multiplier, this gap persists across the full FOV radius.

### CLI renderer (`cli.js`)

- `WALL_SHADES_BRIGHT`: `[59, 60, 66, 67]` — blue-grey, moderate brightness
- `FLOOR_SHADES`: `[233, 234, 235, 236]` — near-black greys

Same issue: walls dominate visually while floors nearly disappear.

## Changes

### 1. Web floor/wall palettes (`index.html`)

Brighten `FLOOR_SHADES` and darken `WALL_SHADES` so floors are the lighter
element:

```js
// Before
const WALL_SHADES  = ['#3a3a4a', '#40405a', '#4a4a5a'];
const FLOOR_SHADES = ['#222222', '#242424', '#262626'];

// After — floors lighter, walls darker
const WALL_SHADES  = ['#28283a', '#2c2c3e', '#303042'];
const FLOOR_SHADES = ['#383838', '#3c3c3c', '#404040'];
```

Floors become a clean warm-neutral grey; walls become darker with their existing
blue tint retained for visual distinction.

### 2. CLI floor/wall palettes (`cli.js`)

Adjust ANSI 256-color values to match:

```js
// Before
const WALL_SHADES_BRIGHT = [59, 60, 66, 67];
const FLOOR_SHADES       = [233, 234, 235, 236];

// After — floors lighter, walls darker
const WALL_SHADES_BRIGHT = [236, 237, 238, 239];
const FLOOR_SHADES       = [240, 241, 242, 243];
```

Floor shades should be lighter (higher ANSI grey values) than wall shades.

**Note:** The exact color values above are a starting point. The implementer
should visually verify in both renderers and adjust if needed to ensure:
- Floors are clearly lighter than walls within the visible FOV
- The palette still looks cohesive and atmospheric
- Revealed (out-of-FOV) tiles remain clearly distinct from visible tiles

### 3. Sprite mode background (`index.html`)

In `renderSpriteMode()`, the background fill for visible floor tiles should also
reflect the lighter floor shade so sprite and text modes feel consistent.

## Out of Scope

- FOV algorithm or radius changes
- Brightness falloff curve (already tuned by `fov-contrast`)
- Revealed/hidden tile shading (already tuned by `fov-contrast`)
- New tile types or visibility states
- Minimap colors

## Verification

- Walk around a dungeon and confirm floors look brighter than walls in the lit FOV area
- Walls should still be clearly visible as boundaries, just not the brightest element
- Revealed (explored but not visible) tiles should remain distinct from both
- Test in web text mode, web sprite mode, and CLI renderer
