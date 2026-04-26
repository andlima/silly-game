---
id: rename-dagger-to-knife
status: not-started
area: refactor
priority: 40
depends_on: []
description: Rename the melee "dagger" equipment to "knife" everywhere - UI strings, code identifiers, comments, and current spec docs - to disambiguate from the throwing blade
bump: patch
---

# Rename Melee Dagger to Knife

## Goal

Rename every reference to the melee equipment item from "dagger" to "knife" —
across user-visible strings, code identifiers, item-type keys, function and
variable names, comments, and the canonical spec docs that describe current
behavior. The throwing-weapon name (`throwing_blade` / "Throwing blade" /
`throwingBlades` / `bladesThrown` / `BLADE_THROW_DAMAGE`) is **not** affected.
Glyphs, colors, balance, key bindings, and pickup/equip mechanics are
unchanged; this is purely a name change to remove the lingering
"dagger vs blade" confusion in the codebase.

## Scope

This is a pure rename / refactor. No mechanic, balance, glyph, key binding,
control flow, audio, color, or visual change. The kitchen-knife emoji
(U+1F52A) currently used for the melee weapon stays — only the *key* in the
glyph maps changes. The ASCII glyph `|` stays.

### Naming conventions

| Form | Old | New |
|------|-----|-----|
| Display (singular) | `Dagger` | `Knife` |
| Display (plural) | `daggers` | `knives` |
| Item type / kind string | `'dagger'` | `'knife'` |
| EQUIPMENT_TYPES key | `dagger:` | `knife:` |
| MERCHANT_PRICES key | `dagger:` | `knife:` |
| Sprite-map / color-map key | `dagger:` | `knife:` |
| Local var (test) | `const dagger = {...}` | `const knife = {...}` |

### What stays unchanged

- The throwing weapon: `throwing_blade` item type, `inventory.throwingBlades`,
  `bladesThrown` stat, `BLADE_THROW_DAMAGE` constant, `spawnThrowingBlades`
  function, `hud-blades` element id — out of scope, do not touch.
- The kitchen-knife glyph (U+1F52A) used for the melee weapon — only the
  *key* in the glyph maps changes (`dagger:` → `knife:`).
- The ASCII glyph `|` for the melee weapon — only the key changes.
- The melee weapon's color (`#aaaaaa`) — unchanged.
- The `Sword` weapon and all other equipment (`helmet`, `shield`).
- Spec id `throwing-dagger` and filename `specs/throwing-dagger.md` — keep
  these as-is to preserve git history and external references; update only
  prose inside the file that compares against "the melee dagger".
- Historical task specs under `specs/tasks/*.md` (e.g.
  `swap-dagger-emojis.md`, `fix-hud-dagger-blade-emojis.md`,
  `rename-throwing-dagger-to-blade.md`) — leave untouched as historical
  records. Their filenames also stay.

## Concrete changes

### 1. `src/game.js`

- `EQUIPMENT_TYPES.dagger` (line 24) → `EQUIPMENT_TYPES.knife`. The
  `name: 'Dagger'` value becomes `name: 'Knife'`. Other fields (`slot`,
  `stat`, `bonus`, `char`, `color`) stay.
- `MERCHANT_PRICES.dagger: 5` (line 72) → `MERCHANT_PRICES.knife: 5`.
- `pickEquipmentType` (lines 368–378):
  - Comment `// Levels 1-2: daggers and helmets; levels 3+: add swords and shields`
    → `// Levels 1-2: knives and helmets; levels 3+: add swords and shields`.
  - Both `return 'dagger'` literals → `return 'knife'`.

### 2. `src/glyphs.js`

- `GLYPHS_ENHANCED.dagger` (line 16) → `GLYPHS_ENHANCED.knife`. Keep the
  `char` (`'🔪'`) and `wide: true`. The trailing `// kitchen
  knife` comment can stay (now even more apt).
- `GLYPHS_ASCII.dagger` (line 44) → `GLYPHS_ASCII.knife`. Keep `char: '|'`,
  `wide: false`.

### 3. `cli.js`

- `EQUIPMENT_COLORS.dagger: FG_WHITE` (line 151) → `knife: FG_WHITE`.
- No HUD or message strings reference the melee weapon by name in `cli.js`,
  so nothing else to change here. (The `t` throw key, `Throw blade` help
  row, and `Blades:` HUD line all belong to the throwing weapon and stay.)

### 4. `index.html` (web frontend)

- Sprite-map key `dagger: { col: 0, row: 2 }` (line 448) → `knife: { col:
  0, row: 2 }`. The sprite-sheet coordinates do not change — sprite art is
  out of scope.
- `COLORS.dagger: '#aaaaaa'` (line 473) → `COLORS.knife: '#aaaaaa'`.
- Weapon-emoji branch `eq.weapon.name === 'Dagger' ? '\u{1F52A}' :
  '⚔️'` (line 819) → `eq.weapon.name === 'Knife' ? ...`. The
  emoji codepoints (kitchen knife vs crossed swords) stay byte-identical.

