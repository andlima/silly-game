---
id: idol-cost-equals-maxhp
status: not-started
area: gameplay
priority: 50
depends_on: []
description: Idol offering cost scales with the hero's current max HP instead of a flat 25 gold, making each successive offering costlier
---

# Idol Cost Scales With Max HP

## Goal

Rebalance the idol offering mechanic so the gold cost of each offering equals
the hero's **current** `player.maxHp` at the moment of the offering. Successive
offerings become more expensive as the hero's max HP grows, creating a natural
diminishing-returns curve.

The `+5 max HP` bonus and full heal stay the same; only the cost changes from a
flat `25` to `player.maxHp`.

## Why

The flat 25-gold cost is too cheap mid-to-late game: once the player has saved
up gold, they can offer back-to-back for a near-linear max-HP ramp. Scaling the
cost with current max HP means each offering effectively requires ~6 turns more
of gold accumulation than the previous one, turning the idol from a mashable
upgrade into a strategic spend.

### Cost progression

Starting at `maxHp = 30`, bonus = `+5`:

| Offering | Cost paid | maxHp after |
|---------:|----------:|------------:|
| 1        | 30        | 35          |
| 2        | 35        | 40          |
| 3        | 40        | 45          |
| 4        | 45        | 50          |
| 5        | 50        | 55          |

Cumulative gold for N offerings is `5N² + 25N` (starting from 30).

## Design

### Cost computation

- Cost is read from `game.player.maxHp` **at the moment the offering is
  attempted**, before the bonus is applied.
- The `+5 maxHp` bonus and the "fully healed to new max" effect are unchanged.
- The `IDOL_MAXHP_BONUS` constant stays at `5`.

### Remove the `IDOL_COST` constant

The current `export const IDOL_COST = 25;` in `src/game.js:34` becomes
meaningless once cost is dynamic. Remove the export and the constant entirely.
All call sites currently using `IDOL_COST` must switch to reading
`game.player.maxHp` (or `player.maxHp` where `player` is already in scope).

**No replacement helper / export** — the formula is a single field lookup, so an
`idolCost(game)` helper would be pure ceremony. Callers that already have
`game` or `player` in scope should read `player.maxHp` directly.

### Handler changes — `src/game.js`

In `handleInteract` (`src/game.js:363`), inside the `idolHere` branch:

```js
const cost = player.maxHp;
if (game.inventory.gold < cost) {
  const messages = [...game.messages, `The idol demands ${cost} gold. You have ${game.inventory.gold}.`];
  return { ...game, messages: messages.slice(-MAX_MESSAGES) };
}
const newMaxHp = player.maxHp + IDOL_MAXHP_BONUS;
const messages = [...game.messages, `You offer ${cost} gold to the idol. Your vigor swells. (+${IDOL_MAXHP_BONUS} max HP, fully healed)`];
return {
  ...game,
  player: { ...player, maxHp: newMaxHp, hp: newMaxHp },
  inventory: { ...game.inventory, gold: game.inventory.gold - cost },
  stats: { ...getStats(game), idolOfferings: getStats(game).idolOfferings + 1 },
  messages: messages.slice(-MAX_MESSAGES),
};
```

Both messages now interpolate the dynamic `cost` rather than a static constant.

### Simulator / bot updates — `src/simulator.js`

Four call sites currently reference `IDOL_COST`. Replace each with a check
against the player's current max HP:

| Line | Context | Before | After |
|-----:|---------|--------|-------|
| 1   | `import { createGame, dispatch, EQUIPMENT_TYPES, IDOL_COST } from './game.js';` | imports `IDOL_COST` | Drop `IDOL_COST` from the import list |
| 70  | `findExploreTarget` — idol affordability gate before adding to candidate set | `if (inventory.gold >= IDOL_COST)` | `if (inventory.gold >= player.maxHp)` — `player` is already destructured from `game` at line 56 of that function (verify; if not, destructure it) |
| 149 | `chooseAction` — standing-on-idol check | `if (idolHere && inventory.gold >= IDOL_COST)` | `if (idolHere && inventory.gold >= player.maxHp)` |
| 237 | `chooseActionBeeline` — standing-on-idol check | same | `if (idolHere && inventory.gold >= player.maxHp)` |
| 300 | `runGame` — useful-items filter | `if (it.type === 'idol') return game.inventory.gold >= IDOL_COST;` | `if (it.type === 'idol') return game.inventory.gold >= game.player.maxHp;` |

