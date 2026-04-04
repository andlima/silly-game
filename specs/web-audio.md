---
id: web-audio
status: not-started
area: frontend
priority: 60
depends_on: []
description: Procedural sound effects for the web frontend using the Web Audio API
---

# Web Audio

## Goal

Add short procedural sound effects to the browser frontend so player actions
feel more tangible. All sounds are synthesized at runtime with the Web Audio
API — no audio files to download or host.

## Acceptance Criteria

### Audio engine (`src/audio.js`)

1. Export an `initAudio()` function that creates and returns an audio context
   (or returns the existing one). Must be called from a user gesture (keypress)
   to satisfy browser autoplay policy.
2. Export individual sound functions — at minimum:
   - `playMove()` — soft footstep tick
   - `playAttack()` — short percussive hit
   - `playHurt()` — lower thud when the player takes damage
   - `playPickup()` — bright rising tone for item collection
   - `playDescend()` — descending sweep for stairs
   - `playDeath()` — ominous low drone when the player dies
   - `playVictory()` — ascending arpeggio when the player wins
3. All sounds are synthesized with OscillatorNode / GainNode (and optionally
   noise via AudioBuffer). No `<audio>` elements or fetched files.
4. Each sound is ≤ 0.5 s in duration (victory may be up to 1 s).
5. Master volume is controllable via an exported `setVolume(0–1)` function.
   Default volume: `0.5`.

### Integration with web frontend (`index.html`)

6. On the first keypress, call `initAudio()` to unlock the audio context.
7. After each `dispatch()` call, compare old and new game state to decide
   which sounds to play:
   - Player position changed → `playMove()`
   - A monster lost HP (player attacked) → `playAttack()`
   - Player HP decreased → `playHurt()`
   - An item was picked up (items array shrank) → `playPickup()`
   - Level number increased → `playDescend()`
   - `gameOver` became true → `playDeath()`
   - `won` became true → `playVictory()`
8. Add a mute/unmute toggle button (🔊 / 🔇) to the HUD area. Clicking it
   calls `setVolume(0)` or restores the previous volume.

### No-dependency rule

9. No npm packages or external audio libraries. Web Audio API only.
10. No audio asset files — everything is synthesized.

## Out of Scope

- TUI / CLI audio (terminal has no audio API)
- Background music or ambient loops
- Per-monster-type sound variation
- Volume slider UI (just mute toggle for now)
- Spatial / stereo panning based on map position

## Design Notes

Sound synthesis recipes (starting points — tweak to taste):

- **Footstep**: short burst of white noise through a bandpass filter (1–3 kHz),
  gain envelope 0→0.1→0 over ~60 ms.
- **Attack**: sawtooth oscillator at ~200 Hz, quick pitch bend down, gain
  envelope over ~120 ms.
- **Hurt**: sine at ~100 Hz with slow decay over ~200 ms.
- **Pickup**: two sine tones in quick succession (e.g., C5 → E5), ~80 ms each.
- **Descend**: sine sweep from ~400 Hz down to ~100 Hz over ~300 ms.
- **Death**: sine at ~60 Hz with long gain decay (~500 ms) plus noise layer.
- **Victory**: sine arpeggio C5-E5-G5-C6, ~120 ms per note.

State diff logic belongs in the web frontend, not in the game engine. Compare
the pre-dispatch and post-dispatch game objects to figure out what happened.
This keeps `src/audio.js` unaware of game logic and `src/game.js` unaware of
audio.

## Agent Notes

- The browser's autoplay policy blocks `AudioContext` creation until a user
  gesture. The simplest approach: create the context lazily on the first
  keydown that also dispatches a game action.
- `index.html` already has a keydown handler that dispatches actions — hook
  the audio trigger and state-diff logic there.
- Be careful with overlapping sounds: create new oscillator/gain nodes per
  sound rather than reusing a single oscillator.
- Test by playing the game in a browser — move around, attack a monster, pick
  up food, descend stairs, and die. Each action should produce a distinct
  short sound.
