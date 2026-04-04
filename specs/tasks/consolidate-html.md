---
id: consolidate-html
status: not-started
area: web
priority: 60
depends_on: []
description: Merge sprite.html into index.html as a single entry point, default to emoji mode, and fix rendering performance issues
---

# Consolidate HTML & Rendering Performance

## Problem

The game has two separate HTML entry points (`index.html` and `sprite.html`) with
heavily duplicated code. `sprite.html` is a strict superset of `index.html` — it
has everything `index.html` has plus sprite rendering, touch controls, and a mobile
action bar. Maintaining two files is unnecessary. Additionally, the sprite renderer
has several per-frame performance issues worth fixing during consolidation.

## Requirements

### 1. Single entry point

Replace `index.html` with the content of `sprite.html`, then delete `sprite.html`.
The title should remain "Silly Roguelike" (drop the "(Sprite)" suffix).

### 2. Default to emoji mode

Change the initial `renderMode` from `'sprite'` to `'emoji'`. The 3-mode Tab cycle
becomes **emoji → sprite → ASCII** (instead of sprite → emoji → ASCII). Ensure
`glyphs.js` starts in `'enhanced'` mode (it already does by default), so emoji
glyphs are active on load.

### 3. Performance fixes

Apply these fixes in the consolidated `index.html`:

#### 3a. Cache HUD DOM references

The `render()` function calls `document.getElementById()` for `hp-bar-fill`,
`hp-bar-text`, `hud-level`, `hud-potions`, and `hud-equipment` on every frame.
Cache these in variables at script init (alongside the existing cached refs like
`canvas`, `ctx`, `modeEl`, etc.).

#### 3b. Batch canvas save/restore in sprite mode

`renderSpriteMode()` calls `ctx.save()` / `ctx.restore()` on every visible tile
(~150 per frame). Restructure to batch by visibility pass:

- One save/restore block for all revealed tiles (set `globalAlpha: 0.3` and
  `filter: 'grayscale(100%)'` once, draw all revealed walls/stairs, then restore).
- One save/restore block per brightness level for visible tiles, or set
  `globalAlpha` directly without save/restore (since only `globalAlpha` changes
  between tiles — no filter is used for visible tiles).

The key insight: for visible tiles only `globalAlpha` varies, so just set it
directly per tile instead of save/restore. Reserve save/restore for the revealed
pass where `filter` is also changed.

#### 3c. Pre-compute monster positions for minimap

The minimap loop calls `game.monsters.some(m => m.x === x && m.y === y)` for every
revealed tile — O(tiles × monsters). Before the minimap loop, build a `Set` of
monster position keys (e.g., `"x,y"`) and use `.has()` for O(1) lookups.

#### 3d. Single FOV lookup in getVisibleTiles (`src/game.js`)

In `getVisibleTiles()`, the code does:
```js
const isVisible = fov && fov.has(key);   // first lookup
const bright = isVisible ? fov.get(key) : 0;  // second lookup
```
Replace with a single `.get()`:
```js
const bright = fov ? (fov.get(key) ?? 0) : 0;
const isVisible = bright > 0;
```

### 4. Update references to `sprite.html`

Update any spec files under `specs/` that reference `sprite.html` to point to
`index.html` instead, or note that `sprite.html` no longer exists. Affected files:

- `specs/tasks/sprite-web-ui.md` — mark as superseded by this spec
- `specs/tasks/double-tile-size.md` — change `sprite.html` → `index.html`
- `specs/tasks/mobile-touch-controls.md` — change `sprite.html` → `index.html`
- `specs/tasks/controls-help-overlay.md` — change `sprite.html` → `index.html`

## Files to modify

- `index.html` — replace with consolidated content from `sprite.html` (with changes above)
- `sprite.html` — delete
- `src/game.js` — single FOV lookup fix in `getVisibleTiles()`
- `specs/tasks/sprite-web-ui.md` — mark superseded
- `specs/tasks/double-tile-size.md` — update `sprite.html` references
- `specs/tasks/mobile-touch-controls.md` — update `sprite.html` references
- `specs/tasks/controls-help-overlay.md` — update `sprite.html` references

## Verify

- [ ] Only `index.html` exists at the repo root (no `sprite.html`)
- [ ] Opening `index.html` in a browser starts in **emoji** render mode
- [ ] Tab cycles through emoji → sprite → ASCII → emoji
- [ ] Sprite mode renders correctly using `assets/roguelike-sprites.png`
- [ ] Touch controls and mobile action bar work (on touch devices / `pointer: coarse`)
- [ ] HUD (HP bar, level, potions, equipment, mode label) updates correctly
- [ ] Minimap renders correctly
- [ ] Help overlay, mute button, restart all function
- [ ] No `document.getElementById` calls inside `render()` or its sub-functions
- [ ] No `ctx.save()`/`ctx.restore()` per-tile in `renderSpriteMode` for visible tiles
- [ ] `node cli.js` still works (no CLI changes expected)