The bot's "offer if standing on idol and can afford it" heuristic stays
correct under the new rule — if the first offering is affordable now, taking
it is still the right move because the next offering will cost more than the
current one anyway.

### Test updates — `src/game.test.js`

Update the existing `describe('idol offering', …)` block (currently starts
around line 875) so every test uses the correct cost for the hero's starting
`maxHp`. The `makeGame` helper defaults to the fresh `PLAYER_STATS` (`maxHp:
30`), so unless a test overrides `player.maxHp`, the expected cost is **30**.

Specific updates:

1. **Successful offering** (line 876) — `inventory: { gold: 25 }` → `{ gold: 30 }`;
   assert `next.inventory.gold === 0`; message assertions change from `'offer 25 gold'`
   → `'offer 30 gold'`. `next.player.maxHp` still `35`, `hp` still `35`.
2. **Offering at full HP** (line 889) — `gold: 25` → `gold: 30`; still asserts
   `maxHp === 35`, `hp === 35`, `inventory.gold === 0`.
3. **Offering at low HP** (line 898) — `gold: 25` → `gold: 30`; still asserts
   `hp === 35`, `maxHp === 35`.
4. **Not enough gold** (line 906) — `gold: 24` → `gold: 29`; message assertion
   `'demands 25 gold'` → `'demands 30 gold'`; state unchanged assertions stay
   (`gold: 29`, `hp: 20`, `maxHp: 30`).
5. **Multi-use** (line 917) — The existing "50 gold, two offerings" scenario
   no longer works: first costs 30 (leaving 20), second would cost 35 and
   fail. Rewrite this test to use `gold: 65`:
   - Start: `{ gold: 65, player: { hp: 20, maxHp: 30 } }`
   - After first `interact`: `gold === 35`, `maxHp === 35`, `hp === 35`
   - After second `interact`: `gold === 0`, `maxHp === 40`, `hp === 40`
   - Idol still on map
6. Tests 6–11 (walking onto idol, interact on stair, interact on floor, descend
   alias, idol spawn gating) are **unchanged** — they don't assert on cost.
   Test 10 ("descend alias on idol with enough gold performs the offering")
   needs its gold amount bumped to `30` if it currently uses `25`.

**Add one new test** at the end of the `describe('idol offering', …)` block:

```js
it('cost scales with current maxHp — successive offerings cost more', () => {
  const idol = { x: 2, y: 2, type: 'idol', char: 'I', color: '#ccaa44' };
  // Need 30 + 35 + 40 = 105 gold for three offerings
  const game = makeGame({ items: [idol], inventory: { gold: 105 }, player: { hp: 30, maxHp: 30 } });
  const g1 = dispatch(game, { type: 'interact' });
  assert.equal(g1.inventory.gold, 75);   // paid 30
  assert.equal(g1.player.maxHp, 35);
  const g2 = dispatch(g1, { type: 'interact' });
  assert.equal(g2.inventory.gold, 40);   // paid 35
  assert.equal(g2.player.maxHp, 40);
  const g3 = dispatch(g2, { type: 'interact' });
  assert.equal(g3.inventory.gold, 0);    // paid 40
  assert.equal(g3.player.maxHp, 45);
  assert.equal(g3.stats.idolOfferings, 3);
});
```

**Add one "affordability after upgrade" test** verifying the message on the
*second* attempt reflects the new cost:

