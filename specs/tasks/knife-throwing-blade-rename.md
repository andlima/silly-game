---
id: knife-throwing-blade-rename
status: not-started
area: frontend
priority: 50
depends_on: []
bump: patch
description: Swap dagger/throwing-dagger emojis and rename them to Knife (melee) and Throwing blade (consumable) in all player-facing text
---

# Knife & Throwing Blade Rename

## Goal

Today the melee weapon "Dagger" uses 🗡️ and the consumable thrown variant
"throwing dagger" uses 🔪 — visually inverted (🔪 reads as a kitchen knife,
🗡️ reads as an ornamental dagger that fits a thrown blade better). The
shared word "dagger" also makes the two items easy to confuse in pickup,
HUD, and throw messages.

Swap the emojis so each item gets the glyph that matches its role, then
rename them in player-facing copy: melee → "Knife", thrown → "Throwing
blade". After this change, the word "dagger" must not appear anywhere a
player can see (game messages, HUD labels, help overlay, stats screen,
simulator report).

Internal identifiers (`dagger`, `throwing_dagger` item types,
`inventory.throwingDaggers`, `daggersThrown` stat, `DAGGER_THROW_DAMAGE`,
`hud-daggers` element id) **stay as-is** — renaming them is a much wider
blast radius (save shape, sprite atlas keys, dozens of test fixtures) for
zero player-visible benefit.

## Acceptance Criteria

1. **Emojis swapped** in `src/glyphs.js` `GLYPHS_ENHANCED`:
   - `dagger.char` → 🔪 (`🔪`)
   - `throwing_dagger.char` → 🗡️ (`🗡️`)
   - Inline `// 🗡️` / `// 🔪` comments updated accordingly.
   - `GLYPHS_ASCII` is **untouched** (`|` for `dagger`, `-` for
     `throwing_dagger`).
2. **Melee equipment displays as "Knife"** wherever it surfaces:
   - `EQUIPMENT.dagger.name` in `src/game.js` is `'Knife'`.
   - Pickup message reads `"You equip a Knife (+2 attack)."` (the existing
     `eqDef.name` interpolation handles this once the name is changed).
   - Web UI weapon-HUD test in `index.html` (`eq.weapon.name === 'Dagger'`)
     becomes `=== 'Knife'` and emits 🔪 (`\u{1F52A}`) instead of 🗡️
     (`\u{1F5E1}️`) so the inline HUD glyph matches the swapped emoji.
   - Simulator (`simulate.js`) string-match `r.equipment.weapon === 'Dagger'`
     becomes `'Knife'`, and the report label `Dagger:` becomes `Knife:`.
3. **Thrown consumable displays as "Throwing blade"** in every player-
   facing string. No occurrence of the word "dagger" or "daggers" remains
   in any user-visible string anywhere in the repo. Specifically:
   - `src/game.js` pickup, throw-prompt, hit, miss/clatter, and merchant
     messages: "throwing dagger" → "throwing blade", "Throw dagger —" →
     "Throw blade —", "no throwing daggers" → "no throwing blades",
     "Throwing dagger — {price}g" → "Throwing blade — {price}g".
   - `cli.js` HUD label `Daggers:` → `Blades:`, help text `Throw dagger` →
     `Throw blade`, stats line `Daggers thrown:` → `Blades thrown:`.
   - `index.html` help-overlay row `Throw dagger` → `Throw blade`,
     end-of-run stats row `Daggers thrown` → `Blades thrown`, throwing-HUD
     emoji swapped from 🔪 (`\u{1F52A}`) to 🗡️ (`\u{1F5E1}️`) in both
     the populated and dimmed-empty states.
4. **Tests updated** in `src/game.test.js` to match new strings:
   - Equipment fixtures using `name: 'Dagger'` → `name: 'Knife'` (lines
     ~379 and ~1684).
   - Throwing-dagger describe-block message assertions updated to match
     the new strings (`pick up a throwing blade`, `no throwing blades`,
     `Throw blade`, etc.).
   - Test fixtures keyed on `type: 'dagger'` / `type: 'throwing_dagger'`
     are **not** changed — the internal item type stays the same.
5. **Internal identifiers preserved** (no renames):
   - Item type strings `'dagger'` and `'throwing_dagger'` (used by
     glyph map, sprite map, equipment lookup, items array, save data).
   - `inventory.throwingDaggers`, `stats.daggersThrown`,
     `DAGGER_THROW_DAMAGE`.
   - HTML element id `hud-daggers` and any local JS variable like
     `daggerCount` / `daggersEl` (purely internal, not visible to players).
6. **All existing tests pass** (`npm test` / `node --test src/game.test.js`).

## Out of Scope

- Renaming the internal `dagger` / `throwing_dagger` item types or the
  `throwingDaggers` / `daggersThrown` field names (would break saves and
  require coordinated changes in sprites, glyphs, and test fixtures —
  pure refactor with no player-visible benefit).
