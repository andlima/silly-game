---
id: mobile-audio-unlock
status: not-started
area: web
priority: 90
depends_on: []
description: Fix mobile audio by always attempting AudioContext resume on user gestures, not gated by audioReady flag
---

# Fix Mobile Audio Unlock

## Problem

Sound never plays on mobile despite previous fixes (ctx.resume after creation,
touchend init guard). The `audioReady` flag prevents `initAudio()` from being
retried on subsequent gestures. On iOS Safari, `touchstart` is not a valid
user-activation event, so the AudioContext stays suspended — and `touchend`
skips `initAudio()` because `audioReady` is already `true`.

## Changes

### 1. Always call `initAudio()` from gesture handlers — `index.html`

Decouple `initAudio()` from the `audioReady` flag. Every touch/click gesture
should attempt to resume the context. The `audioReady` flag should only control
whether `playAudioForDiff` fires (its current role at line 816).

In the `touchstart` handler (~line 998), the `touchend` handler (~line 1006),
the mute button click (~line 935), and the action bar button clicks
(~lines 1030, 1035, 1040): call `initAudio()` unconditionally, then set
`audioReady = true`.

Before (pattern repeated in multiple handlers):
```js
if (!audioReady) { initAudio(); audioReady = true; }
```

After:
```js
initAudio(); audioReady = true;
```

Same change in the `keydown` handler (~line 845):
```js
// Before
if (!audioReady) {
  initAudio();
  audioReady = true;
}
// After
initAudio(); audioReady = true;
```

### 2. Add `click` handler on canvas — `index.html`

Add a `click` event listener on the canvas that calls `initAudio()` and sets
`audioReady = true`. Some mobile browsers only unlock audio on `click` (a
synthetic event fired after touchend). This handler should NOT dispatch a game
action — it is purely for audio unlock.

```js
canvas.addEventListener('click', () => {
  initAudio(); audioReady = true;
});
```

Place this near the existing touchstart/touchend handlers (~line 1026).

## Files Changed

| File | What |
|---|---|
| `index.html` | Remove `audioReady` guard around `initAudio()` calls; add canvas click handler |

## Testing

- On iOS Safari: load game, tap to move — sound should play from the first or
  second tap onward.
- On Android Chrome: verify sound still works.
- On desktop: verify keyboard-triggered sound still works.
- Toggle mute on/off — volume state preserved.
- Verify no duplicate sounds (initAudio is cheap when context is already running).
