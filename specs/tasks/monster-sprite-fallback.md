---
id: monster-sprite-fallback
status: not-started
area: bugfix
priority: 5
depends_on: []
description: In sprite render mode, fall back to the GLYPHS emoji/ASCII glyph when a monster has no sprite, so trolls (and any future spriteless monster) are no longer invisible.
bump: patch
---

# Monster sprite fallback in sprite render mode

## Background

`index.html` supports three render modes — `emoji`, `sprite`, `ascii`.
The sprite mode draws monsters from the `roguelike-sprites.png` asset using
a `SPRITE_MAP` table at `index.html:439-453`. The sheet is a 4×3 grid;
all twelve cells are currently allocated to:

- Row 0: `player`, `food`, `rat`, `skeleton`
- Row 1: `wall`, `bear`, `dragon`, `stair`
- Row 2: `knife`, `sword`, `helmet`, `shield`

The `troll` monster type (defined in `src/game.js:17` and added to random
spawns at level ≥ 4 by `src/game.js:432`) has **no entry in `SPRITE_MAP`
and no cell on the sheet**. In sprite mode, the visible-batch monster
branch at `index.html:614-619` calls `drawSprite(cell.monster.type, …)`
and ignores its return value, so when a troll appears the cell renders as
the floor background only — the troll is invisible.

The item-rendering branch right below it (`index.html:620-637`) already
has a text fallback for items without sprites (gold, scrolls, idol,
princess, merchant). The monster branch is the only place in sprite-mode
rendering where a missing sprite produces a blank cell instead of *some*
visible glyph.

The text/emoji renderer (`renderTextMode`, `index.html:689-703`) already
draws monsters from `GLYPHS[cell.monster.type]` with `cell.monster.color`
and the frozen overlay, and is unaffected.

## Goal

Make sprite mode render every monster, including any monster type that
lacks a sprite-sheet cell. The immediate visible effect is that trolls
appear in sprite mode (as the troll emoji from `GLYPHS_ENHANCED.troll`
when emoji glyphs are available, or as `t` if the runtime `GLYPHS` table
is in ASCII mode). Going forward, any new monster type added to
`src/game.js` is also guaranteed to be visible in sprite mode without
having to edit the sheet first.

This is a defensive fallback, not a sprite-art change. The
`roguelike-sprites.png` asset is **not** modified by this spec.

## Scope

Edit `index.html` only. One block changes: the monster-rendering branch
inside `renderSpriteMode` at `index.html:614-619`.

### The change

Today the branch reads (lines 614-619, exact source):

```js
        } else if (cell.monster) {
          drawSprite(cell.monster.type, px, py);
          if (cell.monster.frozenTurns > 0) {
            ctx.fillStyle = 'rgba(136, 204, 255, 0.4)';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          }
        } else if (cell.item) {
```

Wrap the `drawSprite` call in an `if (!drawSprite(...))` and, on the
false branch, draw the monster's glyph as text using the same conventions
as the existing **item** fallback (`index.html:621-637`) and the existing
**emoji-mode monster** branch (`index.html:689-703`). The frozen overlay
must still be drawn afterwards in **both** the sprite-rendered case and
the text-fallback case (it currently runs unconditionally; preserve
that).

After the change the branch should read:

```js
        } else if (cell.monster) {
          if (!drawSprite(cell.monster.type, px, py)) {
            // Text fallback for monsters without sprites (e.g. troll)
            const glyph = GLYPHS[cell.monster.type];
            const cx = px + TILE_SIZE / 2;
            const cy = py + TILE_SIZE / 2;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (glyph && glyph.wide) {
              ctx.font = `${FONT_SIZE - 2}px ${EMOJI_FONT}`;
              ctx.fillText(glyph.char, cx, cy);
            } else {
              ctx.font = `${FONT_SIZE}px monospace`;
              ctx.fillStyle = scaleColor(cell.monster.color, b);
              ctx.fillText((glyph || { char: cell.monster.char }).char, cx, cy);
            }
          }
          if (cell.monster.frozenTurns > 0) {
            ctx.fillStyle = 'rgba(136, 204, 255, 0.4)';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          }
        } else if (cell.item) {
```

Notes on this exact form:

- The fallback mirrors the **item** fallback shape — same `cx/cy`
  computation, same `textAlign`/`textBaseline`, same `if (glyph &&
  glyph.wide)` split, same `(glyph || { char: cell.X.char }).char`
  defensive read. Use `cell.monster.color` (not `cell.item.color`).
- Do **not** adjust `cell.monster.color` for frozen monsters in the
  fallback (`renderTextMode` does, but here the frozen visual is the
  blue rectangle drawn *after* — keep that as the frozen indicator,
  matching the existing sprite-mode frozen behavior). The blue overlay
  fillRect runs after the fallback glyph for frozen monsters, so it
  visibly tints the glyph just like it tints a real sprite.
- The `globalAlpha = b` and the surrounding `ctx.save()/restore()`
  brightness batching at `index.html:604-610` are already in effect
  when this code runs — do not add another save/restore. The fallback
  glyph picks up the per-tile brightness via `globalAlpha` exactly the
  way the item fallback does.
