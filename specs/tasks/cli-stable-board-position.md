---
id: cli-stable-board-position
status: not-started
area: cli
priority: 60
depends_on: []
description: Keep the board at a fixed position in the TUI by always reserving max message lines
---

# CLI: Stable Board Position

## Goal

Prevent the game board from shifting vertically as messages appear. Currently the
board shrinks/moves because `getViewSize()` uses the *actual* message count to
calculate available rows. Fix this by always reserving the maximum message space.

## Changes

All changes in `cli.js`.

### 1. Fixed message line reservation in `getViewSize()`

**Current** (line 102-103):
```javascript
const msgLines = Math.min(game.messages.length, 5);
const rows = (process.stdout.rows || 24) - 4 - msgLines;
```

**New:**
```javascript
const msgLines = 5;
const rows = (process.stdout.rows || 24) - 4 - msgLines;
```

Always reserve 5 lines for messages regardless of how many exist.

### 2. Pad message output to 5 lines

After rendering messages (lines 223-225), pad with empty lines so the output
always occupies exactly 5 lines:

```javascript
const maxMsgLines = 5;
const msgs = game.messages.slice(-maxMsgLines);
for (const msg of msgs) {
  out += `${FG_YELLOW}${msg}${RESET}\n`;
}
for (let i = msgs.length; i < maxMsgLines; i++) {
  out += '\n';
}
```

This ensures the total output height is constant and the terminal doesn't
reflow content between frames.

## Verify

- Board stays at the same vertical position from game start through gameplay
- Messages appear at the bottom without pushing the board
- When fewer than 5 messages exist, blank lines fill the remaining space
- Terminal resize still works correctly
- No visual regressions in either emoji or ASCII render mode