```js
it('second offering demands the new (higher) maxHp cost', () => {
  const idol = { x: 2, y: 2, type: 'idol', char: 'I', color: '#ccaa44' };
  // 30 gold = exactly one offering, then second attempt should fail with "demands 35"
  const game = makeGame({ items: [idol], inventory: { gold: 30 }, player: { hp: 30, maxHp: 30 } });
  const g1 = dispatch(game, { type: 'interact' });
  assert.equal(g1.inventory.gold, 0);
  assert.equal(g1.player.maxHp, 35);
  const g2 = dispatch(g1, { type: 'interact' });
  assert.equal(g2.inventory.gold, 0);
  assert.equal(g2.player.maxHp, 35);
  assert.ok(g2.messages.some(m => m.includes('demands 35 gold')));
});
```

### Non-changes

- **`src/bot.js`** — does not reference `IDOL_COST`; no change.
- **`cli.js`** — does not reference `IDOL_COST`; no change. End-game
  `idolOfferings` counter is unaffected.
- **`index.html`** — does not reference `IDOL_COST`; no change. HUD button and
  help overlay copy stay the same (they do not display the cost).
- **`simulate.js`** — only reads `stats.idolOfferings`; no change.
- **Glyphs, spawn logic, stats wiring, `descend` alias, `checkPickup`
  skip** — all unchanged.

## Files to change

| File | What |
|------|------|
| `src/game.js` | Delete `export const IDOL_COST = 25;` (line 34). In `handleInteract`, compute `const cost = player.maxHp;` and use it in the affordability check, message templates, and gold deduction. |
| `src/simulator.js` | Drop `IDOL_COST` from the `game.js` import. Replace four `inventory.gold >= IDOL_COST` / `game.inventory.gold >= IDOL_COST` sites with `player.maxHp` / `game.player.maxHp`. |
| `src/game.test.js` | Update 5 existing idol-offering tests (gold amounts and message substrings). Add 2 new tests covering scaling cost across offerings and the "second attempt fails at the new cost" case. |

## Acceptance criteria

- `src/game.js` no longer exports or defines `IDOL_COST`.
- `grep -r IDOL_COST src/ cli.js index.html simulate.js` returns zero hits.
- All existing idol-offering tests pass after their gold-amount updates.
- The two new tests (scaling cost, second-attempt cost bump) pass.
- The full test suite (`npm test` / `node --test`) passes.
- Manual smoke: start a new game, descend to level 2, reach 30 gold, interact
  with an idol — offering succeeds; inventory shows 0 gold; max HP is 35.
- Manual smoke: save 65 gold, interact on idol → 35 left, maxHp 35; interact
  again → 0 left, maxHp 40.
- Bot simulator (`node simulate.js` or whatever the entrypoint is) runs to
  completion without errors and still reports `idolOfferings` in its summary.

## Out of scope

- Changing the `+5 maxHp` bonus amount or adding a heal modifier.
- Changing idol spawn rules (still levels 2–4, same placement).
- Adding an in-HUD display of the current idol cost (the message on failed
  attempts already tells the player).
- Making cost scale with level, floor, or any factor other than `player.maxHp`.
- Refunding or altering prior idol-offering behavior retroactively — this is a
  forward-only rebalance.
- Updating the older `specs/tasks/idol-offering.md` — that spec documents the
  original design at the time of its implementation and should not be
  rewritten. This new spec supersedes its cost rule.
- Updating `specs/tasks/simulator-gold-and-idols.md` — same reasoning. Its
  `IDOL_COST` references are historical; the simulator code itself is the
  source of truth and is updated here.

## Design notes

- **Why remove `IDOL_COST` entirely instead of keeping a helper**: the formula
  is `player.maxHp` — a single field read. A helper or re-exported constant
  would add an indirection with zero clarity gain. Inlining keeps the
  simulator's affordability checks obviously correct.
- **Why `player.maxHp` and not `player.maxHp` minus something**: the user's
  ask is literally "the cost should be exactly the current HP-max". Any offset
  (e.g. `maxHp - 5` so cost == pre-offering value - bonus) would contradict
  that phrasing.
- **Why the bot heuristic still works**: if `gold >= maxHp` now, offering
  immediately is always at least as good as waiting, because after the
  offering `maxHp` grows by 5 and the next cost will be `oldMaxHp + 5` — the
  bot would need to collect at least 5 more gold *and* arrive back at the
  idol to get the same result. Greedy-on-contact stays optimal.
