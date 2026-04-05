---
id: fov-warm-cool-tighter
status: not-started
area: rendering
priority: 65
depends_on: []
description: Tint floors warm/yellow and walls cool/blue for stronger contrast, and reduce FOV radius from 8 to 6
---

# Warm/Cool Floor-Wall Tinting & Tighter FOV

## Goal

Increase the visual contrast between floors and walls by giving them distinct
color temperatures — warm yellow-ish floors and cool blue-ish walls — and reduce
the FOV radius from 8 to 6 for a tighter, more atmospheric feel.

## Changes

### 1. Reduce FOV radius (`src/fov.js`)

Change `TORCH_RADIUS` from `8` to `6`:

```js
// Before
const TORCH_RADIUS = 8;

// After
const TORCH_RADIUS = 6;
```

### 2. Web floor/wall palettes (`index.html`)

Replace the current neutral shades with warm-tinted floors and cooler-tinted
walls:

```js
// Before
const WALL_SHADES  = ['#28283a', '#2c2c3e', '#303042'];
const FLOOR_SHADES = ['#383838', '#3c3c3c', '#404040'];

// After — warm yellow floors, cool blue walls
const WALL_SHADES  = ['#222238', '#26263c', '#2a2a40'];
const FLOOR_SHADES = ['#3a3828', '#3e3c2c', '#424030'];
```

Walls shift darker and more distinctly blue; floors shift to a warm
yellow-stone tone. The brightness relationship (floors lighter than walls)
is preserved.

### 3. CLI floor/wall palettes (`cli.js`)

Replace the grey-scale ANSI 256 codes with tinted equivalents:

**Walls** — use blue-grey 256-color codes instead of pure greys:

```js
// Before (pure grey)
const WALL_SHADES_REMEMBERED = [232, 233, 234, 235];
const WALL_SHADES_DIM        = [236, 237, 238, 239];
const WALL_SHADES_BRIGHT     = [240, 241, 242, 243];

// After (blue-grey tints from the 6x6x6 color cube)
const WALL_SHADES_REMEMBERED = [234, 235, 236, 237];
const WALL_SHADES_DIM        = [59, 60, 60, 66];
const WALL_SHADES_BRIGHT     = [66, 67, 67, 103];
```

**Floors** — use yellow-ish 256-color codes:

```js
// Before (pure grey)
const FLOOR_SHADES = [244, 245, 246, 247];

// After (warm yellow-grey tints from the 6x6x6 color cube)
const FLOOR_SHADES = [58, 94, 100, 136];
```

**Note:** The exact ANSI color codes are a starting point. The implementer
should visually verify in the terminal and adjust to ensure warm/cool tints
are visible without being garish. The key constraint is that floors should
read as warm/yellow-ish and walls as cool/blue-ish.

## Out of Scope

- FOV algorithm logic (shadowcasting, octant processing)
- Brightness falloff curve
- Revealed/hidden tile shading
- Sprite-mode rendering (sprites use image tinting, not palette colors)
- Minimap colors
- Stair or entity colors

## Verification

- Walk around a dungeon and confirm:
  - Floors have a visible warm/yellow tint
  - Walls have a visible cool/blue tint
  - The contrast between floor and wall is immediately obvious
  - The tighter FOV (radius 6) feels more claustrophobic but still playable
- Test in both web (text mode) and CLI renderers
