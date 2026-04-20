---
id: bot-simulator
status: not-started
area: cli
priority: 50
depends_on:
  - cli-bot-protocol
description: Headless simulation harness that runs a cautious bot AI through hundreds of games and reports calibration stats
---

# Bot Simulator

## Goal

Create a headless simulation harness that plays the game end-to-end using a
cautious bot AI, runs hundreds of games, and produces aggregate statistics.
The purpose is to surface calibration insights — is food too scarce, are
dragons too deadly, is level 3 a brick wall, etc.

## Architecture

Two new files:

- `src/simulator.js` — bot AI + single-game runner (no I/O)
- `simulate.js` — CLI entry point: runs N games, aggregates stats, prints report

The simulator calls `createGame()` and `dispatch()` directly — no JSON
protocol overhead, no stdin/stdout. This keeps it fast enough for hundreds of
runs.

## Bot AI (`src/simulator.js`)

A cautious, reasonable player. Each turn the bot picks one action:

### Decision priority (evaluated top to bottom)

1. **Eat food** — if HP ≤ 50% of maxHp and inventory has food.
2. **Descend** — if standing on stairs and the level feels "cleared enough"
   (no visible monsters within FOV, or HP > 70%).
3. **Fight adjacent monster** — move into the monster's tile (the engine
   treats this as an attack). Prefer attacking the weakest adjacent monster.
4. **Flee** — if HP ≤ 30% and a monster is adjacent, move away from it
   toward the nearest explored floor tile without a monster.
5. **Approach visible monster** — if monsters are visible, walk toward the
   nearest one using simple Manhattan-distance pathfinding (BFS on walkable
   tiles).
6. **Explore** — move toward the nearest unexplored tile (revealed=false)
   reachable via BFS on walkable tiles.
7. **Wait** — fallback if stuck.

### Pathfinding

Use BFS on the game map. Walkable = floor or stair tile with no monster on
it (except the target tile when approaching a monster). The bot has access to
`game.map.tiles`, `game.monsters`, `game.fov`, and `game.revealed`.

### Safety valve

Cap each game at 2000 turns to prevent infinite loops. If the cap is hit,
record the run as a loss with `causeOfDeath: "timeout"`.

## Single-game runner

```js
export function runGame(seed?) → {
  won: boolean,
  level: number,          // level reached
  turns: number,
  stats: game.stats,      // monstersKilled, damageDealt, damageTaken, foodUsed, stepsTaken, causeOfDeath
  equipment: { weapon, helmet, shield },  // final equipment (name or null)
  foodFound: number,      // total food picked up during the run
  itemsFound: number,     // total items picked up
}
```

Internally: `createGame()` → loop `chooseAction(game)` → `dispatch(game, action)` until
`game.gameOver` or `game.won` or turn limit.

Track `foodFound` and `itemsFound` by counting `pickup` events in
`game.messages` each turn (same diff approach as the bot protocol).

## CLI entry point (`simulate.js`)

```bash
node simulate.js [--runs N] [--json]
```

- `--runs N` — number of games to simulate (default 100)
- `--json` — output raw JSON instead of formatted table

### Console output (default)

```
=== Silly Game Simulator — 500 runs ===

Overall
  Win rate:          34.2%
  Avg level reached: 3.4
  Avg turns/game:    287
  Timeouts:          2 (0.4%)

Deaths by level
  Level 1:  12.0%
  Level 2:  24.6%
  Level 3:  38.8%
  Level 4:  18.4%
  Level 5:   6.2%

Deaths by monster
  Rat:       8.2%
  Skeleton: 42.0%
  Bear:     31.6%
  Dragon:   18.2%

Combat
  Avg damage dealt:  84.3
  Avg damage taken:  61.2
  Avg monsters killed: 12.4

Items
  Avg food found:    4.2
  Avg food used:     3.8
  Food used at avg HP%: 42%

Equipment (% of games where found)
  Dagger:  62%
  Sword:   38%
  Helmet:  58%
  Shield:  34%

Equipment impact on win rate
  Had weapon:   48% win rate
  No weapon:    12% win rate
  Had shield:   52% win rate
  No shield:    28% win rate
```

### JSON output (`--json`)

```json
{
  "runs": 500,
  "summary": { "winRate": 0.342, "avgLevel": 3.4, "avgTurns": 287, "timeouts": 2 },
  "deathsByLevel": { "1": 0.12, "2": 0.246, ... },
  "deathsByMonster": { "rat": 0.082, ... },
  "combat": { "avgDamageDealt": 84.3, "avgDamageTaken": 61.2, "avgMonstersKilled": 12.4 },
  "items": { "avgFoodFound": 4.2, "avgFoodUsed": 3.8 },
  "equipment": { "dagger": 0.62, "sword": 0.38, "helmet": 0.58, "shield": 0.34 },
  "equipmentWinRate": { "hadWeapon": 0.48, "noWeapon": 0.12, "hadShield": 0.52, "noShield": 0.28 },
  "raw": [ ... per-run results ... ]
}
```

## Changes

### New: `src/simulator.js`

- `chooseAction(game)` — bot AI decision function, returns an action object
- `runGame()` — single-game loop, returns per-run result object
- Helper: `bfs(game, startX, startY, goalFn)` — BFS pathfinding returning
  the first step direction toward the nearest goal

### New: `simulate.js`

- CLI entry point, parses `--runs` and `--json` flags
- Runs N games via `runGame()`, collects results
- `aggregateStats(results)` — computes all summary statistics
- `printReport(aggregated)` — formatted console output
- `printJson(aggregated, results)` — JSON dump

### No changes to existing files

The simulator imports from `src/game.js` only. It does not modify the game
engine, bot protocol, or any rendering code.

## Verify

- `node simulate.js --runs 10` completes without error and prints a readable
  report to stdout
- `node simulate.js --runs 10 --json` outputs valid JSON with all expected
  fields
- `node simulate.js` (no flags) defaults to 100 runs
- Bot AI does not crash or infinite-loop — the 2000-turn safety valve
  triggers in <1% of runs
- Stats are plausible (win rate between 10-60%, deaths concentrate on
  mid-levels, equipment correlates with win rate)
- The simulator runs 100 games in under 10 seconds
- All existing tests still pass (`node --test src/game.test.js src/bot.test.js`)
