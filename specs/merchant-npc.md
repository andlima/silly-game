---
id: merchant-npc
status: not-started
area: full-stack
priority: 50
depends_on: []
description: Add a shopkeeper NPC that occasionally appears on a dungeon level and sells items (food, daggers, equipment, scrolls) for gold
---

# Merchant NPC

## Goal

Give gold somewhere to go besides the idol, and give the player a way to
shape their loadout mid-run. On some dungeon floors, a merchant appears in a
random room with a small fixed stock (food, throwing blades, equipment,
scrolls). Walking onto the merchant and pressing interact opens a keyboard
shop menu in the message area — press a number to buy, any other key to
leave.

## Design

### Spawning

- A merchant spawns with probability `0.5` on levels 2 through 4. Never on
  level 1 (players haven't collected enough gold yet) and never on level 5
  (that room is reserved for the princess, per `rescue-the-princess`).
- Placement follows existing item rules: random non-spawn room, free
  walkable tile, not on the staircase tile. Same `for attempt < 20` loop
  pattern as `spawnIdol`.
- The merchant is an item-shaped entity placed into the `items` array with
  `type: 'merchant'` plus a fixed `stock` array generated at spawn time (see
  below). Only one merchant per level.

### Stock generation

When a merchant spawns, generate exactly three stock entries. Each entry is
an object:

```js
{ kind: 'food' | 'throwing_blade' | 'equipment' | 'scroll',
  subtype: <equipment type or spell type, only for kind === 'equipment' | 'scroll'>,
  price: <gold cost> }
```

Stock composition:
- Slot 1: always `food` (the most useful reliable purchase).
- Slot 2: `throwing_blade` OR a random equipment piece, 50/50. If the run
  does not include `throwing-dagger` yet, substitute equipment.
- Slot 3: a random spell scroll (`firebolt`, `lightning`, `frost`, or
  `whirlwind`, uniform random).

Price table (gold):

| Kind              | Price |
|-------------------|-------|
| food              | 3     |
| throwing_blade    | 2     |
| dagger            | 5     |
| helmet            | 5     |
| sword             | 12    |
| shield            | 8     |
| scroll (any)      | 8     |

### Interaction

The merchant uses the same "stand on tile, press interact" pattern as the
idol.

1. `checkPickup` skips `type: 'merchant'` — no auto-pickup (mirrors idol).
2. Standing on a merchant tile and pressing `interact` opens the shop:
   - Set `shopPending: true`.
   - Attach `shopItems` to state: a deep-ish reference to the merchant's
     current `stock` (copying so later edits are immutable-safe).
   - Log a menu block in `messages`:
     ```
     Merchant: "What'll it be?"
       1) Food — 3g
       2) Throwing blade — 2g      (or "Dagger (+2 atk) — 5g", etc.)
       3) Firebolt scroll — 8g
     (press number to buy, any other key to leave)
     ```
   - Do NOT consume a turn or run monster turns.
3. While `shopPending` is true, input handling is modal:
   - Keys `1`, `2`, `3` dispatch `{ type: 'shopBuy', slot: 0|1|2 }`.
   - Any other key dispatches `{ type: 'shopClose' }`.
4. `shopBuy`:
   - If the slot is already sold-out (slot set to `null`) or out of bounds,
     re-render the shop message unchanged, no turn consumed.
   - If `inventory.gold < price`, log `"Not enough gold."`, stay in
     `shopPending`, no turn consumed.
   - Otherwise: deduct gold, apply the purchased item using the existing
     pickup semantics (see below), mark that stock slot as `null` on the
     merchant's `stock` array so it remains sold-out even if the shop is
     closed and reopened, log a purchase confirmation, stay in `shopPending`
     (player can buy more), no turn consumed.
5. `shopClose` clears `shopPending` and `shopItems`, logs
   `"You leave the merchant."`, no turn consumed.
6. Monster turns **never** run during a shop interaction. The merchant's
   presence does not freeze the level, but because the shop is instantaneous
   (no turn cost), there is nothing for monsters to do while it is open.

### Applying purchased items

Reuse the existing pickup rules rather than inventing new ones:

- `food`: `inventory.food += 1`.
- `throwing_blade`: `inventory.throwingBlades += 1` (requires the
  throwing-dagger spec to be implemented; if not, slot 2 will never be a
  dagger).
- `equipment`: call the same auto-equip branch used by `checkPickup` — if
  the new piece is strictly better than what's equipped, equip it; else
  refund the gold and log `"You already have better equipment — the
  merchant refunds your gold."`. The refund is the distinguishing edge
  case from item-on-floor pickup, because the player had to actively pay.
- `scroll`: call the same spell-slot logic as scroll pickup (equip if
  empty; swap for fresher charges of the same spell; replace a different
  spell). No refund path — the merchant makes it clear what is being
  purchased.

### Stats

Add `goldSpent` to `DEFAULT_STATS` and the stat objects in `createGame` and
`newLevel`. Increment on every successful `shopBuy` by the item's price.
Surface in the game-over stats display.

## Acceptance Criteria

### Shared game logic (`src/game.js`)

1. Add a `spawnMerchant(map, monsters, items, level)` function — 50%
   probability on levels 2–4, one merchant max, placed by the same rules as
   `spawnIdol`.
2. Stock generation produces exactly three entries per the composition rules
   above. Attach the `stock` array directly to the merchant item
   (`{ x, y, type: 'merchant', stock, char, color }`).
3. Wire `spawnMerchant` into `newLevel` alongside the existing spawn calls.
4. `checkPickup` skips `type: 'merchant'` (mirror the `idol` skip).
5. `handleInteract` handles the merchant branch BEFORE the existing idol and
   staircase branches: if standing on a merchant tile, set
   `shopPending: true`, populate `shopItems` (a reference or copy of the
   merchant's `stock`), and append the formatted menu to messages.
6. Add `'shopBuy'` action to `dispatch`: validates slot index, handles
   sold-out and insufficient-gold cases, deducts gold, applies the item,
   marks the slot `null`, logs a confirmation, increments `goldSpent`. No
   turn consumed.
7. Add `'shopClose'` action to `dispatch`: clears `shopPending` and
   `shopItems`, logs exit message, no turn consumed.
8. The shop state (`shopPending`, `shopItems`) does not persist across
   dungeon levels — leaving a level closes any open shop implicitly when
   `newLevel` resets state. The merchant item itself disappears when the
   level is regenerated (that's already how items work).
9. `shopPending` and `castPending` / `throwPending` (if present) are
   mutually exclusive — opening a shop cancels any pending cast/throw, and
   pressing a cast/throw key while a shop is open is treated as "any other
   key → close shop".
10. Equipment purchase applies the auto-equip rules. If the new piece is not
    strictly better, the purchase is refunded (gold returned, slot is NOT
    marked sold-out — the player can re-buy if they want) and a refund
    message is logged.
11. Scroll purchase applies the same spell-slot logic as floor pickup. No
    refund path.
12. Add `goldSpent: 0` to `DEFAULT_STATS` and both stat-object literals in
    `createGame` and `newLevel`; increment on every successful buy.

### Glyphs (`src/glyphs.js`)

13. Add `merchant` to `GLYPHS_ENHANCED` — suggest 🧙‍♂️ is already used for
    the player; prefer 🧔 (`\ud83e\uddd4`) or 🛒 (`\ud83d\uded2`). Pick one
    that's visually distinct from player and monsters.
14. Add `merchant` to `GLYPHS_ASCII` — suggest `M` (not wide). Pair with a
    gold/amber color to read as "friendly NPC".

### Browser frontend (`index.html`)

15. The merchant renders on the canvas with the merchant glyph and a
    distinct colour from monsters (suggested `#ffdd66`).
16. `interact` opens the shop (via the shared game logic).
17. While `game.shopPending` is true, the key handler treats `1`/`2`/`3` as
    `{ type: 'shopBuy', slot }` and any other key as
    `{ type: 'shopClose' }`. This branch sits alongside the existing
    `castPending` branch.
18. The menu text rendered into the message log is readable in the message
    panel — no separate shop UI is required. Formatting matches other
    multi-line messages in the log.
19. Game-over overlay includes `goldSpent` in the stats list.

### CLI frontend (`cli.js`)

20. Same key handling as the web frontend: 1/2/3 buy, anything else closes.
21. Merchant renders with the ASCII glyph `M` in a gold/amber hue.
22. `renderStats` includes `goldSpent` on the game-over screen.
23. Help overlay mentions the merchant briefly ("Walk onto a merchant (M)
    and press `.` to shop").

### Tests (`src/game.test.js`)

24. `spawnMerchant` respects the level gate (never on level 1 or 5) and
    obeys the 50% probability (use `setRollOverride` or a seeded RNG if
    needed — matches the pattern used by existing randomised tests).
25. Stock always has exactly three entries with the expected composition.
26. Interact on a merchant tile enters `shopPending` and populates
    `shopItems`, without running monster turns.
27. `shopBuy` with sufficient gold deducts gold, applies the item to
    inventory/equipment/spell, marks the slot `null`, and increments
    `goldSpent`.
28. `shopBuy` with insufficient gold logs `"Not enough gold."`, does not
    deduct gold, keeps the slot available, stays in `shopPending`.
29. `shopBuy` on a sold-out slot is a no-op (no crash, no deduction).
30. `shopBuy` on an equipment piece that is NOT strictly better refunds the
    gold and does not mark the slot sold-out.
31. `shopBuy` on a scroll follows the same equip/swap/replace rules as
    floor-pickup scrolls.
32. `shopClose` clears `shopPending` / `shopItems` without consuming a turn.
33. Leaving the level (`newLevel`) clears shop state implicitly (no
    merchant, no `shopPending` carryover).
34. Monster turns do not run on any shop action.

## Out of Scope

- Selling items to the merchant (one-way trade only).
- Merchant dialogue beyond a one-line greeting and item labels.
- Merchant inventory beyond the three slots, or a per-run inventory that
  persists between merchants.
- A dedicated shop UI panel or modal — the message log is the whole UI.
- Haggling, discounts, or dynamic pricing by level.
- Merchant being attacked or killed by monsters (monsters ignore them — the
  merchant has no HP and no combat state).
- Merchant being attacked by the player — bumping into the merchant tile
  diagonally or via attack-move is not a concern because movement is
  cardinal-only and the merchant tile is walkable (walk onto it instead of
  attacking).
- Multiple merchants per level.
- Dependency wiring on the `throwing-dagger` spec: if throwing blades are
  not implemented yet, the merchant substitutes equipment into slot 2
  (see stock composition rules) so this spec can ship independently.

## Design Notes

- The shop pattern reuses two existing mechanisms: item-as-entity with
  skipped auto-pickup (from idol), and modal pending state (from
  `castPending`). This keeps the new surface area small and consistent.
- Pricing is deliberately calibrated so a player who banks all gold from
  levels 2–3 can afford roughly one meaningful purchase (sword or two
  scrolls). Food is cheap enough to be a comfort buy. The idol still offers
  the best late-run sink (max HP scales with every offering), so the
  merchant and idol compete for the same gold without either dominating.
- Equipment refunds exist because the auto-equip rule ("strictly better
  only") already governs floor pickups. A player who buys an equal-bonus
  item would otherwise lose gold with no benefit — confusing UX. Scrolls
  don't get a refund because the swap/replace rules always result in *some*
  change (fresher charges or a new spell type), so the purchase is never
  meaningless.
- The shop menu renders into the message log rather than a dedicated panel
  because the message panel already scrolls, highlights, and wraps cleanly
  in both frontends. A three-line menu plus a prompt line fits without
  disrupting other messages.
- `shopPending` intentionally does not consume turns. A shop interaction
  should feel like a conversation, not a combat action. Players can open,
  inspect, and close the shop freely without penalty.

## Agent Notes

- `src/game.js:192` — `spawnIdol`. Template for `spawnMerchant`; the main
  difference is attaching a `stock` array to the spawned item and probing
  level gate 2–4.
- `src/game.js:458` — `handleInteract`. The merchant branch goes at the top
  (before idol and staircase checks), because the player stands on the
  merchant's tile, same as idol.
- `src/game.js:377` — `checkPickup`. Add `type: 'merchant'` skip alongside
  the existing `idol` skip at line 381.
- `src/game.js:315` — `dispatch`. Add `'shopBuy'` and `'shopClose'` cases;
  neither should pass through `updateFOV` because the shop doesn't move the
  player — actually, it's fine to pass through since FOV recomputes on the
  same position cheaply. Keep the dispatch uniform.
- `src/game.js:405` — scroll pickup branch. Extract or share the
  "equip scroll into spell slot" logic so shop purchases reuse exactly the
  same rules. Same for the equipment branch at `src/game.js:438`.
- `cli.js:414` and `index.html:1026` — existing `castPending` early-return
  block in input handlers. Add a `shopPending` sibling right above or below;
  it reads 1/2/3 plus "anything else closes".
- When you format the shop menu into `messages`, keep in mind the
  `MAX_MESSAGES` cap at `src/game.js:56`. Four menu lines + an empty
  separator fit comfortably; if the cap becomes a problem, consider
  rendering the menu as a single `\n`-joined message instead of multiple
  pushes.
- `src/glyphs.js:5` — `GLYPHS_ENHANCED` table. Pick a glyph that doesn't
  collide with the mage player or existing monsters.
- Check `rescue-the-princess` isn't ALREADY implemented before writing
  tests that depend on "no merchant on level 5" — if that spec ships first,
  level 5 has a princess tile; if not, level 5 has a staircase. Either way,
  the merchant level gate (2–4) keeps them disjoint.
