---
id: simulator-gold-and-idols
status: not-started
area: simulation
priority: 50
depends_on:
  - bot-simulator
  - treasure-scoring
  - idol-offering
description: Teach the simulator bot to collect gold piles and offer at idols, and report gold/idol stats in the aggregate output
---

# Simulator: Gold & Idol Awareness

## Goal

The bot AI in `src/simulator.js` currently ignores two complete gameplay
systems: **floor gold piles** and **idols**. Gold only trickles in through
monster drops (handled in `playerAttack`, which the bot benefits from
passively), floor piles are never pathed toward, and idols are never offered
to — so the +5 maxHp / full-heal mechanic is effectively invisible to the
simulator.

Fix the bot so it actively collects gold and offers at idols, and surface the
resulting stats in `simulate.js` so calibration work can see them.

## Problem details

Three concrete gaps in the current code:

1. **`findExploreTarget` ignores gold and idols** (`src/simulator.js:52`).
   It only considers food and equipment upgrades as targets. Gold piles
   (`type: 'gold'`) and idols (`type: 'idol'`) never get selected.

2. **`chooseAction` never dispatches `interact`** on an idol. Even if the bot
   wanders onto an idol tile with ≥ 25 gold, it will move through / past it.

3. **`usefulItems` filter misclassifies idols** (`src/simulator.js:254`).
   The filter `return true` fallback treats idols as "always useful" (because
   they're neither equipment nor food), so the beeline trigger
   `usefulItems.length === 0` never fires as long as an idol exists on the
   level — even when the bot has 0 gold and cannot possibly use it. This
   delays beeline mode on levels 2–4.

Additionally, `aggregateStats` / `printReport` / `printJson` in `simulate.js`
do not surface `goldCollected` or `idolOfferings`, even though both already
exist on `game.stats` (added by `treasure-scoring` and `idol-offering`). So
even the stats we *do* collect today are invisible in the report.

## Design

### Bot AI changes (`src/simulator.js`)

#### 1. Extend `findExploreTarget` to consider gold and idols

Rewrite the "useful item" selection so it understands all item types:

- **Food**: useful (as today).
- **Equipment**: useful only if it would upgrade the current slot (as today).
- **Gold pile**: always useful.
- **Idol**: useful only when `game.inventory.gold >= IDOL_COST` **and**
  (`game.player.hp < game.player.maxHp` **or** the idol is closer than any
  other useful target). The HP clause ensures the bot takes the emergency-heal
  value; the proximity clause lets it pick up "free" maxHp boosts when it's
  walking past anyway without diverting across the map at full HP.

Export `IDOL_COST` from `src/game.js` (currently a module-private constant) so
the simulator can reference it without hard-coding `25`. Alternatively, the
implementer may hard-code `25` in the simulator with a comment — both are
acceptable; prefer the export for maintainability.

Target selection remains Manhattan-distance greedy:

```js
// Pseudocode
let best = null, bestDist = Infinity;
for (const it of items) {
  if (!isUseful(it, game)) continue;
  const d = manhattan(it, player);
  if (d < bestDist) { bestDist = d; best = it; }
}
```

Idols add one wrinkle: when `hp === maxHp`, idols should only be selected if
they're the *closest* useful target (proximity gate). Implement by computing
the best non-idol target first, then allowing an idol to override only if its
distance is ≤ that target's distance (or strictly less — implementer's call,
document which). When `hp < maxHp`, idols compete on equal footing with
other targets.

#### 2. Interact with idols in `chooseAction`

Add a new decision step that fires **after** "eat food" and **before**
"descend":

```
1.5. Offer at idol — if standing on an idol AND gold >= IDOL_COST,
     dispatch { type: 'interact' }.
```

Rationale for ordering:

- **After eat food**: the bot doesn't waste an offering on a HP it could have
  restored with a 0-cost food item. Actually no — food costs a turn too, and
  the idol fully heals. Re-read: `handleUseFood` heals up to `FOOD_HEAL = 10`,
  whereas the idol fully heals. If `hp ≤ 50%` *and* the bot has food *and*
  the bot is on an idol with gold, the food rule fires first and eats one
  food. That's fine — food is cheaper than gold. Keep ordering as stated.
- **Before descend**: obvious — don't skip the free upgrade by descending
  the stairs the same turn.

The interact rule should fire whenever `hp < maxHp` OR the bot arrived here
because `findExploreTarget` selected the idol (implying the proximity gate
was satisfied). In practice a simpler formulation works: **if standing on an
idol AND `gold >= IDOL_COST`, always interact.** Worst case is a wasted
offering at full HP when the bot randomly ends up on an idol tile, which is
rare and still gains +5 maxHp — not actually a waste. Prefer this simpler
rule.

#### 3. Fix the `usefulItems` filter

In the `runGame` main loop (`src/simulator.js:254`), replace the
`return true // food` fallback with a type-aware check:

```js
const usefulItems = game.items ? game.items.filter(it => {
  if (it.type === 'food') return true;
  if (it.type === 'gold') return true;
  if (it.type === 'idol') return game.inventory.gold >= IDOL_COST;
  const eqDef = EQUIPMENT_TYPES[it.type];
  if (eqDef) {
    const current = game.equipment[eqDef.slot];
    return !current || current.bonus < eqDef.bonus;
  }
  return false;
}) : [];
```

This mirrors the `findExploreTarget` logic and ensures beeline mode triggers
correctly when the only remaining item is an unaffordable idol.

#### 4. Beeline mode also interacts on idols

In `chooseActionBeeline`, add a mirror of rule 1.5 *before* the descend
check: if standing on an idol with enough gold, interact. This is a free
boost, no reason to skip it even when racing for the stairs.

