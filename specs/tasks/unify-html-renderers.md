---
id: unify-html-renderers
status: not-started
area: web
priority: 60
depends_on: []
description: Merge sprite.html into index.html, make emoji default, optimize sprite rendering performance
---

# Unify HTML Renderers

## Goal

Consolidate the two separate HTML entry points (`index.html` and `sprite.html`)
into a single `index.html` that supports all three render modes (sprite, emoji,
ASCII). Make emoji the default mode. Fix sprite-mode movement lag.

## Context

`sprite.html` is a superset of `index.html` — it has everything index has plus
sprite rendering, touch controls, and mobile action bar. Maintaining two files
with ~80% duplicated code is unnecessary. The sprite version should become the
single entry point.

## Changes

### 1. Merge into `index.html`

Replace `index.html` with the content from `sprite.html`, adapted as follows:

- **Title:** Keep as "Silly Roguelike" (drop the "(Sprite)" suffix).
- **All sprite.html features preserved:** sprite rendering, touch controls,
  mobile action bar, help overlay, 3-mode cycling (Tab), minimap, audio, HUD.
- **Default render mode:** emoji (not sprite). The `renderMode` variable should
  initialize to `'emoji'` and glyphs.js should start in enhanced mode (it
  already does).
- **Tab cycling order:** emoji -> sprite -> ASCII -> emoji.

### 2. Delete `sprite.html`

Remove `sprite.html` from the repo entirely.

### 3. Sprite Rendering Performance Fixes

The sprite renderer currently calls `ctx.drawImage()` per tile per frame with
frequent `globalAlpha` and `filter` changes. This causes noticeable lag during
movement. Apply these optimizations:

- **Batch by alpha/filter state:** Group tiles by visibility state (visible,
  revealed, hidden) and render each group together, changing `globalAlpha` and
  `ctx.filter` only once per group instead of per tile.
- **Cache sprite sub-images:** On sprite sheet load, slice each sprite cell into
  individual `ImageBitmap` or offscreen canvas objects. Use these cached images
  in `drawImage()` instead of source-rect slicing from the full sheet each frame.
- **Skip hidden tiles:** Ensure tiles with `visibility === 'hidden'` are skipped
  entirely (no draw calls, no background fill).
- **Avoid redundant floor fills:** Only fill floor background for visible/revealed
  tiles, not hidden ones.

## Files to Modify

- `index.html` — replace with unified renderer (based on sprite.html)

## Files to Delete

- `sprite.html`

## Files NOT to Modify

- `src/glyphs.js` — no changes needed (already defaults to enhanced/emoji)
- `src/game.js`, `src/fov.js`, `src/map.js`, `src/dungeon.js` — game logic unchanged
- `src/audio.js` — audio unchanged
- `cli.js` — terminal UI unchanged

## Acceptance Criteria

- [ ] Only `index.html` exists (no `sprite.html`).
- [ ] Game loads in emoji mode by default.
- [ ] Tab cycles through emoji -> sprite -> ASCII -> emoji.
- [ ] All three render modes work correctly (sprites render from sheet, emoji/ASCII
      render via text).
- [ ] Touch controls and mobile action bar work (carried over from sprite.html).
- [ ] Help overlay, minimap, HUD, messages, overlays all functional.
- [ ] Sprite mode movement feels noticeably smoother (no per-tile alpha/filter thrash).
- [ ] Sprite sub-images are cached at load time (not sliced from sheet each frame).
- [ ] Hidden tiles produce zero draw calls.

## Verify

```bash
# index.html exists and sprite.html does not
test -f index.html && ! test -f sprite.html

# No broken references to sprite.html in the codebase
! grep -r 'sprite\.html' --include='*.html' --include='*.js' --include='*.md' . \
  | grep -v 'specs/tasks/' | grep -v 'node_modules/' | grep -q .
```
