---
id: fix-mobile-audio
status: not-started
area: web
priority: 80
depends_on: []
description: Fix sound not playing on mobile by resuming AudioContext after creation and ensuring init runs on touchend
---

# Fix Mobile Audio

## Problem

Sound effects do not play on mobile browsers (especially iOS Safari). Two issues
in the audio initialization flow combine to keep the `AudioContext` permanently
suspended:

1. **`initAudio()` never calls `ctx.resume()` after first creation**
   (`src/audio.js:10-19`). On iOS Safari a new `AudioContext` can start in
   `"suspended"` state even when created during a user gesture. The existing
   `resume()` call only runs on *subsequent* invocations when the context already
   exists.

2. **Audio init fires on `touchstart`, not `touchend`**
   (`index.html:967-969`). Some mobile browsers only recognise `touchend` /
   `click` as valid user-activation events for unlocking audio. Because
   `audioReady` is set to `true` during `touchstart`, the `touchend` handler
   never attempts to init/resume the context.

## Changes

### 1. Resume context immediately after creation — `src/audio.js`

In `initAudio()`, add `ctx.resume()` right after the `new AudioContext()` line
(after line 15). This ensures the context is moved to `"running"` state on
browsers that create it suspended.

```js
export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  ctx.resume();                       // ← add this line
  masterGain = ctx.createGain();
  masterGain.gain.value = volume;
  masterGain.connect(ctx.destination);
  return ctx;
}
```

### 2. Also init audio on `touchend` — `index.html`

Add an `initAudio()` / `audioReady` guard at the top of the `touchend` handler
(around line 976), mirroring what `touchstart` already does. This guarantees the
context is resumed from a universally-recognised user activation:

```js
canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (!audioReady) { initAudio(); audioReady = true; }   // ← add
  if (game.gameOver || game.won) return;
  // … rest unchanged
```

### 3. Keep `touchstart` init as-is

Leave the existing `initAudio()` call in the `touchstart` handler. It serves as
an early unlock on browsers that do accept `touchstart` as a user activation,
minimising latency on the first sound.

## Files Changed

| File | What |
|---|---|
| `src/audio.js` | Add `ctx.resume()` after context creation |
| `index.html` | Add audio-init guard to `touchend` handler |

## Testing

- On an iOS device (Safari), load the game and tap to move. Sound should play
  from the very first move.
- On Android Chrome, verify sound still works as before.
- Toggle mute on/off — volume state should be preserved.
- Desktop browsers should be unaffected (keyboard `keydown` path unchanged).
