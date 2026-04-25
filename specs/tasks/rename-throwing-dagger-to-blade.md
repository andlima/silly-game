---
id: rename-throwing-dagger-to-blade
status: not-started
area: refactor
priority: 40
depends_on: []
description: Rename "throwing dagger" to "throwing blade" everywhere — UI strings, code identifiers, comments, and current spec docs
bump: patch
---

# Rename Throwing Dagger to Throwing Blade

## Goal

Rename every reference to the consumable ranged weapon from "throwing dagger"
to "throwing blade" — across user-visible strings, code identifiers, item-type
keys, function/variable names, comments, and the canonical spec docs that
describe current behavior. The melee `dagger` equipment is **not** affected.
The glyph (🔪) stays unchanged; this is purely a name change.

## Scope

This is a pure rename / refactor. No mechanic, balance, glyph, key binding,
control flow, audio, color, or visual change. The HUD icon stays as the
kitchen-knife emoji `\u{1F52A}`. The `t` key still triggers the throw, and the
abstract action types (`throw`, `throwDir`, `throwCancel`, `throwPending`)
**stay as-is** — they describe the action, not the weapon.

### Naming conventions

| Form | Old | New |
|------|-----|-----|
| Display (singular) | `throwing dagger` | `throwing blade` |
| Display (plural) | `throwing daggers` | `throwing blades` |
| Display (capitalized) | `Throwing dagger` / `Throwing daggers` | `Throwing blade` / `Throwing blades` |
| Short label | `Daggers` (HUD) | `Blades` (HUD) |
| Item type / kind string | `'throwing_dagger'` | `'throwing_blade'` |
| Inventory field | `inventory.throwingDaggers` | `inventory.throwingBlades` |
| Stat field | `stats.daggersThrown` | `stats.bladesThrown` |
| Damage constant | `DAGGER_THROW_DAMAGE` | `BLADE_THROW_DAMAGE` |
| Spawn function | `spawnThrowingDaggers` | `spawnThrowingBlades` |
| Local var (count) | `daggerCount`, `daggerLabel` | `bladeCount`, `bladeLabel` |
| HTML element id | `hud-daggers` | `hud-blades` |

### What stays unchanged

- Action types `'throw'`, `'throwDir'`, `'throwCancel'` — these describe the
  *action*, not the weapon, and remain meaningful.
- `throwPending` state flag — same reason.
- Button id `btn-throw` and the `Throw` button label — still the throw action.
- The `t` key binding and the help-text key column (`T` / `t`).
- The melee `dagger` equipment (item type `'dagger'`, glyph 🗡️) — out of
  scope, do not touch it.
- The kitchen-knife glyph (`\u{1F52A}`) used for the throwing weapon — only
  the *key* in the glyph maps changes (`throwing_dagger:` → `throwing_blade:`).
- Spec id `throwing-dagger` and the filename `specs/throwing-dagger.md` —
  keep these as-is to preserve git history and external references; update
  only the file's *content*.
- Historical task specs under `specs/tasks/*.md` (e.g.
  `mobile-cast-throw-buttons.md`, `swap-dagger-emojis.md`) — leave untouched
  as historical records.

## Concrete changes

### 1. `src/game.js`

- `DAGGER_THROW_DAMAGE` constant → `BLADE_THROW_DAMAGE`. Update the export
  and any internal references.
- Item-pool weight key `throwing_dagger: 2` (around line 71) →
  `throwing_blade: 2`.
- Initial inventory `throwingDaggers: 0` (in `createGame` and `newLevel`)
  → `throwingBlades: 0`.
- Function `spawnThrowingDaggers(map, monsters, items, level)` →
  `spawnThrowingBlades(...)`. Update its call site in `newLevel`.
- All spawned items `{ type: 'throwing_dagger', char: '-', color: '#cccc99' }`
  → `{ type: 'throwing_blade', ... }` (color unchanged).
- `checkPickup` branch on `itemHere.type === 'throwing_dagger'` →
  `'throwing_blade'`. Pickup message:
  `"You pick up a throwing dagger (N total)."` →
  `"You pick up a throwing blade (N total)."`. Inventory field updates to
  `throwingBlades`.
- Merchant pricing branch `entry.kind === 'throwing_dagger'` →
  `'throwing_blade'`. Display string `"Throwing dagger — Xg"` →
  `"Throwing blade — Xg"`. Buy message
  `"You buy a throwing dagger for Xg."` → `"You buy a throwing blade for Xg."`.
  Inventory field updates to `throwingBlades`.