- Do not add a `troll` entry to `SPRITE_MAP`. Do not edit
  `roguelike-sprites.png`. Do not change `cellW`/`cellH` math or the
  sheet-loading code.
- Do not touch the **revealed** batch (`index.html:553-580`) — it only
  draws walls and stairs and never reaches the monster branch.

## Out of scope

- Adding a real troll sprite to `assets/roguelike-sprites.png`. That
  is a separate, larger task (asset edit + grid-size change + new
  `SPRITE_MAP` entry). The fallback added here is the safety net that
  makes that follow-up optional rather than blocking.
- Refactoring the three render-mode functions to share a common
  monster/item draw routine. The duplication between sprite-mode
  fallback and emoji-mode rendering is intentional for this fix —
  preserve both call sites.
- Changing the existing item fallback (`index.html:621-637`) or the
  emoji renderer's monster branch (`index.html:689-703`).
- Any change to `src/game.js`, `src/glyphs.js`, `cli.js`,
  `simulate.js`, or test files.
- HUD, controls, audio, balance, or any other gameplay change.

## Acceptance criteria

1. `index.html` — the `else if (cell.monster)` branch in
   `renderSpriteMode` calls `drawSprite(cell.monster.type, px, py)`
   inside an `if (!drawSprite(...))` guard and, on the false branch,
   draws the monster's `GLYPHS[type]` glyph as text using the same
   wide/narrow split as the existing item fallback in the same
   function.
2. The text fallback uses `cell.monster.color` for the narrow-glyph
   `fillStyle` (scaled by the per-tile brightness `b` via
   `scaleColor(cell.monster.color, b)`), matching the item fallback's
   pattern with its color field.
3. The frozen-monster blue overlay (`rgba(136, 204, 255, 0.4)`
   `fillRect`) still runs unconditionally for monsters with
   `frozenTurns > 0`, regardless of whether the sprite or the text
   fallback was used.
4. `SPRITE_MAP` is **not** modified. `assets/roguelike-sprites.png` is
   **not** modified. No new sprite-cache entry is added.
5. The revealed-batch loop, the visible-batch alpha/brightness
   bookkeeping, and the floor-background fill at the top of the
   per-tile body are unchanged.
6. No other code in `index.html` is changed by this spec (the bump
   may touch `package.json` and `src/version.js` per the standard
   contract).
7. No other source files are modified.
8. `npm test` passes.

## Verify

1. `npm test` — green.
2. `git diff index.html` shows exactly the monster-branch edit
   described above and nothing else.
3. Grep sanity check:

   ```bash
   grep -n "Text fallback for monsters without sprites" index.html
   ```

   Expected: exactly one hit, inside the `renderSpriteMode` function.

   ```bash
   grep -n "drawSprite(cell.monster.type" index.html
   ```

   Expected: exactly one hit, and that line is now wrapped in
   `if (!drawSprite(...))`.

4. Manual smoke test in the browser (`npm run dev` or open
   `index.html`):
   - Switch render mode to **Sprite** (the toggle cycles
     emoji → sprite → ascii — see `index.html:386-405`).
   - Reach dungeon level 4+ and find a troll (random spawn, see
     `src/game.js:432`). The troll cell renders the troll emoji
     glyph (🧌, from `GLYPHS_ENHANCED.troll`) on the dark floor
     tile, scaled to fit the cell, dimmed by the per-tile FOV
     brightness like any other tile. The troll is no longer
     invisible.
   - Freeze the troll (cast frost, etc.). The blue tint overlay
     still appears over the fallback glyph the same way it does
     over a real sprite.
   - Confirm that **other** monsters (rat, skeleton, bear, dragon)
     still render as their sprite-sheet sprites — i.e. the fallback
     only kicks in when a sprite is genuinely missing.
   - Switch render mode to **Emoji** and to **ASCII** and confirm
     monsters (including troll) render as before in those modes.

5. Run `npm run bump` (default `patch` per frontmatter) and commit
   the resulting `package.json` and `src/version.js` alongside the
   source change.

## Agent notes

- This is a single localized edit in `index.html`. The only judgment
  call is keeping the edit *purely* a fallback — do not "improve" the
  sprite-mode renderer in any other way, do not touch sibling
  branches, and do not extract a helper. The duplication with the
  item fallback and the emoji-mode monster branch is acceptable and
  intentional.
- `GLYPHS`, `FONT_SIZE`, `EMOJI_FONT`, `scaleColor`, and `b` are all
  already in scope at the edit site (see `index.html:333`, `339-340`,
  `507`, and the `b = cell.brightness` line at `592`). No new imports
  or helpers are needed.
- If the runtime `GLYPHS` table is in ASCII mode (the user toggled
  ASCII glyphs via `toggleRenderMode`), `GLYPHS.troll.char` is `'t'`
  and `wide` is false, so the fallback takes the narrow-glyph branch
  and renders `'t'` in `cell.monster.color`. That is the desired
  behavior for that mode and matches how `renderTextMode` already
  draws non-wide monster glyphs.
