---
id: idol-offering
status: not-started
area: gameplay
priority: 50
depends_on: []
description: Idol entity that accepts a gold offering to fully heal the hero and increase max HP; repurpose descend key as context-sensitive interact
---

# Idol Offering

## Goal

Add an interactable idol (🗿) that the hero can offer gold to in exchange for a
permanent max-HP increase and a full heal. Repurpose the descend key (`.` / `>`)
as a context-sensitive "interact" action that works on both stairs and idols.

## Design

### Idol placement and persistence

- **Spawn**: guaranteed 1 idol per level on **levels 2, 3, and 4**. Not on
  level 1 (player has no gold yet) and not on level 5 (escape level).
- **Placement rules**: same as treasure — in a random room that is not room 0
  (spawn room), on a walkable tile, not on the stair, not colliding with other
  items or monsters.
- **Persistent**: the idol stays on the map after use. The player may offer
  multiple times as long as they have enough gold. This is naturally bounded
  because gold is finite per level (no monster respawns), so repeated offerings
  require saving gold across levels.
- **Walkable**: the idol occupies a walkable tile like any item. The player can
  stand on it. It is **not** auto-picked up.

### Offering mechanic

- **Cost**: 25 gold per offering.
- **Effect**: `player.maxHp += 5`, then `player.hp = player.maxHp` (full heal).
- **Dispatch**: triggered by the new `interact` action when the player is
  standing on an idol tile.

**Messages:**

| Case | Message |
|------|---------|
| Successful offering | `You offer 25 gold to the idol. Your vigor swells. (+5 max HP, fully healed)` |
| Not enough gold | `The idol demands 25 gold. You have N.` (where N is current gold) |
| Not standing on idol or stair | `Nothing to interact with here.` |

### Context-sensitive `interact` action

The current `descend` action becomes a specific case of a broader `interact`
action. This is keyed on what tile/entity the player is standing on.

- **New action type**: `interact`
- **Handler**: `handleInteract(game)` — checks in this order:
  1. If there is an idol item at the player's position → run offering logic
  2. Else if the tile at the player's position is a stair (`>`) → run descend
     logic (identical to current `handleDescend` behavior, including win on
     level 5)
  3. Else → append message `"Nothing to interact with here."` (replaces the
     current `"There are no stairs here."` message)

- **Backward compatibility**: keep accepting `{ type: 'descend' }` in
  `dispatch()` as an alias that routes to the same `handleInteract` handler.
  This is required because the CLI bot protocol
  (`specs/tasks/cli-bot-protocol.md`, `src/bot.js`) documents
  `{"type":"descend"}` as a public action. Rename the internal function from
  `handleDescend` to `handleInteract`; do not delete the `descend` case in the
  switch.

- **Key bindings**: `.` and `>` both dispatch `{ type: 'interact' }` in both
  `cli.js` and `index.html`. Update `VALID_ACTIONS` in `cli.js` to include
  `'interact'` (keep `'descend'` as well for the bot protocol).

### Idol as non-pickupable item

- Add `idol` as an item type: `{ x, y, type: 'idol', char: 'I', color: '#ccaa44' }`.
- Extend `checkPickup` to **skip** `itemHere.type === 'idol'` — walking onto
  the idol does nothing on its own (no pickup, no message). Interaction only
  happens via the `interact` action.
- Add a `spawnIdol(map, monsters, items, level)` function in `src/game.js`
  that runs during `newLevel` for levels 2–4.

### Glyphs

Add to both tables in `src/glyphs.js`:

```js
// GLYPHS_ENHANCED
idol: { char: '🗿', wide: true },
// GLYPHS_ASCII
idol: { char: 'I', wide: false },
```

Also add the idol char to `src/bot.js` `buildTiles` path if the item glyph
lookup does not already handle arbitrary item types via `GLYPHS_ASCII[c.item.type]`
(it does — line 21 — so no change needed there, but verify).

### HUD and button updates