- `handleThrow` (no-stack path): message `"You have no throwing daggers."`
  → `"You have no throwing blades."`. Stack lookup uses `throwingBlades`.
- `handleThrowDir`: stack lookup, decrement, and respawn-on-miss all use
  `throwingBlades` and `'throwing_blade'`. Hit message
  `"Your throwing dagger hits the {name} for N damage."` →
  `"Your throwing blade hits the {name} for N damage."`. Miss message
  `"Your throwing dagger clatters to the floor."` →
  `"Your throwing blade clatters to the floor."`.
- `DEFAULT_STATS.daggersThrown` → `bladesThrown`. The stat objects in
  `createGame` and `newLevel` follow.
- Comments: `// Slot 2: throwing_dagger OR equipment (50/50). Throwing daggers not yet`
  (line 291) updates to `throwing_blade` / `Throwing blades`.

### 2. `src/glyphs.js`

- `GLYPHS_ENHANCED.throwing_dagger` → `throwing_blade` (key only — `char`
  stays as `'🗡️'` per the swap-dagger-emojis spec; the
  trailing `// dagger` comment may stay since it describes the glyph, not
  the item, but updating to `// throwing blade glyph` is also acceptable).
- `GLYPHS_ASCII.throwing_dagger` → `throwing_blade` (key only — `char: '-'`
  stays).

### 3. `src/game.test.js`

Update every reference to match the renamed identifiers and strings:

- `describe('throwing daggers', ...)` → `describe('throwing blades', ...)`.
- All `it(...)` titles mentioning "throwing dagger" → "throwing blade".
- `inventory: { throwingDaggers: N }` → `inventory: { throwingBlades: N }`.
- `next.inventory.throwingDaggers` → `next.inventory.throwingBlades`.
- Item literals `{ type: 'throwing_dagger', ... }` → `'throwing_blade'`.
- `it.type === 'throwing_dagger'` filters → `'throwing_blade'`.
- Assertion strings like `'pick up a throwing dagger'`,
  `'no throwing daggers'`, `'A throwing_dagger item should be on the floor'`,
  `'A throwing_dagger item should drop'` → "blade" forms.
- Test name `'throwingDaggers stack and throwPending flag persist across level transitions'`
  → `'throwingBlades stack and throwPending flag persist across level transitions'`
  (the `throwPending` half stays unchanged).
- Merchant stock test: `['throwing_dagger', 'equipment'].includes(merchant.stock[1].kind)`
  → `['throwing_blade', 'equipment']`.

### 4. `index.html` (web frontend)

- Element id `hud-daggers` (line 288) → `hud-blades`. Update the matching
  `getElementById('hud-daggers')` lookup.
- Help row "Throw dagger" (line 305) → "Throw blade". Help description
  string "Food / Cast / Throw / Use / Wait" stays (action names are
  generic).
- Button `btn-throw` and label `Throw` (line 321) — unchanged.
- Comment `// Throwing daggers HUD` (line 849) → `// Throwing blades HUD`.
- Local vars `daggersEl`, `daggerCount` → `bladesEl`, `bladeCount`. Inventory
  field reference `game.inventory.throwingDaggers` → `throwingBlades`.
- Game-over stats label `['Daggers thrown', s.daggersThrown || 0]` (line
  897) → `['Blades thrown', s.bladesThrown || 0]`.
- Function `syncActionButtons(daggerCount)` parameter and internal var
  `hasDaggers` → `bladeCount` / `hasBlades`. Update the call site.

### 5. `cli.js` (terminal frontend)

- Color map key `throwing_dagger:` (line 152) → `throwing_blade:`.
- HUD: local vars `daggerCount`, `daggerLabel` → `bladeCount`, `bladeLabel`.
  Inventory field reference updates to `throwingBlades`. HUD line
  `Daggers: ${daggerLabel}` → `Blades: ${bladeLabel}`.
- Help-overlay row text "Throw dagger" (line 328) → "Throw blade".
- Game-over stats label `Daggers thrown: ${s.daggersThrown || 0}` (line
  350) → `Blades thrown: ${s.bladesThrown || 0}`.
- The `t:throw` key hint in the status line — unchanged (action label).

### 6. Current spec docs

Update the *content* of these specs to reflect the new name. Filenames and
spec ids do **not** change.