- Renaming the HTML id `hud-daggers` or local JS variable names like
  `daggerCount`. They are not visible to players.
- Any change to the ASCII glyph set (`|` and `-` stay).
- Adding a new sprite for the swapped emoji rendering. The web UI uses
  the existing `dagger` sprite cell (col 0, row 2) for the equipped
  melee item type — that sprite is keyed on internal type, so the
  rename does not affect it. The throwing-blade item has no sprite and
  falls through to the (now 🗡️) glyph rendering, which is correct.
- Migrating any existing saved games (the project doesn't persist runs;
  state is in-memory).

## Design Notes

### Files that change

- `src/glyphs.js` — two char swaps in `GLYPHS_ENHANCED`.
- `src/game.js` — one equipment name (`'Dagger'` → `'Knife'`) plus the
  seven player-facing throwing-blade message strings around lines
  559, 972, 1044, 1103, 1106, 1150, 1170.
- `cli.js` — three labels: HUD `Daggers:` (~line 294), help-line
  `Throw dagger` (~line 328), stats `Daggers thrown:` (~line 350).
- `index.html` — help row "Throw dagger" (~line 305), the
  weapon-name conditional + emoji swap (~line 819), throwing-HUD emoji
  in both states (~lines 853 + 855), end-of-run stats label
  `Daggers thrown` (~line 897).
- `simulate.js` — string-match (~line 64) and report label (~line 166).
- `src/game.test.js` — a handful of message assertions in the throwing-
  dagger `describe` block (around lines 1823–1955) and two equipment
  fixture names.

### Why keep internals named `dagger` / `throwing_dagger`?

The item-type string is used as a join key across at least seven places
(glyph map, ASCII glyph map, sprite cell map, color map, equipment
defs, item factory, save shape, dozens of tests). The save format is
implicit — `type: 'dagger'` flows through to `equipment.weapon.type`.
None of this is visible to a player. Player-visible copy is the only
source of confusion the user wants to fix, so we cut the change there.

### Verify the "no 'dagger' in player-visible strings" criterion

After implementing, run a simple grep over user-visible surfaces:

```
grep -nE "dagger|Dagger" src/game.js cli.js index.html simulate.js
```

Every remaining match should be in code (variable names, item-type
strings, sprite/color map keys, comments) — none should be inside a
string literal that ever reaches the player. The throwing-dagger
describe-block in `src/game.test.js` should also have no remaining
"throwing dagger" / "Throw dagger" string literals (assertions check
the new text); however `type: 'throwing_dagger'` and field names like
`throwingDaggers` / `daggersThrown` are expected to remain.

## Verify

1. `node --test src/game.test.js` passes (all existing tests, with the
   updated message-assertion strings).
2. Run the web UI (`npm run dev` or open `index.html` in a browser):
   - Walk over a melee weapon item — message reads
     "You equip a Knife (+2 attack)." and the weapon HUD shows 🔪+2.
   - Walk over a thrown-weapon item — message reads
     "You pick up a throwing blade (1 total)." and the HUD shows 🗡️1.
   - Press `T` — message reads
     "Throw blade — choose direction (←↑↓→)."
   - Throw at a wall — message reads
     "Your throwing blade clatters to the floor."
   - Open the help overlay (`?`) — row reads "Throw blade".
   - End a run — stats screen lists "Blades thrown".
3. Run the CLI (`node cli.js`):
   - HUD shows `Blades: N`.
   - `?` help shows `T … Throw blade`.
   - End-of-run stats show `Blades thrown: N`.
4. Run the simulator (`node simulate.js`) — report has a `Knife:` row
   (no `Dagger:` row).
5. `grep -nE "dagger|Dagger" src/game.js cli.js index.html simulate.js`
   — confirm no matches inside player-facing string literals.
6. Run `npm run bump` and commit the updated `package.json` and
   `src/version.js`.

## Agent Notes

- Read `AGENTS.md` first (worktree-only editing rule, etc.). All edits
  go inside this worktree directory.
- Do the emoji swap and the melee `'Dagger'` → `'Knife'` rename together
  with the `index.html` weapon-HUD conditional fix in one pass — they
  are tightly coupled and tests are most likely to catch a missed
  spot here.
- Ordering tip: change `EQUIPMENT.dagger.name` first, then run tests.
  The two `name: 'Dagger'` fixture lines in `src/game.test.js` will
  fail loudly and point you at the right spots.
- Don't rename the item-type strings (`'dagger'`, `'throwing_dagger'`)
  even though they show up frequently in greps — that's deliberately
  out of scope.
- The ASCII glyph map is intentionally untouched. ASCII players see
  `|` for the melee Knife and `-` for the Throwing blade, which is
  fine — the names rendered next to those glyphs in messages still
  read correctly.