### 5. `simulate.js`

- `equipCounts = { dagger: 0, sword: 0, helmet: 0, shield: 0 }` (line 62)
  → `{ knife: 0, sword: 0, helmet: 0, shield: 0 }`.
- `if (r.equipment.weapon === 'Dagger') equipCounts.dagger++` (line 64) →
  `if (r.equipment.weapon === 'Knife') equipCounts.knife++`.
- Output label `console.log(\`  Dagger:  ${pct(agg.equipment.dagger).padStart(4)}\`)`
  (line 166) → `Knife:` and `agg.equipment.knife`. Keep the trailing
  whitespace alignment so the column lines up with `Sword:`, `Helmet:`,
  `Shield:` in the printout (two trailing spaces after `Knife:` matches
  the existing two-space pattern).

### 6. `README.md`

- Line 24: `weapons (Dagger, Sword)` → `weapons (Knife, Sword)`.

### 7. `src/game.test.js`

Update every reference to match the renamed identifiers and strings:

- `equipment` describe block (lines 365–398):
  - `const dagger = { ..., type: 'dagger', char: '|', color: '#aaaaaa' }`
    → rename the local to `const knife = { ..., type: 'knife', ... }` in
    both the empty-slot test and the equal-or-worse test. Update the
    matching `items: [dagger]` references to `items: [knife]`.
  - `assert.equal(next.equipment.weapon.type, 'dagger')` → `'knife'`.
  - `assert.ok(next.messages.some(m => m.includes('equip a Dagger')))` →
    `'equip a Knife'`.
  - The "strictly better" test that already-equips a dagger:
    `equipment: { weapon: { type: 'dagger', name: 'Dagger', bonus: 2,
    stat: 'attack' }, ... }` → `{ type: 'knife', name: 'Knife', bonus: 2,
    stat: 'attack' }`.
- `spawns food and equipment` test (line 535):
  `['dagger', 'sword', 'helmet', 'shield'].includes(it.type)` →
  `['knife', 'sword', 'helmet', 'shield']`.
- Merchant stock test fixture `makeMerchantStock` (line 1571):
  `{ kind: 'equipment', subtype: 'dagger', price: 5 }` → `subtype: 'knife'`.
- Merchant equipment-purchase test (line 1684):
  `equipment: { weapon: { type: 'dagger', name: 'Dagger', bonus: 2,
  stat: 'attack' }, ... }` → `{ type: 'knife', name: 'Knife', bonus: 2,
  stat: 'attack' }`.

### 8. Current spec docs

Update *content* of these specs to reflect the new name. Filenames and spec
ids do **not** change.

- `specs/merchant-npc.md`:
  - Frontmatter `description:` (line 7): `food, daggers, equipment, scrolls`
    → `food, knives, equipment, scrolls`.
  - Price-table row `| dagger            | 5     |` (line 59) → `| knife
    | 5     |`. Keep the column alignment.
  - The example shop-menu line at line 79 that says `"Dagger (+2 atk) —
    5g"` → `"Knife (+2 atk) — 5g"`.
- `specs/throwing-dagger.md`:
  - Line 133: `Must be visibly distinct from the melee \`dagger\` glyph` →
    `from the melee \`knife\` glyph`.
  - Line 135: `to contrast with \`|\` (the melee dagger glyph)` → `(the
    melee knife glyph)`.
  - Line 148: `a distinct colour from the melee dagger.` → `from the melee
    knife.`
  - Line 205: `A dagger-equipped player hitting melee will usually
    out-DPS a thrown blade` → `A knife-equipped player hitting melee will
    usually out-DPS a thrown blade`.
  - Lines 213–217 (design-note paragraph): replace the two phrasings
    `the melee \`dagger\` equipment` → `the melee \`knife\` equipment`
    and `the dagger glyph for the melee dagger` → `the knife glyph for
    the melee knife`.
  - Frontmatter `id: throwing-dagger` and filename — unchanged.

### 9. Out of scope

- Renaming `specs/throwing-dagger.md` to `specs/throwing-knife.md` or any
  other filename change. The spec id and filename stay.
- Touching historical task specs under `specs/tasks/` that already shipped
  (e.g. `swap-dagger-emojis.md`, `fix-hud-dagger-blade-emojis.md`,
  `rename-throwing-dagger-to-blade.md`, `equipment.md`,
  `mobile-cast-throw-buttons.md`, `bot-simulator.md`,
  `cli-bot-protocol.md`, `hud-compact-messages.md`, `sprite-web-ui.md`).
  Leave them as historical records.
- Renaming the throwing weapon in any way — `throwing_blade`,
  `throwingBlades`, `bladesThrown`, `BLADE_THROW_DAMAGE`,
  `spawnThrowingBlades`, `hud-blades`, `btn-throw`, the `t` key, the
  `Throw blade` help row are all out of scope.
