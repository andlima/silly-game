---
id: spell-firebolt
status: not-started
area: full-stack
priority: 50
depends_on:
  - equipment
description: Add a spell system with Firebolt as the first directional ranged attack — scroll-based, limited charges, cast via direction key
---

# Spells: Firebolt

## Goal

Add a spell system to the game, introducing the first ranged attack. Players find
spell scrolls on dungeon floors, equip them into a spell slot, and cast them in a
cardinal direction. The Firebolt spell fires a bolt that travels in a straight line
until it hits a monster (dealing damage) or a wall.

This task implements the full spell infrastructure (data types, spell slot, casting
action, projectile resolution) plus one spell: **Firebolt**.

## Spell System Design

### SPELL_TYPES constant

Follows the existing `MONSTER_TYPES` / `EQUIPMENT_TYPES` pattern:

```js
const SPELL_TYPES = {
  firebolt: {
    name: 'Firebolt',
    char: '~',
    color: '#ff6600',
    damage: 8,
    charges: 3,
    description: 'Hurls a bolt of fire in a straight line.',
  },
};
```

### Spell slot

A single spell slot on the game state (like equipment slots):

```js
spell: null   // or { type: 'firebolt', name: 'Firebolt', charges: 3 }
```

### Casting flow

1. Player presses `f` (cast key).
2. Game enters `castPending` mode — HUD shows "Cast spell — choose direction".
3. Player presses a direction key (n/s/e/w or equivalent arrow/wasd).
4. Bolt resolves instantly (no animation tick needed in game logic — frontends
   may optionally animate). The bolt travels from the player's position in the
   chosen direction, tile by tile:
   - If it hits a **monster**: deal `SPELL_TYPES[type].damage` (ignoring defense,
     spells bypass armor), log a message, and stop.
   - If it hits a **wall**: log a miss/fizzle message and stop.
5. One charge is consumed. When charges reach 0, the spell slot is cleared and a
   message is logged ("Your Firebolt scroll crumbles to dust.").
6. Monster turns run after casting (consumes a turn like any other action).
7. If `castPending` is active and the player presses any non-direction key
   (including `f` again), cancel cast mode and log "Spell cancelled." without
   consuming a turn.

### Scroll spawning

- 0–1 spell scrolls per level, starting from level 2.
- Placed in a random room (not spawn room), on a walkable tile free of monsters
  and other items — same placement logic as equipment.
- Walking onto a scroll auto-picks it up:
  - If spell slot is empty: equip it ("You pick up a Firebolt scroll (3 charges).").
  - If spell slot is occupied with fewer or equal charges of the same spell: replace
    it ("You swap for a fresher Firebolt scroll.").
  - If spell slot is occupied with a different spell or more charges: skip pickup
    ("You already carry a spell scroll.").

### Stats tracking

Add `spellsCast` counter to `stats` object (for game-over summary).

## Acceptance Criteria

### Shared game logic (`src/game.js`)

1. Define `SPELL_TYPES` with `firebolt` entry (name, char, color, damage, charges,
   description). Export it.
2. Add `spell: null` to initial game state and `castPending: false` flag.
3. `spell` and `castPending` persist across level transitions (like equipment).
4. Add `spawnScrolls(map, monsters, items, level)` function — 0–1 scrolls on
   levels 2+, placed in non-spawn rooms on free walkable tiles.
5. Extend `checkPickup` with scroll pickup logic (auto-equip into spell slot
   using rules above).
6. Add `'cast'` action to `dispatch` — sets `castPending: true` if player has a
   spell with charges > 0, otherwise logs "You have no spell to cast.".
7. Add `'castDir'` action to `dispatch` — accepts a direction, resolves the bolt,
   applies damage, decrements charges, clears `castPending`, runs monster turns.
8. Add `'castCancel'` action to `dispatch` — clears `castPending`, logs message,
   does NOT consume a turn (no monster turns).
9. Bolt resolution: iterate from player position in the chosen direction, tile by
   tile, checking for monsters then walls. Damage ignores defense (raw spell
   damage). If monster is killed, award gold drop and increment `monstersKilled`.
10. Add `spellsCast` to `stats` object, increment on successful cast.
11. Add `stats.spellsCast` to game-over display data.

### Glyphs (`src/glyphs.js`)

12. Add `firebolt` entry to both `GLYPHS_ENHANCED` (🔥 or `'*'` emoji) and
    `GLYPHS_ASCII` (`~`).

### Browser frontend (`index.html`)

13. `f` key triggers `'cast'` action; while `castPending`, direction keys trigger
    `'castDir'` and any other key triggers `'castCancel'`.
14. HUD displays current spell and charges (e.g., "Spell: Firebolt x3") or
    "Spell: —" when empty.
15. Scroll items render on the map with firebolt glyph and color.
16. When `castPending`, show a prompt in the message area: "Cast spell — choose
    direction (←↑↓→)".

### CLI frontend (`cli.js`)

17. `f` key triggers `'cast'` action; while `castPending`, direction keys trigger
    `'castDir'` and any other key triggers `'castCancel'`.
18. HUD displays current spell and charges.
19. Scroll items render on the map with ASCII glyph and color.

### Tests (`src/game.test.js`)

20. Picking up a scroll into an empty spell slot equips it.
21. Casting Firebolt in a direction hits the first monster in the line and deals
    correct damage (spell damage, not affected by defense).
22. Casting Firebolt that hits a wall logs a fizzle message.
23. Charges decrement on each cast; scroll is cleared at 0 charges.
24. Casting with no spell logs an appropriate message.
25. `castCancel` clears pending state without consuming a turn.
26. Monster killed by spell drops gold and increments stats.
27. Spell slot persists across level transitions.

## Out of Scope

- Multiple spell slots or spell inventory.
- Spell damage variance (spells deal flat damage for now).
- Area-of-effect spells.
- Status effects (freeze, knockback) — reserved for future spells.
- Spell animations in the game loop (frontends may add visual flair independently).
- Monsters casting spells.
- Mana or cooldown systems (charge-based only).

## Design Notes

- Spells intentionally bypass armor/defense — this makes them feel distinct from
  melee and valuable against high-defense enemies (bears, dragons).
- Firebolt's 8 damage is tuned to be meaningful but not overpowered: it one-shots
  rats and two-shots skeletons, but takes 3–4 hits for bears/dragons. With only
  3 charges per scroll, players must use them tactically.
- The `castPending` flag is a lightweight modal state — it doesn't pause the game,
  just changes how the next keypress is interpreted. This avoids adding a full
  targeting UI.
- The charge system creates interesting decisions: use Firebolt on a skeleton to
  avoid melee damage, or save charges for the dragon?

## Agent Notes

- `dispatch()` is the central state reducer (around line 260). Add `'cast'`,
  `'castDir'`, and `'castCancel'` cases there.
- `handleMove()` (line 287) shows the pattern for direction-based actions.
- `playerAttack()` (line 450) shows the combat/gold-drop/stats pattern — reuse
  the same monster-kill logic for spell kills.
- `newLevel()` (line 68) is where `spawnScrolls` should be called, alongside
  existing spawn functions.
- `checkPickup()` (line 314) is where scroll auto-pickup logic goes.
- The `equipment` state field (line 94) shows how to persist a slot across levels
  — follow the same pattern for `spell`.
- Both frontends handle keybindings in their input handlers — search for `'move'`
  dispatch calls to find where to add cast key handling.
- Keep the `castPending` check early in the input handler: if pending, intercept
  direction keys for `'castDir'` before they become `'move'` actions.