Beeline mode should **not** path toward idols — the whole point of beeline is
to abandon exploration. Only the "standing on it right now" case applies.

### Reporting changes (`simulate.js`)

#### Aggregate additions

In `aggregateStats`, add:

```js
const avgGoldCollected = results.reduce((s, r) => s + (r.stats.goldCollected || 0), 0) / n;
const avgIdolOfferings = results.reduce((s, r) => s + (r.stats.idolOfferings || 0), 0) / n;

// Idol impact on win rate
const usedIdol = results.filter(r => (r.stats.idolOfferings || 0) > 0);
const noIdol = results.filter(r => (r.stats.idolOfferings || 0) === 0);
const idolWinRate = {
  usedIdol: usedIdol.length > 0 ? usedIdol.filter(r => r.won).length / usedIdol.length : 0,
  noIdol:   noIdol.length   > 0 ? noIdol.filter(r => r.won).length   / noIdol.length   : 0,
};
```

Surface these in the returned aggregate object under new keys:

```js
return {
  ...existing,
  economy: {
    avgGoldCollected: +avgGoldCollected.toFixed(1),
    avgIdolOfferings: +avgIdolOfferings.toFixed(2),
  },
  idolWinRate,
};
```

#### Console output

Add two new sections to `printReport`:

```
Economy
  Avg gold collected:  23.4
  Avg idol offerings:  0.82

Idol impact on win rate
  Used idol:    58% win rate
  No idol:      22% win rate
```

Place "Economy" between "Items" and "Equipment", and "Idol impact on win
rate" immediately after "Equipment impact on win rate".

#### JSON output

`printJson` already spreads `...agg`, so the new fields flow through
automatically. No separate change needed.

### runGame result object

`runGame` already returns `stats: game.stats`, which includes
`goldCollected` and `idolOfferings`. No changes to the result shape are
required — the aggregate just needs to read fields it was previously
ignoring.

## Files to change

| File | What |
|------|------|
| `src/game.js` | Export `IDOL_COST` constant (optional but preferred). One-line change: `export const IDOL_COST = 25;` (move it from `const` to named export). Update the one internal reference if needed. |
| `src/simulator.js` | Rewrite `findExploreTarget` to handle gold and idol targets with proximity gating for idols at full HP; add idol-interact step in `chooseAction` (after `useFood`, before `descend`); add idol-interact step in `chooseActionBeeline` (before descend); fix `usefulItems` filter in `runGame` main loop to match. |
| `simulate.js` | Add `economy` block and `idolWinRate` block to `aggregateStats`; add "Economy" and "Idol impact on win rate" sections to `printReport`. |

## Verify

Run these checks after implementation:

1. **Existing tests pass**: `node --test src/game.test.js src/bot.test.js`
2. **Simulator runs cleanly**: `node simulate.js --runs 50` produces a
   readable report with the new Economy and Idol-impact sections.
3. **Gold is collected**: the Economy line `Avg gold collected` is
   substantially > 0 (it should be at least in the teens — baseline monster
   drops plus floor piles).
4. **Idols are used**: `Avg idol offerings` > 0 on a 50-run sample
   (idols spawn on levels 2–4, floor treasure plus monster drops typically
   produce enough gold by level 3).
5. **Idol impact visible**: `Idol impact on win rate` section shows both
   buckets with sensible percentages (the "Used idol" bucket should not be
   empty on a 100-run sample).
6. **JSON includes new fields**: `node simulate.js --runs 5 --json | head` 
   shows `economy` and `idolWinRate` keys.
7. **Beeline sanity**: no regression in timeout rate — the beeline trigger
   should fire *more* reliably now that idols no longer prop up
   `usefulItems.length`, not less.

Eyeball sanity: compare win rate and avg gold collected before/after the
change on a 200-run sample. Win rate should go up (more gold → more idol
offerings → more maxHp), and if it doesn't, the bot is likely wasting turns
diverting to idols it can't afford — re-check the proximity gate.

## Out of scope

- Smarter gold-saving strategy (e.g., "skip this equipment room, save turns
  for the idol"). The bot stays greedy.
- Multi-idol planning (choosing between two visible idols).
- Teaching the bot to avoid interact on idols when at full HP to save the
  maxHp for later. As noted above, the simpler always-interact rule is
  intentional.
- Adding a `src/simulator.test.js` test suite. The simulator currently has
  no unit tests; this task does not change that. Verification is by running
  the CLI and sanity-checking the report.
- Changes to the in-game bot protocol (`src/bot.js`), the game engine
  (`src/game.js`) beyond the optional `IDOL_COST` export, or any rendering
  code.
- New stats beyond gold and idol offerings. `goldCollected` and
  `idolOfferings` already exist on `game.stats`; this task only surfaces
  them.

## Design notes

- **Why always-interact on idols**: full HP + 25 gold on an idol tile is a
  rare edge case. The "wasted" offering still buys +5 maxHp, so it's
  strictly positive. The simpler rule avoids a fragile "was this my chosen
  target?" check in `chooseAction`.
- **Why proximity-gate idols at full HP in `findExploreTarget`**: at full
  HP, the only reason to visit an idol is the maxHp upgrade. Diverting
  across the map for +5 maxHp is usually a net loss (turns spent walking
  could be spent killing monsters or descending). Gating on "idol is
  closest" means the bot only takes the upgrade when it's cheap.
- **Why export `IDOL_COST` rather than hard-coding**: the constant already
  exists in `game.js`. If it changes, the simulator silently desyncs.
  One-line export is the right trade-off. Hard-coding with a comment is
  acceptable if the implementer wants to avoid touching `game.js` entirely.
- **Why not add simulator tests**: the simulator is a diagnostic tool, not
  production gameplay. Its correctness is measured by whether the reported
  stats match reality, which the verify steps cover by eyeball.
