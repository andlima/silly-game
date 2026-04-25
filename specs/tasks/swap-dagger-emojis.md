---
id: swap-dagger-emojis
status: not-started
area: feature
priority: 5
depends_on: []
description: Swap the enhanced glyphs for dagger and throwing_dagger so the melee dagger uses the kitchen-knife glyph and the throwing dagger uses the dagger glyph.
bump: patch
---

# Swap dagger / throwing_dagger emojis

> Note: this spec deliberately avoids literal emoji characters in its
> frontmatter `description` field and elsewhere in this file. The previous
> attempt failed because the orchestrator publishes the spec description to
> a GitHub commit status, and GitHub's status API rejects descriptions
> containing 4-byte UTF-8 characters (which most emoji are). Refer to the
> emojis by Unicode escape or by name when needed. See
> "Implementation note — avoid 4-byte Unicode in orchestrator-visible text"
> below.

## Goal

In the enhanced (emoji) glyph set, swap the `char` values of the melee
`dagger` and the `throwing_dagger` entries so that:

- `dagger` (melee) renders as the kitchen-knife glyph
  (Unicode code point U+1F52A; JS surrogate-pair literal
  `'\ud83d\udd2a'`).
- `throwing_dagger` renders as the dagger glyph with the variation
  selector (code points U+1F5E1 U+FE0F; JS surrogate-pair literal
  `'\ud83d\udde1\ufe0f'`).

The classic ASCII glyph set is **not** changed.

## Scope

Edit `src/glyphs.js`:

- In `GLYPHS_ENHANCED`, swap the `char` values of the `dagger` and
  `throwing_dagger` entries. The current values are:

  ```js
  dagger:          { char: '\ud83d\udde1\ufe0f', wide: true },  // U+1F5E1 U+FE0F (dagger)
  throwing_dagger: { char: '\ud83d\udd2a',       wide: true },  // U+1F52A (kitchen knife)
  ```

  After the swap:

  ```js
  dagger:          { char: '\ud83d\udd2a',       wide: true },  // U+1F52A (kitchen knife)
  throwing_dagger: { char: '\ud83d\udde1\ufe0f', wide: true },  // U+1F5E1 U+FE0F (dagger)
  ```

  The trailing comments may instead use the literal emoji glyphs (the
  existing file already does this) — that is fine, comments in source
  files do not flow into any GitHub status. Either form is acceptable as
  long as the comment correctly identifies the `char` on the same line.

- Leave `GLYPHS_ASCII` and every other entry untouched.

That is the entire functional change. No other source file references these
specific emoji code points; tests do not assert on the enhanced glyph chars.

## Out of scope

- Any change to the ASCII glyph set.
- Renaming items, changing item names, descriptions, damage, prices, or
  any game mechanic.
- Touching historical spec files under `specs/` that happen to mention
  these emojis.
- Changes to any other glyph entry.

## Implementation note — avoid 4-byte Unicode in orchestrator-visible text

The previous attempt at this spec failed at the review-decision-gate phase
with:

> gh: Validation failed: Description doesn't accept 4-byte Unicode

That gate publishes a GitHub commit status whose `description` field is
sourced from the spec's frontmatter `description` (and related metadata).
GitHub's status API rejects 4-byte UTF-8 characters in that field, and
most emoji code points (including U+1F5E1 and U+1F52A) are encoded as
4-byte UTF-8.

To avoid a repeat:

1. Do **not** add literal emoji characters to:
   - The frontmatter `description:` field of this spec (already
     emoji-free above — keep it that way).
   - Commit messages produced by the implementing agent.
   - PR titles produced by the implementing agent.
2. Inside `src/glyphs.js`, keep the swapped `char` values in JS
   Unicode-escape form (`'\ud83d\udd2a'`, `'\ud83d\udde1\ufe0f'`) — this
   matches the existing convention for other emoji entries in the file.
   The emoji characters only exist at runtime when the string is
   evaluated; the source bytes stay 7-bit-ASCII-safe.
3. Trailing `// kitchen knife` / `// dagger` comments are fine; literal
   emoji in those comments is also fine because they do not propagate
   into GitHub status descriptions. Pick whichever form keeps the file
   readable and consistent with neighbouring entries.

## Acceptance criteria

1. `src/glyphs.js` — `GLYPHS_ENHANCED.dagger.char` is the kitchen-knife
   glyph (U+1F52A), encoded in source as the JS escape
   `'\ud83d\udd2a'`.
2. `src/glyphs.js` — `GLYPHS_ENHANCED.throwing_dagger.char` is the dagger
   glyph (U+1F5E1 U+FE0F), encoded in source as the JS escape
   `'\ud83d\udde1\ufe0f'`.
3. The trailing comment on each of those two lines correctly identifies
   the `char` on that line (either via the literal emoji glyph or a short
   name like "kitchen knife" / "dagger").
4. `GLYPHS_ASCII` is byte-identical to before this change.
5. No other source file is modified by the swap (the bump may touch
   `package.json` and `src/version.js` per the standard contract).
6. `npm test` passes.
7. The implementing agent's commit message and PR title contain only
   ASCII / BMP characters — no 4-byte Unicode (no emoji literals).

## Verify

1. `npm test` — green.
2. `git diff` for `src/glyphs.js` shows exactly two `char:` value swaps in
   `GLYPHS_ENHANCED` plus the matching trailing-comment updates, and
   nothing else.
3. Run `npm run bump` and commit `package.json` + `src/version.js`
   alongside the source change (default `patch` bump per frontmatter).
4. Re-read the commit message and PR title before pushing — confirm they
   contain no emoji characters. Reference the swap in plain words, for
   example: "Swap melee dagger and throwing dagger glyphs in
   GLYPHS_ENHANCED."

## Agent notes

- The repo already encodes emoji glyphs as JS surrogate-pair string
  literals (e.g. `'\ud83d\udd2a'`) rather than literal characters in the
  source. Keep that convention — do not paste literal emoji characters
  into the `char:` strings.
- When writing the commit message and PR title, describe the change in
  plain words. Do not embed the emojis themselves; literal emojis there
  are what broke the previous run via the review-decision-gate status
  publish.
- This spec ships a real runtime change, so `bump: patch` (the default)
  applies — run `npm run bump` and commit the result.
