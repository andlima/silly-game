---
id: fix-hud-dagger-blade-emojis
status: not-started
area: bugfix
priority: 5
depends_on: []
description: Fix HUD weapon and throwing-blade emojis in index.html that still show the pre-swap glyphs after swap-dagger-emojis shipped.
bump: patch
---

# Fix HUD dagger / blade emojis

## Background

A prior spec (`swap-dagger-emojis`, PR #68) swapped the `char` values of
`GLYPHS_ENHANCED.dagger` and `GLYPHS_ENHANCED.throwing_dagger` (later
renamed to `throwing_blade` by `rename-throwing-dagger-to-blade`, PR #70).
After the swap:

- The **melee** `dagger` glyph is the kitchen-knife code point
  (U+1F52A).
- The **throwing blade** glyph is the dagger code point with variation
  selector (U+1F5E1 U+FE0F).

`index.html` has two HUD blocks that hardcode emoji escape sequences for
these two items rather than reading from `GLYPHS_ENHANCED`. Those literals
were not updated as part of the swap, so the on-screen status now shows
the wrong icon for both:

- The equipped-weapon HUD shows the dagger-shaped glyph for the melee
  Dagger.
- The throwing-blade HUD shows the kitchen-knife glyph for the throwing
  blade.

Both should be flipped to match `GLYPHS_ENHANCED`.

## Goal

Make the HUD in the web frontend (`index.html`) display the correct emoji
for the melee Dagger weapon and the throwing-blade stack, matching the
`GLYPHS_ENHANCED` entries in `src/glyphs.js`.

## Scope

Edit `index.html` only. Three emoji-escape values change.

The source uses JS Unicode escapes throughout — `\u{1F5E1}`, `️`,
`⚔`, `—`, `\u{1F52A}` — never literal Unicode characters.
Keep that convention: every new value below should be written as escape
sequences in `index.html`, not as literal Unicode.

**Equivalence note for reading this spec.** Some example lines below
may render the trailing variation selector U+FE0F, the em-dash U+2014,
or the crossed-swords U+2694 U+FE0F as literal characters (`️`, `—`,
`⚔️`) rather than as the `️` / `—` / `⚔️`
escape forms used in the source. The two forms are equivalent JS
strings, but they are different *bytes*. When making the actual edit,
preserve the source's escape form byte-for-byte: read the line in
`index.html` and replace only the dagger-vs-knife portion of the
string, leaving the surrounding escape bytes untouched.

### 1. Equipped weapon HUD — melee Dagger branch

The current line in the equipment-display block (around line 819) is
exactly:

```js
const wEmoji = eq.weapon.name === 'Dagger' ? '\u{1F5E1}️' : '⚔️';
```

Change the `'Dagger'` branch's emoji from `'\u{1F5E1}️'` (dagger
glyph + variation selector) to `'\u{1F52A}'` (kitchen knife — no
variation selector). The fallback `'⚔️'` (crossed swords) for
non-Dagger weapons stays exactly as-is.

After the change:

```js
const wEmoji = eq.weapon.name === 'Dagger' ? '\u{1F52A}' : '⚔️';
```

Note: the kitchen-knife code point (U+1F52A) does not use a variation
selector — do **not** append `️` to it. This matches the way the
throwing-blades HUD currently writes the kitchen knife and matches
`GLYPHS_ENHANCED.dagger.char` in `src/glyphs.js`, which is the surrogate
pair for U+1F52A with no trailing U+FE0F variation selector.

### 2. Throwing-blades HUD — populated branch

The current line (around line 853) is exactly:

```js
bladesEl.innerHTML = `<span>\u{1F52A}${bladeCount}</span>`;
```

Change `\u{1F52A}` (kitchen knife) to `\u{1F5E1}️` (dagger glyph +
variation selector). The surrounding template literal — the backticks,
the `<span>`, and the `${bladeCount}` interpolation — stays exactly
as-is.

After the change:

```js
bladesEl.innerHTML = `<span>\u{1F5E1}️${bladeCount}</span>`;
```

### 3. Throwing-blades HUD — empty/dim branch

The current line (around line 855) is exactly:

```js
bladesEl.innerHTML = '<span style="opacity:0.3">\u{1F52A}—</span>';
```

Change `\u{1F52A}` to `\u{1F5E1}️`. The trailing em-dash escape
(`—`) and the `opacity:0.3` styling stay exactly as-is.

After the change:

```js
bladesEl.innerHTML = '<span style="opacity:0.3">\u{1F5E1}️—</span>';
```

That is the entire functional change.

## Out of scope

- Refactoring the HUD to source these glyphs from `GLYPHS_ENHANCED`
  instead of hardcoding escape sequences. The hardcoded form is the
  existing pattern in this block; do not change the surrounding
  structure.
- Any change to `src/glyphs.js`, `cli.js`, `simulate.js`, `src/game.js`,
  or `src/game.test.js`. The CLI HUD uses text labels (no emoji) and is
  unaffected. `GLYPHS_ENHANCED` already has the correct mapping.
- Renaming items, changing damage, changing key bindings, changing
  colors, or any other visual / mechanic change.
- Touching historical task specs under `specs/tasks/` that mention the
  pre-swap emoji assignments.

## Acceptance criteria

1. `index.html` — the equipped-weapon HUD branch for
   `eq.weapon.name === 'Dagger'` uses `'\u{1F52A}'`.
2. `index.html` — both throwing-blades HUD branches (the populated
   `<span>...</span>` template-literal form and the dim `opacity:0.3`
   empty form) use `\u{1F5E1}️`.
3. The non-Dagger weapon fallback `'⚔️'` and the empty-weapon
   placeholder `'⚔️'` stay unchanged.
4. The em-dash escape `—` in the empty throwing-blades branch stays
   unchanged.
5. No other code in `index.html` is changed by this spec (the bump may
   touch `package.json` and `src/version.js` per the standard contract).
6. No other source files are modified.
7. `npm test` passes.

## Verify

1. `npm test` — green.
2. `git diff index.html` shows exactly three escape-value swaps (one in
   the weapon-display branch, two in the throwing-blades HUD), and
   nothing else.
3. Grep sanity check:

   ```bash
   grep -n "1F5E1\|1F52A" index.html
   ```

   Expected after the edit:
   - The equipped-weapon Dagger branch line references `1F52A`.
   - Both throwing-blade HUD branch lines reference `1F5E1` (with
     `️` immediately following).
   - No remaining occurrences of `1F5E1` on the equipped-weapon Dagger
     branch line, and no remaining occurrences of `1F52A` on either
     throwing-blade HUD branch line.

4. Manual smoke test in the browser (`npm run dev` or open
   `index.html`):
   - Equip a melee Dagger — the equipment HUD shows the kitchen-knife
     glyph next to the `+atk` bonus.
   - Pick up a throwing blade — the throwing-blades HUD shows the
     dagger-shaped glyph followed by the count.
   - With zero throwing blades, the dim throwing-blades HUD shows the
     dagger-shaped glyph followed by an em-dash.
   - Equip a non-Dagger weapon (e.g. Sword) — the equipment HUD still
     shows the crossed-swords glyph (unchanged).

5. Run `npm run bump` (default `patch` per frontmatter) and commit the
   resulting `package.json` and `src/version.js` alongside the source
   change.

## Implementation note — avoid 4-byte Unicode in orchestrator-visible text

Same precedent as `swap-dagger-emojis.md` and
`rename-throwing-dagger-to-blade.md`: the orchestrator publishes the
spec's frontmatter `description` and related metadata to a GitHub
commit-status, whose API rejects 4-byte UTF-8 characters (which most
emoji are encoded as).

To stay safe:

- The frontmatter `description:` field above is emoji-free; keep it that
  way.
- Commit messages and PR titles produced by the implementing agent must
  contain only ASCII / BMP characters — no 4-byte Unicode (no emoji
  literals). Refer to the icons by name (e.g. "kitchen knife", "dagger
  glyph") or by Unicode code point (U+1F52A, U+1F5E1) in those
  contexts.
- Inside `index.html`, keep the swapped values in JS Unicode-escape form
  (`'\u{1F52A}'`, `'\u{1F5E1}️'`) — this matches the existing
  convention in that file and keeps the source bytes 7-bit-ASCII-safe.

## Agent notes

- The bug is purely a forgotten-update from the earlier
  `swap-dagger-emojis` spec; the canonical mapping in `GLYPHS_ENHANCED`
  is already correct, so this spec only re-aligns the hardcoded HUD
  literals with that mapping.
- Do not refactor the HUD to read from `GLYPHS_ENHANCED`. That is a
  tempting follow-up but is explicitly out of scope here — keep the
  change minimal.
- Three escape-sequence edits in `index.html`, plus the version bump.
  Nothing else.