- **`index.html`**:
  - Rename the `#btn-descend` button label from "Descend" to "Use". Keep the
    element id as `btn-descend` to avoid churn, but update `textContent`.
    (Alternatively change the id to `btn-interact` — implementer's call.)
  - Update the help overlay row `". or >"` description from `"Descend stairs"`
    to `"Interact / descend"`.
  - Button click handler dispatches `{ type: 'interact' }` instead of
    `{ type: 'descend' }`.
  - Keyboard handler for `.` / `>` dispatches `{ type: 'interact' }`.
  - Ensure idol renders on the map. Items already auto-render via
    `GLYPHS[c.item.type]`; the new glyph entry should be enough. Verify sprite
    mode (`SPRITE_MAP`) — add `idol: null` if needed so it falls back to the
    text/emoji glyph (same approach as `gold` per `treasure-scoring.md`).

- **`cli.js`**:
  - Update the status/help line at the bottom: change `">/.:descend"` to
    `">/.:use"` (or `":interact"`).
  - Keyboard mapping for `.` / `>` dispatches `{ type: 'interact' }`.
  - `VALID_ACTIONS` adds `'interact'`.

### Stats tracking

Add to `game.stats`:

- `idolOfferings: 0` — increment on each successful offering.

Include in the end-game summary panel (both web overlay and CLI death/win
screen) as `"Idol offerings: N"`, alongside existing stats like "Gold collected".

### Audio (optional, minimal)

Reuse an existing sound for the offering. `playPickup` or `playDescend` works.
Do not add new audio assets in this task.

## Files to change

| File | What |
|------|------|
| `src/game.js` | Rename `handleDescend` → `handleInteract` with new routing logic; add `handleInteract` branch for idol; add `interact` case in `dispatch` switch; keep `descend` as alias; add `IDOL_COST = 25` and `IDOL_MAXHP_BONUS = 5` constants; add `spawnIdol` function; call `spawnIdol` from `newLevel` for levels 2–4; extend `checkPickup` to skip idol items; add `idolOfferings` to stats and `DEFAULT_STATS` |
| `src/glyphs.js` | Add `idol` entries to `GLYPHS_ENHANCED` and `GLYPHS_ASCII` |
| `cli.js` | Add `'interact'` to `VALID_ACTIONS`; remap `.` / `>` to dispatch `interact`; update help line; include `idolOfferings` in end-game summary if that file renders one |
| `index.html` | Remap `.` / `>` and Descend button to dispatch `interact`; rename button label; update help overlay text; add `idol: null` to `SPRITE_MAP` if sprite mode needs a fallback; include `idolOfferings` in end-game stats panel |
| `src/game.test.js` | New tests (see below) |

## Tests

Add to `src/game.test.js`:

1. **Successful offering**: player with 25 gold standing on idol → dispatch
   `interact` → gold decreases by 25, maxHp increases by 5, hp equals new maxHp,
   success message logged, idol still present on map, `idolOfferings` stat is 1.
2. **Offering at full HP**: player with 25 gold and `hp === maxHp` on idol →
   interact → maxHp increases by 5, hp equals new maxHp (fully healed to new
   cap), gold deducted.
3. **Offering at low HP**: player with `hp: 3, maxHp: 30` and 25 gold on idol
   → interact → `hp === 35, maxHp === 35`.
4. **Not enough gold**: player with 24 gold on idol → interact → state
   unchanged (gold, hp, maxHp), message contains `"demands 25 gold"`, stat
   not incremented.
5. **Multi-use**: player with 50 gold on idol → interact twice → gold is 0,
   maxHp is `baseMaxHp + 10`, hp equals new maxHp, idol still on map.
6. **Walking onto idol does not pick it up**: move player onto idol tile →
   idol still present in `items`, no pickup message.
7. **Interact on stair still descends**: existing descend tests continue to
   pass. Add one test using `interact` action type directly on a stair tile →
   advances to next level.
8. **Interact on empty floor**: player standing on plain floor → dispatch
   `interact` → message `"Nothing to interact with here."`.
9. **`descend` action alias**: dispatching `{ type: 'descend' }` on a stair
   still advances to next level (bot protocol backward compat).
10. **`descend` action alias on idol**: dispatching `{ type: 'descend' }` on
    an idol with enough gold performs the offering (alias routes through same
    handler).
11. **Idol does not spawn on level 1 or level 5**: call `createGame()` in a
    loop (or use a helper that forces level) and verify no idol on level 1;
    advance to level 5 and verify no idol. (Because spawn is deterministic for
    levels 2–4, a single check per level is enough; use a seeded or bounded
    loop if the test framework allows, otherwise assert the `spawnIdol`
    function is gated on level.)

## Out of scope

- Multiple idol variants (different costs or effects).
- Idols that grant stats other than HP (e.g., attack, defense).
- Curses, risk/reward twists (e.g., failed offering).
- Custom idol audio or visual effects.
- Idol-specific sprite art (text/emoji glyph is sufficient).
- Changing the bot protocol documentation — `descend` remains the documented
  action name there, and it continues to work via alias.

## Design notes

- **Why persistent over single-use**: gold is already finite per level, so
  repeated offerings are naturally bounded without adding a "consumed" flag.
  Vanishing idols would also feel punitive when the player is a few gold
  short — they'd miss the opportunity entirely. Persistent idols give the
  player real agency over when to convert gold into durability.
- **Why full heal + maxHp increase**: makes the idol a memorable
  "limp-to-the-shrine" moment rather than a linear 5-HP transaction. Food
  (10 HP, already carried) stays useful as in-combat top-up; idol occupies a
  different role as "emergency + upgrade" button. Players naturally learn to
  approach idols at low HP to maximize value — a strategic lever, not an
  exploit.
- **Why rename handler but keep `descend` alias**: the CLI bot protocol is a
  public interface (`specs/tasks/cli-bot-protocol.md` line 40 documents
  `{"type":"descend"}`). Renaming internally reflects the broader semantics;
  keeping the alias preserves compatibility with any bot that already uses
  `descend`.
- **Constants** (put near the top of `game.js` with the other constants):
  ```js
  const IDOL_COST = 25;
  const IDOL_MAXHP_BONUS = 5;
  ```
