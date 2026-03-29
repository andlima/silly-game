---
id: emoji-hero-mage
status: not-started
area: frontend
priority: 60
depends_on: []
description: Change the hero glyph from @ to the mage emoji (🧙) in enhanced render mode
---

# Emoji Hero: Mage Glyph

## Goal

In the enhanced (emoji) render mode, display the hero as the mage emoji 🧙
instead of the plain `@` symbol. The ASCII mode remains unchanged.

## Acceptance Criteria

1. In `src/glyphs.js`, `GLYPHS_ENHANCED.player` uses `{ char: '🧙', wide: true }`.
2. `GLYPHS_ASCII.player` remains `{ char: '@', wide: false }`.
3. The web renderer (`index.html`) correctly renders the wide mage glyph with
   the existing emoji font path (no rendering changes needed — wide glyph
   handling already exists).
4. The TUI renderer (`cli.js`) correctly renders the wide mage glyph using the
   existing `cell()` helper (no rendering changes needed).
5. Visual spot-check: the mage emoji appears centered in its tile and does not
   overlap adjacent tiles in either renderer.

## Out of Scope

- Changing the player's colors or background.
- Changing the ASCII-mode glyph.
- Adding per-class glyph selection.

## Verify

```bash
node -e "import('./src/glyphs.js').then(m => { const g = m.GLYPHS_ENHANCED.player; console.assert(g.char === '🧙', 'char'); console.assert(g.wide === true, 'wide'); console.log('ok'); })"
```
