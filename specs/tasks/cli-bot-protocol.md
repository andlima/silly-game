---
id: cli-bot-protocol
status: not-started
area: cli
priority: 50
depends_on: []
description: Add a --bot flag to cli.js that speaks a JSON-line protocol over stdin/stdout for programmatic play
---

# CLI: Bot Protocol

## Goal

Add a `--bot` flag to the CLI that replaces the interactive TUI with a
JSON-line protocol over stdin/stdout. This lets any language drive the game
via pipes (`node cli.js --bot`), paving the way for programmable or AI players.

## Protocol

### Startup

On launch, write the initial game state (see **State object** below) as a
single JSON line to stdout. Then wait for input.

### Turn loop

1. Read one JSON line from stdin — an **action object**.
2. Dispatch it to the game engine.
3. Write the resulting **state object** as one JSON line to stdout.
4. If `gameOver` or `won` is true, exit with code 0 after writing the final state.

### Action object

Same shape the engine already accepts:

```json
{"type":"move","dir":"n"}
{"type":"wait"}
{"type":"useFood"}
{"type":"descend"}
{"type":"restart"}
```

Invalid or malformed input → write a JSON line with an `"error"` field and
continue waiting:

```json
{"error":"invalid action","detail":"unknown type: jump"}
```

### State object

```json
{
  "tiles": [
    "##.@.r..##",
    "##......##"
  ],
  "events": [
    {"type":"attack","attacker":"player","target":"rat","damage":4},
    {"type":"kill","target":"rat"}
  ],
  "messages": [
    "You hit the rat for 4 damage.",
    "The rat is defeated!"
  ],
  "hp": 26,
  "maxHp": 30,
  "attack": 7,
  "defense": 3,
  "equipment": {
    "weapon": "Sword +4atk",
    "helmet": null,
    "shield": null
  },
  "inventory": {"food": 1},
  "level": 2,
  "gameOver": false,
  "won": false
}
```

**tiles** — array of strings, one per viewport row. Uses the ASCII glyph set
regardless of user config:

| Char | Meaning  |
|------|----------|
| `@`  | Player   |
| `#`  | Wall     |
| `.`  | Floor    |
| `>`  | Stairs   |
| `r`  | Rat      |
| `s`  | Skeleton |
| `b`  | Bear     |
| `d`  | Dragon   |
| `%`  | Food     |
| `\|` | Dagger   |
| `/`  | Sword    |
| `^`  | Helmet   |
| `]`  | Shield   |
| ` `  | Hidden   |
| `~`  | Revealed but not visible (fog) |

Viewport size is fixed at 80×24.

**events** — structured version of messages for machine consumption. Event types:

| type | fields | when |
|------|--------|------|
| `move` | `dir` | Player moved successfully |
| `attack` | `attacker` ("player" or monster name), `target`, `damage` | Combat hit |
| `kill` | `target` | Monster defeated |
| `hurt` | `attacker`, `damage` | Monster hits player |
| `death` | `cause` | Player dies |
| `pickup` | `item`, `detail` (e.g. "+4 attack") | Item auto-collected |
| `equip` | `item`, `bonus`, `stat` | Equipment equipped (better than current) |
| `skip_equipment` | `item` | Already have better |
| `use_food` | `healed` | Food consumed |
| `descend` | `level` | Descended to new level |
| `win` | — | Escaped the dungeon |
| `no_stairs` | — | Tried to descend without stairs |
| `no_food` | — | No food in inventory |
| `full_hp` | — | Already at max HP |
| `wait` | — | Waited a turn |

**messages** — the same human-readable strings the TUI shows. Included
alongside events so bots can log them or display them if desired.

**equipment** — formatted as `"Name +Nstat"` or `null`. Matches the HUD display.

## Changes

### `cli.js`

1. Detect `--bot` in `process.argv`. When present, skip raw-mode setup,
   cursor hiding, and ANSI rendering entirely.

2. Force ASCII glyph mode (the tile chars above come from `GLYPHS_ASCII`).

3. Build the state object by calling `getVisibleTiles(game, 80, 24)` and
   converting to string rows using the ASCII glyph chars. For revealed-but-
   not-visible tiles use `~`. For hidden tiles use ` ` (space).

4. Build the events array by diffing `game.messages` against the previous
   turn's messages (the engine appends new messages to the array each turn,
   so new entries = new events). Parse each new message string into a typed
   event object.

### `src/game.js`

No changes to the game engine. The bot protocol is purely a presentation
concern — it reads the same state and dispatches the same actions as the TUI.

## Verify

- `echo '{"type":"wait"}' | node cli.js --bot` outputs two JSON lines
  (initial state + post-wait state) and exits on EOF
- Piping multiple actions produces one state line per action
- Invalid JSON input produces an error line and the game continues
- `gameOver` or `won` states are correctly reported and the process exits
- Tile grid matches what the TUI would show in ASCII mode
- Events array correctly represents each message
- Normal TUI mode (`node cli.js` without `--bot`) is unaffected
- Stats (hp, attack, defense, equipment, inventory, level) are accurate
