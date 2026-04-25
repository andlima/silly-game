---
id: swap-dagger-emojis
status: not-started
area: feature
priority: 5
depends_on: []
description: Swap the enhanced glyphs for dagger and throwing_dagger so the melee dagger uses 🔪 and the throwing dagger uses 🗡️.
bump: patch
---

# Swap dagger / throwing_dagger emojis

## Goal

In the enhanced (emoji) glyph set, swap the characters used for the melee
`dagger` and the `throwing_dagger` so that:

- `dagger` (melee) renders as 🔪
- `throwing_dagger` renders as 🗡️

The classic ASCII glyph set is **not** changed.

## Scope

Edit `src/glyphs.js`:

- In `GLYPHS_ENHANCED`, swap the `char` values of the `dagger` and
  `throwing_dagger` entries. Update the trailing comments to match the
  new emoji.
- Leave `GLYPHS_ASCII` and every other entry untouched.

That's the entire functional change. No other source files reference these
specific emoji code points.

## Out of scope

- Any change to the ASCII glyph set.
- Renaming items, changing item names, descriptions, damage, or any game
  mechanic.
- Touching historical spec files under `specs/` that happen to mention the
  old emojis.

## Verification

- `npm test` passes.
- Manual sanity check (or just reading the diff) confirms the swap is
  exactly the two `char` fields in `GLYPHS_ENHANCED`.