- `specs/throwing-dagger.md` — rewrite the description, prose, acceptance
  criteria, and design notes to use "throwing blade" / `throwing_blade` /
  `throwingBlades` / `bladesThrown` / `BLADE_THROW_DAMAGE` /
  `spawnThrowingBlades`. Update the heading from `# Throwing Daggers` to
  `# Throwing Blades`. Keep the file's `id: throwing-dagger` frontmatter
  and filename as-is (preserves git history and dependency references).
  Where the prose currently says "the dagger flies", "the dagger hits", etc.
  — switch to "the blade flies", "the blade hits". The 🔪/🗡️ emoji
  comparison line in design notes stays accurate (still 🔪 vs 🗡️).
- `specs/merchant-npc.md` — update the two references at lines 16 and 79
  (`food, throwing daggers, equipment` and `Throwing dagger — 2g`) and the
  dependency wording at line 234 (`Dependency wiring on the
  'throwing-dagger' spec: if throwing daggers are…` → `…if throwing blades
  are…`; the spec-id reference `'throwing-dagger'` stays since the spec id
  is unchanged).

### 7. Out of scope

- Renaming `specs/throwing-dagger.md` to `specs/throwing-blade.md`.
- Touching historical task specs under `specs/tasks/` that already shipped
  (e.g. `mobile-cast-throw-buttons.md`, `swap-dagger-emojis.md`,
  `rename-potion-to-food.md`).
- Renaming the melee `dagger` equipment, its glyph, or its color.
- Renaming the action types `throw` / `throwDir` / `throwCancel` /
  `throwPending`, the `btn-throw` element, or the `t` key binding.
- Changing the kitchen-knife glyph (`\u{1F52A}`) to anything else.
- Any balance, damage, drop-rate, or pricing change.
- Changing `README.md` (no current dagger references; verify with grep).

## Verify

1. `npm test` — green. All existing test cases keep their semantics; only
   identifiers and assertion strings change.
2. Grep for stale references — every command below must return zero matches
   in source files (the throwing-dagger spec filename and historical task
   specs under `specs/tasks/` are expected to be excluded):

   ```bash
   grep -rni 'throwing.dagger\|throwingdagger\|throwing_dagger\|throwingDaggers\|daggersThrown\|DAGGER_THROW_DAMAGE\|spawnThrowingDaggers' \
     src/ cli.js index.html
   ```

   ```bash
   grep -ni 'throwing.dagger\|throwing_dagger\|throwingDaggers\|daggersThrown' \
     specs/throwing-dagger.md specs/merchant-npc.md
   ```

3. Manual smoke test in the browser (`npm run dev` or open `index.html`):
   - Pick up a throwing blade — message reads "You pick up a throwing
     blade (N total)."
   - HUD shows "🔪N" with the new id `hud-blades`.
   - Press `t` then a direction — hit message reads "Your throwing blade
     hits the …".
   - Throw at a wall — miss message reads "Your throwing blade clatters to
     the floor.", the dropped item is recoverable.
   - Visit a merchant — stock line reads "Throwing blade — Xg"; buy
     message reads "You buy a throwing blade for Xg."; inventory updates.
   - Game over — stats line reads "Blades thrown: N".

4. Run `npm run bump` (default `patch` per frontmatter) and commit the
   resulting `package.json` and `src/version.js` alongside the rest.

## Agent Notes

- Apply the rename uniformly. The trickiest spots are easy to miss because
  the same word appears in multiple spellings (snake_case for item type,
  camelCase for fields, kebab-case appears only in the spec id which we
  *keep*). Use `grep -rni` per the Verify commands above to confirm
  completeness before reporting.
- Do **not** touch `'dagger'` (the melee equipment). Use word-boundary or
  prefix-matched searches when running sed-style edits — e.g. match
  `throwing_dagger` and `throwingDagger`, not bare `dagger`.
- The action types and `throwPending` flag are intentionally untouched.
  Action names describe the *verb* (throw); only the noun (the projectile)
  is renamed.
- The HUD icon stays as the kitchen-knife glyph. Verify by reading
  `index.html` line 853 and `index.html` line 855 after the change — the
  `\u{1F52A}` literal should still be there.
- For `specs/throwing-dagger.md`, do a careful pass: every prose mention of
  "the dagger" inside the throw-mechanics section refers to the projectile
  and should become "the blade". The rare mentions that compare against
  the melee dagger (the design-note paragraph at the bottom) need to keep
  the comparison legible — phrase those as "the melee `dagger` equipment
  vs the throwing blade" or similar.
- The spec frontmatter's `description:` field on
  `specs/throwing-dagger.md` itself flows into a GitHub commit-status if
  that spec is ever re-implemented. Keep the description ASCII-only (no
  emoji) per the precedent set by `swap-dagger-emojis.md`.