- Changing the kitchen-knife glyph (U+1F52A) to anything else.
- Changing the ASCII glyph `|` for the melee weapon.
- Any sprite-sheet art change (the `{ col: 0, row: 2 }` cell stays).
- Any balance, damage, drop-rate, or pricing change.

## Verify

1. `npm test` — green. All existing test cases keep their semantics; only
   identifiers and assertion strings change.

2. Grep for stale melee-dagger references — every command below must
   return zero matches in source files. The throwing-blade spec id
   `throwing-dagger` and historical task specs under `specs/tasks/` are
   expected to remain and should be excluded from the search:

   ```bash
   grep -rn "Dagger\|dagger" src/ cli.js index.html simulate.js README.md
   ```

   Expected result: **zero matches.** (The throwing-blade rename has
   already removed every `throwing_dagger` / `throwingDaggers` reference
   from these files, so any `dagger` substring left here belongs to the
   melee weapon and must be renamed.)

   ```bash
   grep -n "dagger\|Dagger" specs/merchant-npc.md
   ```

   Expected: only the `\`throwing-dagger\`` spec-id reference at lines 49
   and 234 (those are pointers to the throwing-weapon spec, not the melee
   weapon).

   ```bash
   grep -n "dagger\|Dagger" specs/throwing-dagger.md
   ```

   Expected: only the `id: throwing-dagger` frontmatter line. Every prose
   mention of "dagger" should be gone.

3. Manual smoke test in the browser (`npm run dev` or open `index.html`):
   - On level 1 or 2, find a melee weapon on the floor (the kitchen-knife
     emoji in enhanced mode, `|` in ASCII mode). Walk onto it.
   - Pickup message reads `"You equip a Knife (+2 attack)."` (or the
     existing equip-message format with "Knife" substituted for "Dagger").
   - HUD weapon line shows the kitchen-knife emoji (unchanged).
   - Visit a merchant on level 2–4. If equipment slot rolls `knife`, the
     menu reads `"Knife (+2 atk) — 5g"`. Buying it equips a Knife.
   - Throwing-blade flow is untouched: pick up a throwing blade, press
     `t`, throw — messages still read "throwing blade", HUD `Blades: N`
     still works, the `hud-blades` element id is unchanged.

4. CLI smoke test (`node cli.js` or `npm run cli` if defined):
   - Start a run, find and equip the melee weapon. Status line shows
     "Knife" (or whatever format the existing renderer uses with the new
     name).
   - Throwing-blade flow unchanged.

5. Simulator (`node simulate.js` if invoked manually):
   - Output table shows `Knife:` row instead of `Dagger:` and the
     percentage matches what the previous `Dagger:` row would have.

6. Run `npm run bump` (default `patch` per frontmatter) and commit the
   resulting `package.json` and `src/version.js` alongside the rest.

## Agent Notes

- Apply the rename uniformly. Use word-boundary searches when running
  sed-style edits — only the bare `dagger` identifier and the standalone
  `Dagger` display name are in scope. Be careful not to touch:
  - `throwing_dagger` / `throwingDagger` — already renamed; should not
    appear, but guard against accidentally re-introducing them.
  - The spec id `throwing-dagger` (in `id:` frontmatter, file path
    `specs/throwing-dagger.md`, and prose references in
    `specs/merchant-npc.md` lines 49 and 234) — keep as-is.
  - Filenames under `specs/tasks/` like `swap-dagger-emojis.md` — keep
    as-is.
- The melee weapon's HUD emoji is the kitchen-knife glyph (U+1F52A). After
  the change, verify by reading `index.html` line 819 — the existing
  `\u{1F52A}` literal should be byte-identical to what was in the file
  before; only the `=== 'Dagger'` branch becomes `=== 'Knife'`.
- The "kitchen knife" trailing comment on the enhanced glyph (line 16 of
  `src/glyphs.js`) becomes redundant after the rename (the key is now
  literally `knife`). Keeping or trimming it is fine — either is
  acceptable. Do not change the glyph itself.
- The ASCII glyph for the melee weapon stays `|`. The throwing blade is
  `-`. Do not touch either.
- For `specs/throwing-dagger.md`, do a careful pass: every prose mention
  of "the melee dagger" or `the melee \`dagger\`` becomes "the melee
  knife" / `the melee \`knife\``. The phrase `the dagger glyph for the
  melee dagger` becomes `the knife glyph for the melee knife`. Mentions
  of "throwing blade" / `throwing_blade` / `bladesThrown` etc. are about
  the *thrown* weapon and stay untouched.
- Commit messages and PR titles produced by the implementing agent must
  contain only ASCII / BMP characters — no 4-byte Unicode (no emoji
  literals). GitHub's commit-status API rejects 4-byte UTF-8 in
  descriptions, and the orchestrator publishes the spec description
  there. This spec's frontmatter `description` is already emoji-free;
  keep it that way.
