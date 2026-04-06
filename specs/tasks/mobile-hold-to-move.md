---
id: mobile-hold-to-move
status: not-started
area: web
priority: 50
depends_on: []
description: Hold touch or key to auto-repeat movement; stops on monsters, walls, items, or game-over
---

# Hold-to-Move (Touch & Keyboard)

## Goal

Let the player hold a finger down (touch) or hold a movement key (keyboard)
to auto-repeat movement in that direction, eliminating the need to repeatedly
tap on mobile. This is standard in mobile roguelikes (Shattered Pixel Dungeon,
Pathos, etc.) and significantly improves the feel of exploration.

## Behavior

### Touch hold

1. On `touchstart`, record the touch position and start a **delay timer**
   (300 ms).
2. On delay timer fire, compute the direction using the existing
   quadrant-from-center logic and dispatch the first move. Then start a
   **repeat timer** using `setInterval` at 180 ms that dispatches a move in
   the same direction each tick.
3. On `touchend` or `touchcancel`, clear both timers. If the delay timer
   hadn't fired yet (i.e. a quick tap), dispatch a single move using the
   existing tap logic — preserve current tap-to-move behavior exactly.

### Keyboard hold

1. On `keydown` for a movement key, dispatch the move immediately (current
   behavior). Then start a repeat timer (180 ms interval) that keeps
   dispatching moves in that direction.
2. Use a 300 ms initial delay before the first repeat fires (mimics OS key
   repeat but with game-appropriate timing).
3. On `keyup` for that key, clear the repeat timer.
4. If a different movement key is pressed while one is held, cancel the
   previous repeat and start a new one for the new direction.
5. Non-movement keys (`?`, `m`, `r`, etc.) are not affected.

### Stop conditions (both touch and keyboard)

The repeat timer must check after each `dispatchAndPlay` call whether to
stop. Cancel the repeat timer if any of these are true:

- **Wall**: the hero didn't actually move (compare player position before and
  after dispatch — if unchanged and the move wasn't an attack, stop).
- **Monster adjacent**: after the move, any monster is adjacent to the hero
  (within 1 tile in any cardinal direction). This gives the player a chance to
  decide whether to fight or flee.
- **Game over or win**: `game.gameOver || game.won` is true.

Item pickup does NOT stop movement — items are auto-collected and the player
can see the message in the HUD.

### Timing constants

Define these at the top of the input section for easy tuning:

```js
const HOLD_INITIAL_DELAY = 300;  // ms before repeat begins
const HOLD_REPEAT_INTERVAL = 180; // ms between repeated moves
```

## Changes

### Modified: `index.html`

**Keyboard input** (~lines 844-929):

- Add state variables: `heldDir`, `holdDelayTimer`, `holdRepeatTimer`.
- On `keydown` for a movement key: if `heldDir` is already this key, ignore
  (browser fires repeated keydown events — skip them). Otherwise, clear any
  existing timers, dispatch the immediate move, set `heldDir`, and start the
  delay → repeat chain.
- On `keyup`: if the released key matches `heldDir`, clear timers and reset
  `heldDir`.
- Add a `stopHoldRepeat()` helper that clears both timers and resets state.
- Add a `shouldStopRepeating(oldGame, newGame, dir)` helper that checks stop
  conditions.

**Touch input** (~lines 992-1026):

- Replace the current `touchstart`/`touchend` pair with hold-aware logic.
- On `touchstart`: record position, start `holdDelayTimer`. On timer fire,
  compute direction from canvas center, dispatch first move, start
  `holdRepeatTimer`.
- On `touchend`/`touchcancel`: if delay timer is still pending (quick tap),
  compute direction and dispatch a single move (preserving current behavior).
  Clear all timers.
- Reuse the same `shouldStopRepeating()` helper.

### No changes to `src/game.js`

All logic lives in the input layer. The game engine's `dispatch()` is called
exactly as before — one action per step.

## Verify

- **Quick tap** on mobile still moves exactly one tile in the tapped direction
- **Hold touch** for 1+ seconds moves the hero repeatedly in the held direction
- **Release touch** stops movement immediately
- **Hold arrow key / WASD** moves the hero repeatedly after the initial delay
- **Release key** stops movement immediately
- **Press different direction** while holding switches direction smoothly
- Hero stops moving when adjacent to a monster
- Hero stops moving when walking into a wall
- Hero does NOT stop on item pickup (items are auto-collected)
- Game over / win stops the repeat
- Non-movement keys (?, m, r, Tab, n) are unaffected by hold logic
- The help overlay still works correctly while hold-to-move is active
- All existing tests pass (`node --test src/game.test.js src/bot.test.js`)
